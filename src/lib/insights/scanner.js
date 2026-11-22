import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fdir } from 'fdir';
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
 * Persistent cache file path (inside ROOT_DIR).
 * Survives server restarts so the UI has data immediately.
 */
const PERSIST_FILE = path.join(ROOT_DIR, '.filemanager-insights-scan.json');

/**
 * Active scan controllers.
 * @type {Map<string, AbortController>}
 */
const activeScans = new Map();

/**
 * Write scan result to the persistent JSON file.
 * Fire-and-forget — errors are logged but never thrown.
 * @param {string} key
 * @param {ScanResult} result
 */
function saveToDisk(key, result) {
  const payload = { key, result, timestamp: Date.now() };
  fs.writeFile(PERSIST_FILE, JSON.stringify(payload), 'utf-8').catch((err) => {
    console.warn('Failed to persist insights cache:', err.message);
  });
}

/**
 * Async disk loader used by getCachedResultAsync.
 * @param {string} key
 * @returns {Promise<{result: ScanResult, timestamp: number}|null>}
 */
async function loadFromDisk(key) {
  try {
    const raw = await fs.readFile(PERSIST_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.key === key && parsed.result) {
      return { result: parsed.result, timestamp: parsed.timestamp };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Track whether a disk load is already in flight to avoid duplicates.
 * @type {Promise<{result: ScanResult, timestamp: number}|null>|null}
 */
let diskLoadPromise = null;

/**
 * Get cached scan result if still fresh.
 * Checks in-memory cache first. On miss, returns null (use getCachedResultAsync for disk fallback).
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
 * Get cached scan result with disk fallback.
 * Checks in-memory cache first, then loads from the persistent JSON file.
 * On disk hit, the result is promoted back into the in-memory cache.
 * @param {string} key - Cache key (typically 'default')
 * @returns {Promise<ScanResult|null>}
 */
export async function getCachedResultAsync(key = 'default') {
  // Fast path: in-memory cache
  const memResult = getCachedResult(key);
  if (memResult) return memResult;

  // Slow path: load from disk
  if (!diskLoadPromise) {
    diskLoadPromise = loadFromDisk(key).finally(() => {
      diskLoadPromise = null;
    });
  }
  const entry = await diskLoadPromise;
  if (!entry) return null;

  // Promote to in-memory cache (skip TTL — a persisted result is valid on restart)
  cache.set(key, entry);
  return entry.result;
}

/**
 * Store a scan result in cache (memory + disk).
 * @param {string} key
 * @param {ScanResult} result
 */
export function setCacheResult(key, result) {
  cache.set(key, { result, timestamp: Date.now() });
  saveToDisk(key, result);
}

/**
 * Invalidate the scan cache (memory + disk).
 * @param {string} [key] - Specific key, or omit to clear all.
 */
export function invalidateCache(key) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
  // Also remove the persisted file
  if (!key || key === 'default') {
    fs.unlink(PERSIST_FILE).catch(() => {});
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

// =============================================================================
// fdir-based filesystem traversal
// =============================================================================

/**
 * Batch size for parallel stat calls.
 */
const STAT_BATCH_SIZE = 200;

/**
 * Crawl the filesystem using fdir for fast traversal, then batch-stat all paths
 * in parallel for metadata collection.
 *
 * @param {Object} accum - Accumulator object
 * @param {AbortSignal} signal
 * @param {function} onProgress - Progress callback
 * @param {Set<string>} excludedDirs - Lowercased directory names to skip
 * @returns {Promise<void>}
 */
async function crawlFilesystem(accum, signal, onProgress, excludedDirs) {
  // Phase 1: Fast traversal using fdir
  // fdir's exclude() prevents descending into matching directories (not just filtering)
  const crawler = new fdir()
    .withDirs()
    .withFullPaths()
    .withErrors()
    .withAbortSignal(signal)
    .exclude((dirName) => excludedDirs.has(dirName.toLowerCase()));

  /** @type {string[]} */
  let allPaths;
  try {
    allPaths = await crawler.crawl(ROOT_DIR).withPromise();
  } catch (err) {
    if (signal?.aborted) throw new Error('Scan cancelled');
    throw err;
  }

  if (signal?.aborted) throw new Error('Scan cancelled');

  // Phase 2: Batch-stat all paths in parallel to collect metadata
  // Normalize ROOT_DIR for relative path computation
  const normalizedRoot = path.normalize(ROOT_DIR);

  // Build sets for directory membership and child tracking (for empty folder detection)
  const dirSet = new Set();
  // Map: parentDir (relative) -> Set of child relative paths
  const childrenOf = new Map();

  // Process in batches
  for (let batchStart = 0; batchStart < allPaths.length; batchStart += STAT_BATCH_SIZE) {
    if (signal?.aborted) throw new Error('Scan cancelled');

    const batch = allPaths.slice(batchStart, batchStart + STAT_BATCH_SIZE);

    // Stat all paths in this batch in parallel
    const results = await Promise.allSettled(
      batch.map(async (absPath) => {
        const stat = await fs.lstat(absPath);
        return { absPath, stat };
      })
    );

    for (let i = 0; i < results.length; i++) {
      if (signal?.aborted) throw new Error('Scan cancelled');

      const result = results[i];
      const absPath = batch[i];
      const relPath = path.relative(normalizedRoot, absPath) || '.';

      if (result.status === 'rejected') {
        // Inaccessible path — record error and skip
        accum.errors.push({ path: relPath, error: result.reason?.message || 'Cannot stat' });
        continue;
      }

      let { stat } = result.value;

      // Skip symlinks that escape root
      if (stat.isSymbolicLink()) {
        try {
          const target = await fs.realpath(absPath);
          if (!target.startsWith(normalizedRoot)) {
            continue; // Skip escaping symlink
          }
          // Re-stat the target to get real stats
          stat = await fs.stat(absPath);
        } catch {
          continue; // Broken symlink
        }
      }

      if (stat.isDirectory()) {
        accum.totalFolders++;
        accum.dirsScanned++;
        dirSet.add(relPath);

        // Initialize children set for this directory
        if (!childrenOf.has(relPath)) {
          childrenOf.set(relPath, new Set());
        }

        // Register as child of parent
        const parentRel = relPath === '.' ? null : (path.dirname(relPath) || '.');
        if (parentRel !== null) {
          if (!childrenOf.has(parentRel)) {
            childrenOf.set(parentRel, new Set());
          }
          childrenOf.get(parentRel).add(relPath);
        }

        onProgress?.({
          filesScanned: accum.totalFiles,
          dirsScanned: accum.dirsScanned,
          currentPath: relPath,
          phase: 'scanning',
        });
      } else if (stat.isFile()) {
        accum.totalFiles++;
        accum.totalSize += stat.size;
        accum.filesScanned++;

        const name = path.basename(absPath);
        const ext = path.extname(name).toLowerCase();
        const category = getInsightCategory(name);

        // Update category distribution
        if (!accum.categories[category]) {
          accum.categories[category] = { category, count: 0, size: 0 };
        }
        accum.categories[category].count++;
        accum.categories[category].size += stat.size;

        const fileInfo = {
          name,
          path: relPath,
          size: stat.size,
          category,
          extension: ext,
          modifiedAt: stat.mtime.toISOString(),
          createdAt: stat.birthtime.toISOString(),
        };

        // Track largest files (keep top 50)
        insertTopN(accum.largestFiles, fileInfo, (a, b) => b.size - a.size, 50);

        // Track recently modified (top 50)
        insertTopN(accum.recentFiles, fileInfo, (a, b) =>
          new Date(b.modifiedAt) - new Date(a.modifiedAt), 50);

        // Track recently added by birth time
        const addedInfo = { ...fileInfo, addedAt: stat.birthtime.toISOString() };
        insertTopN(accum.recentlyAdded, addedInfo, (a, b) =>
          new Date(b.addedAt) - new Date(a.addedAt), 50);

        // Track large archives (> 10MB)
        if (isArchive(name) && stat.size > 10 * 1024 * 1024) {
          accum.largeArchives.push(fileInfo);
        }

        // Track old files (not modified in 6 months)
        const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
        if (stat.mtime.getTime() < sixMonthsAgo) {
          accum.oldFiles.push(fileInfo);
        }

        // Size-based duplicate pre-filter: group by size
        if (stat.size >= 1024) {
          if (!accum.sizeGroups[stat.size]) {
            accum.sizeGroups[stat.size] = [];
          }
          accum.sizeGroups[stat.size].push({
            path: relPath,
            absPath,
            name,
          });
        }

        // Track directory sizes: add this file's size to all ancestor directories
        let parent = path.dirname(relPath) || '.';
        while (true) {
          if (!accum.folderSizes.has(parent)) {
            accum.folderSizes.set(parent, { size: 0, fileCount: 0, path: parent });
          }
          const folderData = accum.folderSizes.get(parent);
          folderData.size += stat.size;
          folderData.fileCount++;

          if (parent === '.') break;
          const nextParent = path.dirname(parent);
          if (nextParent === parent) break;
          parent = nextParent;
        }

        // Register file as child of its parent directory
        const parentDir = path.dirname(relPath) || '.';
        if (!childrenOf.has(parentDir)) {
          childrenOf.set(parentDir, new Set());
        }
        childrenOf.get(parentDir).add(relPath);

        onProgress?.({
          filesScanned: accum.totalFiles,
          dirsScanned: accum.dirsScanned,
          currentPath: relPath,
          phase: 'scanning',
        });
      }
    }
  }

  // Phase 3: Detect empty folders (directories with no children after exclusions)
  for (const [dirRel, children] of childrenOf.entries()) {
    if (dirRel === '.') continue; // Don't report root as empty
    if (children.size === 0) {
      accum.emptyFolders.push({
        name: path.basename(dirRel),
        path: dirRel,
      });
    }
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
    const cached = await getCachedResultAsync('default');
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

  // Walk the filesystem using fdir
  await crawlFilesystem(accum, signal, onProgress, excludedDirs);

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
