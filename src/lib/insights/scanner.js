import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { ROOT_DIR } from '../filesystem/security.js';
import { getFileCategory } from '../filesystem/utils.js';
import { getEffectiveExclusions } from './exclusions.js';

/**
 * @typedef {Object} ScanProgress
 * @property {number} filesScanned - Files processed so far
 * @property {number} dirsScanned - Directories processed so far
 * @property {string} currentPath - Currently scanning path
 * @property {'scanning'|'hashing'|'complete'|'cancelled'|'error'} phase - Current scan phase
 */

/**
 * @typedef {Object} ScanResult
 * @property {number} totalFiles
 * @property {number} totalFolders
 * @property {number} totalSize
 * @property {Object|null} largestFile
 * @property {Object|null} diskInfo - { total, used, free } or null if unavailable
 * @property {Object[]} categoryDistribution - { category, count, size, percentage }
 * @property {Object[]} largestFiles - Top 20 largest files
 * @property {Object[]} largestFolders - Top 20 largest directories (immediate children sizes)
 * @property {Object[]} recentFiles - Top 50 most recently modified
 * @property {Object[]} recentlyAdded - Top 50 by birth time
 * @property {Object[]} emptyFolders
 * @property {Object[]} duplicateGroups - { hash, size, files: [{path, name}] }
 * @property {Object[]} largeArchives
 * @property {Object[]} oldFiles - Not modified in 6+ months
 * @property {Object} scanMeta - { startedAt, completedAt, duration, rootPath, cached, scanId }
 */

/**
 * In-memory scan cache.
 * @type {Map<string, {result: ScanResult, timestamp: number}>}
 */
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Active scan controllers.
 * @type {Map<string, AbortController>}
 */
const activeScans = new Map();

/**
 * Get cached scan result if still fresh.
 * @param {string} key - Cache key (typically 'default')
 * @returns {ScanResult|null}
 */
export function getCachedResult(key = 'default') {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

/**
 * Store a scan result in cache.
 * @param {string} key
 * @param {ScanResult} result
 */
export function setCacheResult(key, result) {
  cache.set(key, { result, timestamp: Date.now() });
}

/**
 * Invalidate the scan cache.
 * @param {string} [key] - Specific key, or omit to clear all.
 */
export function invalidateCache(key) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

/**
 * Cancel an active scan.
 * @param {string} scanId
 * @returns {boolean}
 */
export function cancelScan(scanId) {
  const controller = activeScans.get(scanId);
  if (controller) {
    controller.abort();
    activeScans.delete(scanId);
    return true;
  }
  return false;
}

// File type categories for insights (extends getFileCategory)
const FILE_CATEGORIES = [
  'documents',
  'images',
  'videos',
  'audio',
  'archives',
  'code',
  'spreadsheets',
  'executables',
  'other',
];

const DOCUMENT_EXTS = new Set(['.pdf', '.doc', '.docx', '.txt', '.rtf', '.md', '.odt', '.tex', '.epub']);
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp', '.avif', '.tiff', '.tif', '.psd', '.raw', '.heic', '.heif']);
const VIDEO_EXTS = new Set(['.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm', '.flv', '.m4v', '.mpg', '.mpeg', '.3gp', '.ogv']);
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma', '.opus', '.aiff']);
const ARCHIVE_EXTS = new Set(['.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz', '.tgz', '.tar.gz', '.zst']);
const CODE_EXTS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp',
  '.css', '.scss', '.less', '.html', '.htm', '.xml', '.json', '.yaml', '.yml', '.toml',
  '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
  '.sql', '.php', '.swift', '.kt', '.cs', '.scala', '.r', '.lua', '.dart', '.vue', '.svelte',
  '.dockerfile', '.makefile', '.cmake', '.gradle',
]);
const SPREADSHEET_EXTS = new Set(['.xls', '.xlsx', '.csv', '.ods', '.numbers', '.tsv']);
const EXECUTABLE_EXTS = new Set(['.exe', '.msi', '.app', '.dmg', '.deb', '.rpm', '.apk', '.ipa', '.bin']);

/**
 * Map file extension to insight category.
 * @param {string} filename
 * @returns {string}
 */
function getInsightCategory(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (DOCUMENT_EXTS.has(ext)) return 'documents';
  if (IMAGE_EXTS.has(ext)) return 'images';
  if (VIDEO_EXTS.has(ext)) return 'videos';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  if (ARCHIVE_EXTS.has(ext)) return 'archives';
  if (CODE_EXTS.has(ext)) return 'code';
  if (SPREADSHEET_EXTS.has(ext)) return 'spreadsheets';
  if (EXECUTABLE_EXTS.has(ext)) return 'executables';
  return 'other';
}

