import fs from 'fs/promises';
import path from 'path';
import { validatePath, ROOT_DIR, ensureWithinRoot } from './security.js';
import { getFileCategory, formatFileSize, sanitizeFilename } from './utils.js';

/**
 * List directory contents with metadata.
 * @param {string} dirPath - Relative path from root
 * @returns {Promise<Object[]>}
 */
export async function listDirectory(dirPath = '') {
  const { absolutePath } = await validatePath(dirPath);
  const entries = await fs.readdir(absolutePath, { withFileTypes: true });

  const items = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(absolutePath, entry.name);
      try {
        const stats = await fs.stat(fullPath);
        const item = {
          name: entry.name,
          path: path.join(dirPath, entry.name),
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          category: entry.isFile() ? getFileCategory(entry.name) : null,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString(),
          extension: entry.isFile() ? path.extname(entry.name) : null,
        };

        return item;
      } catch {
        return null; // Skip inaccessible entries
      }
    })
  );

  // Sort: directories first, then files alphabetically
  return items
    .filter(Boolean)
    .filter((item) => {
      // Hide system directories from the file explorer
      const hiddenDirs = ['.trash', '.thumbnails'];
      return !hiddenDirs.includes(item.name);
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Read file content as text.
 * @param {string} filePath
 * @returns {Promise<string>}
 */
export async function readFile(filePath) {
  const { absolutePath } = await validatePath(filePath);
  const stats = await fs.stat(absolutePath);
  if (stats.isDirectory()) {
    throw Object.assign(new Error('Cannot read a directory as text'), { status: 400 });
  }
  // Limit to 5MB for text reading
  if (stats.size > 5 * 1024 * 1024) {
    throw Object.assign(new Error('File too large to read as text'), { status: 413 });
  }
  return fs.readFile(absolutePath, 'utf-8');
}

/**
 * Write content to a file (create or overwrite).
 * @param {string} filePath
 * @param {string} content
 * @returns {Promise<Object>}
 */
export async function writeFile(filePath, content) {
  const { absolutePath: parentPath } = await validatePath(path.dirname(filePath));
  const fullPath = path.join(parentPath, path.basename(filePath));
  // Validate the final path is within root (no existence check needed)
  ensureWithinRoot(fullPath);
  await fs.writeFile(fullPath, content, 'utf-8');
  const stats = await fs.stat(fullPath);
  return {
    name: path.basename(filePath),
    path: filePath,
    type: 'file',
    size: stats.size,
    sizeFormatted: formatFileSize(stats.size),
    modifiedAt: stats.mtime.toISOString(),
  };
}

/**
 * Create a new directory.
 * @param {string} dirPath
 * @returns {Promise<Object>}
 */
export async function createDirectory(dirPath) {
  const { absolutePath: parentPath } = await validatePath(path.dirname(dirPath));
  const fullPath = path.join(parentPath, path.basename(dirPath));
  ensureWithinRoot(fullPath);
  await fs.mkdir(fullPath, { recursive: false });
  return {
    name: path.basename(dirPath),
    path: dirPath,
    type: 'directory',
    size: 0,
    sizeFormatted: '0 B',
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
  };
}

/**
 * Delete a file or directory (recursive).
 * @param {string} targetPath
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteItem(targetPath) {
  const { absolutePath } = await validatePath(targetPath);
  const stats = await fs.lstat(absolutePath);
  if (stats.isDirectory()) {
    await fs.rm(absolutePath, { recursive: true, force: true });
  } else {
    await fs.unlink(absolutePath);
  }
  return { success: true };
}

/**
 * Rename/move a file or directory.
 * @param {string} oldPath
 * @param {string} newPath
 * @returns {Promise<Object>}
 */
export async function renameItem(oldPath, newPath) {
  const { absolutePath: srcAbs } = await validatePath(oldPath);
  const { absolutePath: destParent } = await validatePath(path.dirname(newPath));
  const destFull = path.join(destParent, path.basename(newPath));

  // Validate destination is within root
  const normalizedRoot = path.normalize(ROOT_DIR);
  if (!destFull.startsWith(normalizedRoot + path.sep) && destFull !== normalizedRoot) {
    throw Object.assign(new Error('Destination path escapes root'), { status: 403 });
  }

  await fs.rename(srcAbs, destFull);
  const stats = await fs.stat(destFull);
  return {
    name: path.basename(newPath),
    path: newPath,
    type: stats.isDirectory() ? 'directory' : 'file',
    size: stats.size,
    sizeFormatted: formatFileSize(stats.size),
    modifiedAt: stats.mtime.toISOString(),
  };
}

/**
 * Copy a file or directory.
 * @param {string} srcPath
 * @param {string} destPath
 * @returns {Promise<Object>}
 */
export async function copyItem(srcPath, destPath) {
  const { absolutePath: srcAbs } = await validatePath(srcPath);
  const { absolutePath: destParent } = await validatePath(path.dirname(destPath));
  const destFull = path.join(destParent, path.basename(destPath));

  const normalizedRoot = path.normalize(ROOT_DIR);
  if (!destFull.startsWith(normalizedRoot + path.sep) && destFull !== normalizedRoot) {
    throw Object.assign(new Error('Destination path escapes root'), { status: 403 });
  }

  const stats = await fs.lstat(srcAbs);
  if (stats.isDirectory()) {
    await fs.cp(srcAbs, destFull, { recursive: true });
  } else {
    await fs.copyFile(srcAbs, destFull);
  }

  const newStats = await fs.stat(destFull);
  return {
    name: path.basename(destPath),
    path: destPath,
    type: newStats.isDirectory() ? 'directory' : 'file',
    size: newStats.size,
    sizeFormatted: formatFileSize(newStats.size),
    modifiedAt: newStats.mtime.toISOString(),
  };
}

/**
 * Get metadata for a single file/directory.
 * @param {string} targetPath
 * @returns {Promise<Object>}
 */
export async function getMetadata(targetPath) {
  const { absolutePath } = await validatePath(targetPath);
  const stats = await fs.stat(absolutePath);
  const name = path.basename(targetPath);
  return {
    name: name || '.',
    path: targetPath,
    type: stats.isDirectory() ? 'directory' : 'file',
    size: stats.size,
    sizeFormatted: formatFileSize(stats.size),
    category: stats.isFile() ? getFileCategory(name) : null,
    createdAt: stats.birthtime.toISOString(),
    modifiedAt: stats.mtime.toISOString(),
    extension: stats.isFile() ? path.extname(name) : null,
  };
}
