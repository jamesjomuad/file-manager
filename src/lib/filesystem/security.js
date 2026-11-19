import path from 'path';
import fs from 'fs/promises';

const ROOT_DIR = path.resolve(process.env.FILE_MANAGER_ROOT || path.join(process.cwd(), 'data'));

/**
 * Validate and resolve a user-provided path to ensure it stays within ROOT_DIR.
 * @param {string} userPath - Relative path from user input
 * @returns {Promise<{absolutePath: string, relativePath: string}>}
 * @throws {Error} If path escapes root or doesn't exist
 */
export async function validatePath(userPath) {
  // Resolve to absolute, normalize
  const normalized = path.normalize(userPath || '.');
  const absolutePath = path.resolve(ROOT_DIR, normalized);

  // Path traversal check
  const normalizedRoot = path.normalize(ROOT_DIR);
  // Handle drive roots (e.g., "D:\") which already end with separator
  const rootPrefix = normalizedRoot.endsWith(path.sep) 
    ? normalizedRoot 
    : normalizedRoot + path.sep;
  
  if (!absolutePath.startsWith(rootPrefix) && absolutePath !== normalizedRoot) {
    throw Object.assign(new Error('Path traversal detected'), { status: 403 });
  }

  // Check existence and symlinks
  try {
    const stats = await fs.lstat(/*turbopackIgnore: true*/ absolutePath);
    if (stats.isSymbolicLink()) {
      const target = await fs.realpath(/*turbopackIgnore: true*/ absolutePath);
      if (!target.startsWith(normalizedRoot)) {
        throw Object.assign(new Error('Symlink escapes root directory'), { status: 403 });
      }
    }
    return { absolutePath, relativePath: path.relative(ROOT_DIR, absolutePath) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw Object.assign(new Error('Path does not exist'), { status: 404 });
    }
    throw error;
  }
}

/**
 * Check that an absolute path is within ROOT_DIR (no existence check).
 * @param {string} absolutePath - Absolute path to check
 * @throws {Error} If path escapes root
 */
function ensureWithinRoot(absolutePath) {
  const normalizedRoot = path.normalize(ROOT_DIR);
  const normalized = path.normalize(absolutePath);
  // Handle drive roots (e.g., "D:\") which already end with separator
  const rootPrefix = normalizedRoot.endsWith(path.sep) 
    ? normalizedRoot 
    : normalizedRoot + path.sep;
  
  if (!normalized.startsWith(rootPrefix) && normalized !== normalizedRoot) {
    throw Object.assign(new Error('Path traversal detected'), { status: 403 });
  }
}

export { ROOT_DIR, ensureWithinRoot };
