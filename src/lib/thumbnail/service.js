import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { ROOT_DIR } from '../filesystem/security.js';

/**
 * Thumbnail generation service
 *
 * Uses Sharp for server-side image processing with disk-based caching.
 * Thumbnails are stored as WebP in {ROOT_DIR}/.thumbnails/ and keyed
 * by a hash of the relative path, mtime, and requested size.
 *
 * Supports JPEG, PNG, WebP, GIF (first frame), SVG, BMP, ICO, and AVIF.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Thumbnail size presets in pixels (width & height bounds) */
export const THUMBNAIL_SIZES = {
  small: 40,
  medium: 200,
  large: 400,
};

/** Image extensions the service will process */
const THUMBNAILABLE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.bmp', '.ico', '.avif',
]);

/** Maximum input dimension accepted (prevents memory bombs) */
const MAX_INPUT_DIMENSION = 30000;

/** Maximum file size accepted for thumbnail generation (50 MB) */
const MAX_INPUT_BYTES = 50 * 1024 * 1024;

/** WebP output quality */
const WEBP_QUALITY = 82;

/** Sub-directory inside ROOT_DIR for cached thumbnails */
const CACHE_DIR_NAME = '.thumbnails';

// ---------------------------------------------------------------------------
// Concurrency limiter
// ---------------------------------------------------------------------------

const MAX_CONCURRENT = 4;
let activeCount = 0;
/** @type {Array<() => void>} */
const queue = [];

/**
 * Acquire a processing slot. Waits if the limit is reached.
 * @returns {Promise<() => void>} Release function
 */
function acquireSlot() {
  return new Promise((resolve) => {
    if (activeCount < MAX_CONCURRENT) {
      activeCount++;
      resolve(() => releaseSlot());
    } else {
      queue.push(() => {
        resolve(() => releaseSlot());
      });
    }
  });
}

