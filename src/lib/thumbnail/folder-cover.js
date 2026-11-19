import fs from 'fs/promises';
import path from 'path';
import { isThumbnailable } from './service.js';

/**
 * Folder cover detection service
 *
 * Finds a representative image inside a directory to use as its "cover".
 * Only scans immediate children (never recurses) and limits the scan to
 * the first N entries to keep it fast.
 *
 * Results are cached in memory with a TTL so repeated listings of the
 * same directory don't re-scan.
 */

/** Maximum entries to inspect per folder */
const MAX_SCAN_ENTRIES = 30;

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * @typedef {Object} FolderCover
 * @property {string} name - Cover image filename
 * @property {string} path - Relative path from root (including folder prefix)
 * @property {string} extension - File extension
 */

/**
 * In-memory cache: absolute directory path → { cover, timestamp }
 * @type {Map<string, {cover: FolderCover|null, timestamp: number}>}
 */
const cache = new Map();

/**
 * Find a representative image in a directory.
 *
 * Scans immediate children (up to MAX_SCAN_ENTRIES) and returns the
 * first file with a supported image extension. Directories are skipped.
 *
 * Results are cached in memory for CACHE_TTL ms.
 *
 * @param {string} absolutePath - Absolute filesystem path to the directory
 * @param {string} relativePath - Relative path from ROOT_DIR (for building cover.path)
 * @param {boolean} [forceRefresh=false] - Bypass the in-memory cache
 * @returns {Promise<FolderCover|null>}
 */
export async function getFolderCover(absolutePath, relativePath, forceRefresh = false) {
  const cacheKey = absolutePath;

  // Check cache
  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.cover;
    }
  }

  let cover = null;

  try {
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });

    // Sort so images are found sooner (alphabetical gives deterministic results)
    const sorted = entries
      .filter((e) => e.isFile())
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, MAX_SCAN_ENTRIES);

    for (const entry of sorted) {
      const ext = path.extname(entry.name).toLowerCase();
      if (isThumbnailable(ext)) {
        const coverRelativePath = relativePath
          ? path.join(relativePath, entry.name)
          : entry.name;
        cover = {
          name: entry.name,
          path: coverRelativePath,
          extension: ext,
        };
        break;
      }
    }
  } catch {
    // Directory unreadable — return null cover
  }

  // Store in cache
  cache.set(cacheKey, { cover, timestamp: Date.now() });

  // Evict old entries to prevent unbounded growth
  if (cache.size > 500) {
    const now = Date.now();
    for (const [key, value] of cache) {
      if (now - value.timestamp > CACHE_TTL) {
        cache.delete(key);
      }
    }
  }

  return cover;
}

/**
 * Invalidate the cached cover for a directory.
 * Call when a file is added, removed, or renamed inside the directory.
 * @param {string} absolutePath - Absolute path to the directory
 */
export function invalidateFolderCover(absolutePath) {
  cache.delete(absolutePath);
}

/**
 * Clear the entire folder cover cache.
 */
export function clearFolderCoverCache() {
  cache.clear();
}
