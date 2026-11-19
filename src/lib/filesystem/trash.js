import fs from 'fs/promises';
import path from 'path';
import { ROOT_DIR } from './security.js';

/**
 * Get the .trash directory path (absolute)
 * @returns {string}
 */
export function getTrashDir() {
  return path.join(ROOT_DIR, '.trash');
}

/**
 * Generate a timestamped trash name to avoid collisions
 * @param {string} originalName - Original file/folder name
 * @returns {string}
 */
export function generateTrashName(originalName) {
  const timestamp = Date.now();
  return `${originalName}.${timestamp}`;
}

/**
 * Ensure .trash directory exists
 * @returns {Promise<void>}
 */
async function ensureTrashDir() {
  const trashDir = getTrashDir();
  await fs.mkdir(trashDir, { recursive: true });
}

/**
 * Move a file or folder to the trash
 * @param {string} absolutePath - Absolute path to the item
 * @returns {Promise<{trashName: string, originalPath: string, type: string, size: number}>}
 */
export async function moveToTrash(absolutePath) {
  await ensureTrashDir();
  
  const stats = await fs.lstat(absolutePath);
  const name = path.basename(absolutePath);
  const trashName = generateTrashName(name);
  const trashDir = getTrashDir();
  const trashPath = path.join(trashDir, trashName);
  
  // Move to trash (atomic on same filesystem)
  await fs.rename(absolutePath, trashPath);
  
  // Get size (for directories, this is just the directory itself, not contents)
  const size = stats.size;
  const type = stats.isDirectory() ? 'directory' : 'file';
  const relativePath = path.relative(ROOT_DIR, absolutePath);
  
  // Write metadata sidecar
  const metadata = {
    originalPath: relativePath,
    deletedAt: new Date().toISOString(),
    type,
    size,
    name,
  };
  
  const metaPath = `${trashPath}.meta.json`;
  await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
  
  return {
    trashName,
    originalPath: relativePath,
    type,
    size,
  };
}

/**
 * List all items in trash with metadata
 * @returns {Promise<Array<{trashName: string, originalPath: string, deletedAt: string, type: string, size: number, name: string}>>}
 */
export async function listTrash() {
  const trashDir = getTrashDir();
  
  try {
    await fs.access(trashDir);
  } catch {
    // Trash doesn't exist yet
    return [];
  }
  
  const entries = await fs.readdir(trashDir, { withFileTypes: true });
  const items = [];
  
  for (const entry of entries) {
    // Skip metadata files
    if (entry.name.endsWith('.meta.json')) continue;
    
    const metaPath = path.join(trashDir, `${entry.name}.meta.json`);
    
    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      const metadata = JSON.parse(metaContent);
      
      items.push({
        trashName: entry.name,
        name: metadata.name,
        originalPath: metadata.originalPath,
        deletedAt: metadata.deletedAt,
        type: metadata.type,
        size: metadata.size,
      });
    } catch {
      // Metadata file missing or corrupted, skip this item
      continue;
    }
  }
  
  // Sort by deletion date (newest first)
  return items.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
}

/**
 * Restore an item from trash to its original location
 * @param {string} trashName - Name of item in trash (with timestamp)
 * @returns {Promise<{restoredPath: string, originalPath: string}>}
 */
export async function restoreFromTrash(trashName) {
  const trashDir = getTrashDir();
  const trashPath = path.join(trashDir, trashName);
  const metaPath = `${trashPath}.meta.json`;
  
  // Read metadata
  let metadata;
  try {
    const metaContent = await fs.readFile(metaPath, 'utf-8');
    metadata = JSON.parse(metaContent);
  } catch {
    throw Object.assign(new Error('Trash metadata not found'), { status: 404 });
  }
  
  const originalPath = path.join(ROOT_DIR, metadata.originalPath);
  const originalDir = path.dirname(originalPath);
  
  // Ensure original directory exists
  await fs.mkdir(originalDir, { recursive: true });
  
  let restorePath = originalPath;
  let restoreName = path.basename(originalPath);
  
  // Check if original location is occupied
  try {
    await fs.access(originalPath);
    // Path exists, append "(restored)" to filename
    const ext = path.extname(restoreName);
    const baseName = path.basename(restoreName, ext);
    restoreName = `${baseName} (restored)${ext}`;
    restorePath = path.join(originalDir, restoreName);
    
    // If still exists (unlikely), add counter
    let counter = 2;
    while (true) {
      try {
        await fs.access(restorePath);
        restoreName = `${baseName} (restored ${counter})${ext}`;
        restorePath = path.join(originalDir, restoreName);
        counter++;
      } catch {
        break;
      }
    }
  } catch {
    // Path doesn't exist, restore to original location
  }
  
  // Move from trash to original location
  await fs.rename(trashPath, restorePath);
  
  // Delete metadata file
  await fs.unlink(metaPath);
  
  const relativeRestorePath = path.relative(ROOT_DIR, restorePath);
  
  return {
    restoredPath: relativeRestorePath,
    originalPath: metadata.originalPath,
    name: restoreName,
  };
}

/**
 * Permanently delete an item from trash
 * @param {string} trashName - Name of item in trash (with timestamp)
 * @returns {Promise<{success: boolean}>}
 */
export async function permanentDelete(trashName) {
  const trashDir = getTrashDir();
  const trashPath = path.join(trashDir, trashName);
  const metaPath = `${trashPath}.meta.json`;
  
  // Check if item exists
  try {
    const stats = await fs.lstat(trashPath);
    
    // Delete the item
    if (stats.isDirectory()) {
      await fs.rm(trashPath, { recursive: true, force: true });
    } else {
      await fs.unlink(trashPath);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw Object.assign(new Error('Item not found in trash'), { status: 404 });
    }
    throw error;
  }
  
  // Delete metadata file
  try {
    await fs.unlink(metaPath);
  } catch {
    // Metadata might not exist, that's okay
  }
  
  return { success: true };
}

/**
 * Empty the entire trash
 * @returns {Promise<{success: boolean, deletedCount: number}>}
 */
export async function emptyTrash() {
  const trashDir = getTrashDir();
  
  try {
    await fs.access(trashDir);
  } catch {
    // Trash doesn't exist
    return { success: true, deletedCount: 0 };
  }
  
  // Count items before deleting
  const entries = await fs.readdir(trashDir);
  const itemCount = entries.filter((name) => !name.endsWith('.meta.json')).length;
  
  // Remove entire trash directory
  await fs.rm(trashDir, { recursive: true, force: true });
  
  return { success: true, deletedCount: itemCount };
}
