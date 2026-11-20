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
 * Move multiple items to a destination directory.
 * @param {string[]} sourcePaths - Relative paths of items to move
 * @param {string} destDir - Relative path of destination directory
 * @param {Object} [options]
 * @param {'skip'|'replace'|'rename'} [options.conflict='rename'] - How to handle conflicts
 * @returns {Promise<{moved: Object[], skipped: string[], errors: string[]}>}
 */
export async function moveItems(sourcePaths, destDir, options = {}) {
  const { conflict = 'rename' } = options;
  const { absolutePath: destDirAbs } = await validatePath(destDir);
  const normalizedRoot = path.normalize(ROOT_DIR);

  const moved = [];
  const skipped = [];
  const errors = [];

  for (const srcRel of sourcePaths) {
    try {
      const { absolutePath: srcAbs } = await validatePath(srcRel);
      const srcName = path.basename(srcRel);
      const destFull = path.join(destDirAbs, srcName);

      // Prevent moving a directory into itself or a descendant
      if (destFull.startsWith(srcAbs + path.sep) || destFull === srcAbs) {
        errors.push(`Cannot move "${srcName}" into itself or a descendant`);
        continue;
      }

      // Check if destination exists
      let destExists = false;
      try {
        await fs.access(destFull);
        destExists = true;
      } catch {
        destExists = false;
      }

      if (!destExists) {
        // No conflict — simple rename
        await fs.rename(srcAbs, destFull);
        const stats = await fs.stat(destFull);
        moved.push({
          name: srcName,
          path: path.join(destDir, srcName),
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          modifiedAt: stats.mtime.toISOString(),
        });
        continue;
      }

      // Handle conflict
      if (conflict === 'skip') {
        skipped.push(srcName);
        continue;
      }

      if (conflict === 'replace') {
        // Remove existing and move
        const existingStats = await fs.lstat(destFull);
        if (existingStats.isDirectory()) {
          await fs.rm(destFull, { recursive: true, force: true });
        } else {
          await fs.unlink(destFull);
        }
        await fs.rename(srcAbs, destFull);
        const stats = await fs.stat(destFull);
        moved.push({
          name: srcName,
          path: path.join(destDir, srcName),
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          modifiedAt: stats.mtime.toISOString(),
        });
        continue;
      }

      if (conflict === 'rename') {
        // Generate unique name
        const ext = path.extname(srcName);
        const base = path.basename(srcName, ext);
        let counter = 1;
        let newName = srcName;
        let newDest = destFull;

        while (true) {
          newName = ext ? `${base} (${counter})${ext}` : `${base} (${counter})`;
          newDest = path.join(destDirAbs, newName);
          try {
            await fs.access(newDest);
            counter++;
          } catch {
            break;
          }
          if (counter > 999) {
            throw new Error(`Too many conflicts for "${srcName}"`);
          }
        }

        await fs.rename(srcAbs, newDest);
        const stats = await fs.stat(newDest);
        moved.push({
          name: newName,
          path: path.join(destDir, newName),
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          modifiedAt: stats.mtime.toISOString(),
        });
        continue;
      }

      errors.push(`Unknown conflict strategy: ${conflict}`);
    } catch (err) {
      if (err.code === 'EXDEV') {
        // Cross-device move: copy then delete
        try {
          const { absolutePath: srcAbs } = await validatePath(srcRel);
          const srcName = path.basename(srcRel);
          const destFull = path.join(destDirAbs, srcName);

          const stats = await fs.lstat(srcAbs);
          if (stats.isDirectory()) {
            await fs.cp(srcAbs, destFull, { recursive: true });
          } else {
            await fs.copyFile(srcAbs, destFull);
          }
          await fs.rm(srcAbs, { recursive: true, force: true });

          const newStats = await fs.stat(destFull);
          moved.push({
            name: srcName,
            path: path.join(destDir, srcName),
            type: newStats.isDirectory() ? 'directory' : 'file',
            size: newStats.size,
            sizeFormatted: formatFileSize(newStats.size),
            modifiedAt: newStats.mtime.toISOString(),
          });
        } catch (crossErr) {
          errors.push(`Failed to move "${srcRel}": ${crossErr.message}`);
        }
      } else {
        errors.push(`Failed to move "${srcRel}": ${err.message}`);
      }
    }
  }

  return { moved, skipped, errors };
}