/**
 * Check if a file is an archive (for large archives section).
 * @param {string} filename
 * @returns {boolean}
 */
function isArchive(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ARCHIVE_EXTS.has(ext);
}

/**
 * Compute SHA-256 hash of a file (for duplicate detection).
 * Only reads up to `maxBytes` for efficiency.
 * @param {string} filePath
 * @param {number} [maxBytes=4*1024*1024] - Max bytes to hash (default 4MB)
 * @param {AbortSignal} [signal]
 * @returns {Promise<string>}
 */
async function hashFile(filePath, maxBytes = 4 * 1024 * 1024, signal) {
  const hash = crypto.createHash('sha256');
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(Math.min(maxBytes, 64 * 1024));
    let totalRead = 0;
    while (totalRead < maxBytes) {
      if (signal?.aborted) throw new Error('Scan cancelled');
      const toRead = Math.min(buffer.length, maxBytes - totalRead);
      const { bytesRead } = await handle.read(buffer, 0, toRead, totalRead);
      if (bytesRead === 0) break;
      hash.update(buffer.subarray(0, bytesRead));
      totalRead += bytesRead;
    }
    return hash.digest('hex');
  } finally {
    await handle.close();
  }
}

/**
 * Recursively walk directory and collect metrics.
 *
 * @param {string} dirAbs - Absolute directory path
 * @param {string} dirRel - Relative path from root (for display)
 * @param {Object} accum - Accumulator object
 * @param {AbortSignal} signal
 * @param {function} onProgress - Progress callback
 * @param {Set<string>} excludedDirs - Lowercased directory names to skip
 * @returns {Promise<void>}
 */
async function walkDirectory(dirAbs, dirRel, accum, signal, onProgress, excludedDirs) {
  if (signal?.aborted) throw new Error('Scan cancelled');

  let entries;
  try {
    entries = await fs.readdir(dirAbs, { withFileTypes: true });
  } catch (err) {
    // Permission denied, inaccessible directory - record and skip
    accum.errors.push({ path: dirRel || '.', error: err.message });
    return;
  }

  for (const entry of entries) {
    if (signal?.aborted) throw new Error('Scan cancelled');

    // Skip excluded directories (case-insensitive, directories only)
    if (entry.isDirectory() && excludedDirs.has(entry.name.toLowerCase())) continue;

    const entryAbs = path.join(dirAbs, entry.name);
    const entryRel = dirRel ? path.join(dirRel, entry.name) : entry.name;

    let stats;
    try {
      stats = await fs.lstat(entryAbs);
    } catch {
      accum.errors.push({ path: entryRel, error: 'Cannot stat' });
      continue;
    }

    // Skip symlinks that escape root
    if (stats.isSymbolicLink()) {
      try {
        const target = await fs.realpath(entryAbs);
        const normalizedRoot = path.normalize(ROOT_DIR);
        if (!target.startsWith(normalizedRoot)) {
          continue; // Skip escaping symlink
        }
        // Re-stat the target to get real stats
        stats = await fs.stat(entryAbs);
      } catch {
        continue; // Broken symlink
      }
    }

    if (stats.isDirectory()) {
      accum.totalFolders++;
      accum.dirsScanned++;
      onProgress?.({
        filesScanned: accum.totalFiles,
        dirsScanned: accum.dirsScanned,
        currentPath: entryRel,
        phase: 'scanning',
      });

      // Recurse into subdirectory
      await walkDirectory(entryAbs, entryRel, accum, signal, onProgress, excludedDirs);

      // Calculate directory size from direct children (already accumulated)
      // We store this as the "immediate" size for folder size ranking
    } else if (stats.isFile()) {
      accum.totalFiles++;
      accum.totalSize += stats.size;
      accum.filesScanned++;

      const ext = path.extname(entry.name).toLowerCase();
      const category = getInsightCategory(entry.name);

      // Update category distribution
      if (!accum.categories[category]) {
        accum.categories[category] = { category, count: 0, size: 0 };
      }
      accum.categories[category].count++;
      accum.categories[category].size += stats.size;

      // Track largest files (keep top 50)
      const fileInfo = {
        name: entry.name,
        path: entryRel,
        size: stats.size,
        category,
        extension: ext,
        modifiedAt: stats.mtime.toISOString(),
        createdAt: stats.birthtime.toISOString(),
      };

      insertTopN(accum.largestFiles, fileInfo, (a, b) => b.size - a.size, 50);

      // Track recently modified (top 50)
      insertTopN(accum.recentFiles, fileInfo, (a, b) =>
        new Date(b.modifiedAt) - new Date(a.modifiedAt), 50);

      // Track recently added by birth time
      const addedInfo = { ...fileInfo, addedAt: stats.birthtime.toISOString() };
      insertTopN(accum.recentlyAdded, addedInfo, (a, b) =>
        new Date(b.addedAt) - new Date(a.addedAt), 50);

      // Track large archives (> 10MB)
      if (isArchive(entry.name) && stats.size > 10 * 1024 * 1024) {
        accum.largeArchives.push(fileInfo);
      }

      // Track old files (not modified in 6 months)
      const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
      if (stats.mtime.getTime() < sixMonthsAgo) {
        accum.oldFiles.push(fileInfo);
      }

      // Size-based duplicate pre-filter: group by size
      if (stats.size > 0) {
        // Only consider files > 1KB for duplicate detection
        if (stats.size >= 1024) {
          if (!accum.sizeGroups[stats.size]) {
            accum.sizeGroups[stats.size] = [];
          }
          accum.sizeGroups[stats.size].push({
            path: entryRel,
            absPath: entryAbs,
            name: entry.name,
          });
          // Only keep groups with 2+ files (potential duplicates)
        }
      }

      // Track directory sizes: add this file's size to parent directory accumulators
      // We do this by tracking per-directory sizes as we walk
      let parent = dirRel || '.';
      while (true) {
        if (!accum.folderSizes.has(parent)) {
          accum.folderSizes.set(parent, { size: 0, fileCount: 0, path: parent });
        }
        const folderData = accum.folderSizes.get(parent);
        folderData.size += stats.size;
        folderData.fileCount++;

        if (parent === '.' || parent === '') break;
        const nextParent = path.dirname(parent);
        if (nextParent === parent) break;
        parent = nextParent;
      }

      onProgress?.({
        filesScanned: accum.totalFiles,
        dirsScanned: accum.dirsScanned,
        currentPath: entryRel,
        phase: 'scanning',
      });
    }
  }

  // Check for empty folders
  if (entries.filter(e => !(e.isDirectory() && excludedDirs.has(e.name.toLowerCase()))).length === 0) {
    accum.emptyFolders.push({
      name: path.basename(dirRel) || '.',
      path: dirRel || '.',
    });
  }
}