function releaseSlot() {
  activeCount--;
  if (queue.length > 0) {
    activeCount++;
    const next = queue.shift();
    next();
  }
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the cache directory path, creating it if needed.
 * @returns {Promise<string>} Absolute path to cache directory
 */
async function ensureCacheDir() {
  const cacheDir = path.join(ROOT_DIR, CACHE_DIR_NAME);
  try {
    await fs.mkdir(cacheDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
  return cacheDir;
}

/**
 * Build a cache filename from source path, mtime, and size.
 * @param {string} relativePath - Relative path from root
 * @param {number} mtimeMs - Modification time in ms
 * @param {string} size - Size preset name
 * @returns {string} Cache filename (e.g. "a1b2c3d4e5f6.webp")
 */
function cacheKey(relativePath, mtimeMs, size) {
  const hash = crypto
    .createHash('sha256')
    .update(`${relativePath}|${mtimeMs}|${size}`)
    .digest('hex')
    .slice(0, 20);
  return `${hash}.webp`;
}

/**
 * Check whether a cached thumbnail exists and return its path.
 * @param {string} cacheDir
 * @param {string} key
 * @returns {Promise<string|null>} Absolute path to cached file, or null
 */
async function getCachedPath(cacheDir, key) {
  const filePath = path.join(cacheDir, key);
  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if a file extension is eligible for thumbnail generation.
 * @param {string} extension - File extension (with or without dot)
 * @returns {boolean}
 */
export function isThumbnailable(extension) {
  if (!extension) return false;
  const ext = extension.toLowerCase().startsWith('.')
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`;
  return THUMBNAILABLE_EXTENSIONS.has(ext);
}

/**
 * Generate (or retrieve from cache) a thumbnail for the given image file.
 *
 * @param {string} relativePath - Path relative to ROOT_DIR
 * @param {string} size - Size preset: 'small' | 'medium' | 'large'
 * @returns {Promise<{buffer: Buffer, contentType: string, cached: boolean}>}
 */
export async function generateThumbnail(relativePath, size = 'medium') {
  const pixelSize = THUMBNAIL_SIZES[size] || THUMBNAIL_SIZES.medium;
  const normalizedPath = path.normalize(relativePath);
  const absolutePath = path.resolve(ROOT_DIR, normalizedPath);

  // Security: ensure within root
  const normalizedRoot = path.normalize(ROOT_DIR);
  const rootPrefix = normalizedRoot.endsWith(path.sep) 
    ? normalizedRoot 
    : normalizedRoot + path.sep;
  
  if (
    !absolutePath.startsWith(rootPrefix) &&
    absolutePath !== normalizedRoot
  ) {
    throw Object.assign(new Error('Path traversal detected'), { status: 403 });
  }

  // Prevent access to the cache directory itself
  if (normalizedPath.startsWith(CACHE_DIR_NAME)) {
    throw Object.assign(new Error('Invalid path'), { status: 403 });
  }

  // Validate extension
  const ext = path.extname(normalizedPath).toLowerCase();
  if (!isThumbnailable(ext)) {
    throw Object.assign(new Error('File type not supported for thumbnails'), { status: 415 });
  }

  // Get file stats for mtime (used as cache key)
  const stats = await fs.stat(absolutePath);
  if (stats.isDirectory()) {
    throw Object.assign(new Error('Cannot thumbnail a directory'), { status: 400 });
  }
  if (stats.size > MAX_INPUT_BYTES) {
    throw Object.assign(new Error('File too large for thumbnail generation'), { status: 413 });
  }

  const mtimeMs = stats.mtimeMs;
  const cacheDir = await ensureCacheDir();
  const key = cacheKey(normalizedPath, mtimeMs, size);
  const cachedPath = await getCachedPath(cacheDir, key);

  // Cache hit — serve from disk
  if (cachedPath) {
    const buffer = await fs.readFile(cachedPath);
    return { buffer, contentType: 'image/webp', cached: true };
  }

  // Cache miss — generate thumbnail
  const release = await acquireSlot();
  try {
    // Double-check cache (another request may have generated it while we waited)
    const doubleCheck = await getCachedPath(cacheDir, key);
    if (doubleCheck) {
      const buffer = await fs.readFile(doubleCheck);
      return { buffer, contentType: 'image/webp', cached: true };
    }

    // Build Sharp pipeline
    let pipeline = sharp(absolutePath, {
      failOnError: false,
      density: ext === '.svg' ? 150 : undefined, // SVG rasterization density
      animated: false, // GIF: first frame only
      limitInputPixels: MAX_INPUT_DIMENSION * MAX_INPUT_DIMENSION,
    });

    // Auto-orient based on EXIF
    pipeline = pipeline.rotate();

    // Resize to fit within bounds, preserving aspect ratio
    pipeline = pipeline.resize(pixelSize, pixelSize, {
      fit: 'inside',
      withoutEnlargement: true,
    });

    // Output as WebP
    const buffer = await pipeline
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    // Write to cache
    const outPath = path.join(cacheDir, key);
    await fs.writeFile(outPath, buffer);

    return { buffer, contentType: 'image/webp', cached: false };
  } finally {
    release();
  }
}

/**
 * Invalidate cached thumbnails for a file (call after rename/delete/overwrite).
 * @param {string} relativePath - Path relative to ROOT_DIR
 */
export async function invalidateThumbnails(relativePath) {
  try {
    const cacheDir = path.join(ROOT_DIR, CACHE_DIR_NAME);
    const normalizedPath = path.normalize(relativePath);
    // We can't easily match by hash prefix without re-hashing,
    // so we scan and check each file by trying all known sizes/mtimes.
    // For simplicity, we just leave orphaned thumbnails — they use
    // minimal space and will be replaced when the file changes.
    // A future cleanup task could prune orphans.
  } catch {
    // Non-critical — silent failure
  }
}

/**
 * Get approximate cache size in bytes.
 * @returns {Promise<number>}
 */
export async function getCacheSize() {
  try {
    const cacheDir = path.join(ROOT_DIR, CACHE_DIR_NAME);
    const entries = await fs.readdir(cacheDir);
    let total = 0;
    for (const entry of entries) {
      try {
        const stats = await fs.stat(path.join(cacheDir, entry));
        total += stats.size;
      } catch {
        // Skip inaccessible
      }
    }
    return total;
  } catch {
    return 0;
  }
}