/**
 * Copy multiple items to a destination directory.
 * @param {string[]} sourcePaths - Relative paths of items to copy
 * @param {string} destDir - Relative path of destination directory
 * @param {Object} [options]
 * @param {'skip'|'replace'|'rename'} [options.conflict='rename'] - How to handle conflicts
 * @returns {Promise<{copied: Object[], skipped: string[], errors: string[]}>}
 */
export async function copyItems(sourcePaths, destDir, options = {}) {
  const { conflict = 'rename' } = options;
  const { absolutePath: destDirAbs } = await validatePath(destDir);

  const copied = [];
  const skipped = [];
  const errors = [];

  for (const srcRel of sourcePaths) {
    try {
      const { absolutePath: srcAbs } = await validatePath(srcRel);
      const srcName = path.basename(srcRel);
      const destFull = path.join(destDirAbs, srcName);

      // Check if destination exists
      let destExists = false;
      try {
        await fs.access(destFull);
        destExists = true;
      } catch {
        destExists = false;
      }

      if (!destExists) {
        const stats = await fs.lstat(srcAbs);
        if (stats.isDirectory()) {
          await fs.cp(srcAbs, destFull, { recursive: true });
        } else {
          await fs.copyFile(srcAbs, destFull);
        }
        const newStats = await fs.stat(destFull);
        copied.push({
          name: srcName,
          path: path.join(destDir, srcName),
          type: newStats.isDirectory() ? 'directory' : 'file',
          size: newStats.size,
          sizeFormatted: formatFileSize(newStats.size),
          modifiedAt: newStats.mtime.toISOString(),
        });
        continue;
      }

      // Handle conflict
      if (conflict === 'skip') {
        skipped.push(srcName);
        continue;
      }

      if (conflict === 'replace') {
        const existingStats = await fs.lstat(destFull);
        if (existingStats.isDirectory()) {
          await fs.rm(destFull, { recursive: true, force: true });
        } else {
          await fs.unlink(destFull);
        }
        const stats = await fs.lstat(srcAbs);
        if (stats.isDirectory()) {
          await fs.cp(srcAbs, destFull, { recursive: true });
        } else {
          await fs.copyFile(srcAbs, destFull);
        }
        const newStats = await fs.stat(destFull);
        copied.push({
          name: srcName,
          path: path.join(destDir, srcName),
          type: newStats.isDirectory() ? 'directory' : 'file',
          size: newStats.size,
          sizeFormatted: formatFileSize(newStats.size),
          modifiedAt: newStats.mtime.toISOString(),
        });
        continue;
      }

      if (conflict === 'rename') {
        const ext = path.extname(srcName);
        const base = path.basename(srcName, ext);
        let counter = 1;
        let newName = srcName;
        let newDest = destFull;

        while (true) {
          newName = ext ? `${base} (${counter})${ext}` : `${base} (${counter})`;
          newDest = path.join(destDirAbs, newName);
          try {
            await fs.access(newDest);
            counter++;
          } catch {
            break;
          }
          if (counter > 999) {
            throw new Error(`Too many conflicts for "${srcName}"`);
          }
        }

        const stats = await fs.lstat(srcAbs);
        if (stats.isDirectory()) {
          await fs.cp(srcAbs, newDest, { recursive: true });
        } else {
          await fs.copyFile(srcAbs, newDest);
        }
        const newStats = await fs.stat(newDest);
        copied.push({
          name: newName,
          path: path.join(destDir, newName),
          type: newStats.isDirectory() ? 'directory' : 'file',
          size: newStats.size,
          sizeFormatted: formatFileSize(newStats.size),
          modifiedAt: newStats.mtime.toISOString(),
        });
        continue;
      }

      errors.push(`Unknown conflict strategy: ${conflict}`);
    } catch (err) {
      errors.push(`Failed to copy "${srcRel}": ${err.message}`);
    }
  }

  return { copied, skipped, errors };
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