/**
 * Insert item into a sorted array keeping only top N.
 * @param {Array} arr
 * @param {*} item
 * @param {function} comparator
 * @param {number} maxLen
 */
function insertTopN(arr, item, comparator, maxLen) {
  // Find insertion point
  let idx = arr.length;
  for (let i = 0; i < arr.length; i++) {
    if (comparator(item, arr[i]) < 0) {
      idx = i;
      break;
    }
  }
  arr.splice(idx, 0, item);
  if (arr.length > maxLen) {
    arr.length = maxLen;
  }
}

/**
 * Perform a full filesystem scan.
 *
 * @param {Object} [options]
 * @param {function} [options.onProgress] - Progress callback
 * @param {AbortSignal} [options.signal] - Cancellation signal
 * @param {boolean} [options.forceFresh] - Bypass cache
 * @param {boolean} [options.skipDuplicates] - Skip expensive duplicate detection
 * @returns {Promise<ScanResult>}
 */
export async function scanFilesystem(options = {}) {
  const { onProgress, signal: externalSignal, forceFresh = false, skipDuplicates = false } = options;

  // Check cache first
  if (!forceFresh) {
    const cached = getCachedResult('default');
    if (cached) {
      return { ...cached, scanMeta: { ...cached.scanMeta, cached: true } };
    }
  }

  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const scanId = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Create an internal AbortController for cancellation support
  const controller = new AbortController();
  const signal = externalSignal || controller.signal;
  activeScans.set(scanId, controller);

  const accum = {
    totalFiles: 0,
    totalFolders: 0,
    totalSize: 0,
    filesScanned: 0,
    dirsScanned: 0,
    categories: {},
    largestFiles: [],
    recentFiles: [],
    recentlyAdded: [],
    largeArchives: [],
    oldFiles: [],
    emptyFolders: [],
    sizeGroups: {},
    folderSizes: new Map(),
    errors: [],
  };

  // Get configurable exclusions (case-insensitive set of lowercased names)
  const excludedDirs = await getEffectiveExclusions();

  // Walk the filesystem
  await walkDirectory(ROOT_DIR, '', accum, signal, onProgress, excludedDirs);

  // Find largest file
  const largestFile = accum.largestFiles.length > 0 ? accum.largestFiles[0] : null;

  // Compute category distribution percentages
  const totalSize = accum.totalSize || 1;
  const categoryDistribution = Object.values(accum.categories)
    .map(cat => ({
      ...cat,
      percentage: Math.round((cat.size / totalSize) * 1000) / 10,
    }))
    .sort((a, b) => b.size - a.size);

  // Compute largest folders (top 10, excluding root)
  const largestFolders = Array.from(accum.folderSizes.values())
    .filter(f => f.path !== '.')
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)
    .map(f => ({
      name: path.basename(f.path) || f.path,
      path: f.path,
      size: f.size,
      fileCount: f.fileCount,
    }));

  // Sort old files by age (oldest first) and limit to top 50
  const oldFiles = accum.oldFiles
    .sort((a, b) => new Date(a.modifiedAt) - new Date(b.modifiedAt))
    .slice(0, 50);

  // Sort large archives by size (largest first)
  const largeArchives = accum.largeArchives
    .sort((a, b) => b.size - a.size)
    .slice(0, 20);

  // Duplicate detection: hash files that share the same size
  let duplicateGroups = [];
  if (!skipDuplicates) {
    const potentialGroups = Object.entries(accum.sizeGroups).filter(([, g]) => g.length >= 2);

    if (potentialGroups.length > 0 && onProgress) {
      onProgress({
        filesScanned: accum.totalFiles,
        dirsScanned: accum.dirsScanned,
        currentPath: 'Checking for duplicates...',
        phase: 'hashing',
      });
    }

    // Limit duplicate checking to first 500 size groups for performance
    const groupsToCheck = potentialGroups.slice(0, 500);
    // Map of `${size}:${hash}` -> { size, files: [{path, name}] }
    const hashGroups = new Map();

    for (const [sizeStr, group] of groupsToCheck) {
      if (signal?.aborted) break;

      for (const file of group) {
        if (signal?.aborted) break;
        try {
          const hash = await hashFile(file.absPath, 1024 * 1024, signal);
          const key = `${sizeStr}:${hash}`;
          if (!hashGroups.has(key)) {
            hashGroups.set(key, { size: parseInt(sizeStr, 10) || 0, files: [] });
          }
          hashGroups.get(key).files.push({
            path: file.path,
            name: file.name,
          });
        } catch {
          // File became inaccessible during hashing, skip
        }
      }
    }

    // Only keep groups with 2+ actual duplicates
    duplicateGroups = Array.from(hashGroups.values())
      .filter(group => group.files.length >= 2)
      .map(group => ({
        size: group.size,
        files: group.files,
        wastedBytes: group.size * (group.files.length - 1),
      }))
      .sort((a, b) => b.wastedBytes - a.wastedBytes)
      .slice(0, 50);
  }

  const completedAt = new Date().toISOString();
  const duration = Date.now() - startTime;

  /** @type {ScanResult} */
  const result = {
    totalFiles: accum.totalFiles,
    totalFolders: accum.totalFolders,
    totalSize: accum.totalSize,
    largestFile,
    diskInfo: null, // Will attempt to get disk space info
    categoryDistribution,
    largestFiles: accum.largestFiles.slice(0, 10),
    largestFolders,
    recentFiles: accum.recentFiles.slice(0, 30),
    recentlyAdded: accum.recentlyAdded.slice(0, 30),
    emptyFolders: accum.emptyFolders.slice(0, 50),
    duplicateGroups,
    largeArchives,
    oldFiles,
    scanMeta: {
      startedAt,
      completedAt,
      duration,
      rootPath: ROOT_DIR,
      cached: false,
      scanId,
      totalFilesScanned: accum.totalFiles,
      totalDirsScanned: accum.dirsScanned,
      errors: accum.errors.length,
      incomplete: signal?.aborted ? true : false,
    },
  };

  // Try to get disk space info
  try {
    // Use Node.js fs.statfs if available (Node 19+)
    // Fall back to null if not available
    if (typeof fs.statfs === 'function') {
      const statfs = await fs.statfs(ROOT_DIR);
      result.diskInfo = {
        total: statfs.bsize * statfs.blocks,
        free: statfs.bsize * statfs.bfree,
        used: statfs.bsize * (statfs.blocks - statfs.bfree),
      };
    }
  } catch {
    // Disk info unavailable - that's fine
  }

  // Cache the result
  setCacheResult('default', result);

  // Clean up the abort controller
  activeScans.delete(scanId);

  return result;
}
