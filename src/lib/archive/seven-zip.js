import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Paths to search for 7z executable
 */
const SEVEN_ZIP_PATHS = [
  'C:\\Program Files\\7-Zip\\7z.exe',
  'C:\\Program Files (x86)\\7-Zip\\7z.exe',
  '/usr/bin/7z',
  '/usr/local/bin/7z',
  '/usr/bin/7za',
  '/usr/local/bin/7za',
];

/**
 * Cached path to 7z executable, or null if not found
 * @type {string|null}
 */
let cachedPath = undefined;

/**
 * Find 7z executable on the system
 * @returns {Promise<string|null>} Path to 7z binary, or null if not found
 */
export async function findSevenZip() {
  if (cachedPath !== undefined) return cachedPath;

  // Try common paths first
  const fs = await import('fs/promises');
  for (const p of SEVEN_ZIP_PATHS) {
    try {
      await fs.access(p);
      cachedPath = p;
      return cachedPath;
    } catch {
      // Not found at this path
    }
  }

  // Try finding via PATH
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const { stdout } = await execFileAsync(cmd, ['7z']);
    const found = stdout.trim().split('\n')[0].trim();
    if (found) {
      cachedPath = found;
      return cachedPath;
    }
  } catch {
    // Not found in PATH
  }

  cachedPath = null;
  return null;
}

/**
 * Reset cached 7z path (for testing)
 */
export function resetSevenZipCache() {
  cachedPath = undefined;
}

/**
 * Parse detailed listing output from `7z l -slt`
 * Format: Archive metadata first, then `----------` separator, then file entries
 * Each entry has key=value pairs separated by blank lines
 * Directories have Attributes = D, files have Attributes = N or other values
 * @param {string} output — stdout from 7z l -slt
 * @returns {Array<{path: string, isDirectory: boolean, size: number, compressedSize: number, name: string}>}
 */
function parseDetailedListing(output) {
  // Split at the separator line to skip archive metadata
  const separatorIndex = output.indexOf('----------');
  if (separatorIndex === -1) {
    return []; // No entries section found
  }
  
  // Get only the file entries section (after the separator)
  const entriesSection = output.substring(separatorIndex + '----------'.length);
  
  const entries = [];
  const blocks = entriesSection.split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length === 0) continue;

    const props = {};
    for (const line of lines) {
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.substring(0, eqIdx).trim();
      const value = line.substring(eqIdx + 1).trim();
      props[key] = value;
    }

    if (!props.Path) continue;

    // Normalize path separators to forward slashes
    const entryPath = (props.Path || '').replace(/\\/g, '/');
    
    // Check if it's a directory by looking at Attributes field
    // Directories have Attributes = D, files have Attributes = N or other
    const attributes = props.Attributes || '';
    const isDir = attributes.includes('D') || props.Folder === '+';
    
    const size = parseInt(props.Size, 10) || 0;
    const compressedSize = parseInt(props['Packed Size'], 10) || 0;
    const name = entryPath.split('/').filter(Boolean).pop() || '';
    const modified = props.Modified || null;

    entries.push({
      path: entryPath,
      name,
      isDirectory: isDir,
      size: isDir ? 0 : size,
      compressedSize: isDir ? 0 : compressedSize,
      modified,
    });
  }

  return entries;
}

/**
 * List entries in a 7z-compatible archive
 * @param {string} absolutePath — absolute path to archive
 * @returns {Promise<{entries: Array, totalSize: number, totalCompressed: number}>}
 */
export async function listArchive(absolutePath) {
  const sevenZip = await findSevenZip();
  if (!sevenZip) {
    throw { status: 500, message: '7-Zip is not installed on this system' };
  }

  try {
    const { stdout } = await execFileAsync(sevenZip, ['l', '-slt', '-y', absolutePath], {
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large archives
      timeout: 60000, // 60 second timeout
    });

    const entries = parseDetailedListing(stdout);

    const totalSize = entries.reduce((sum, e) => sum + (e.isDirectory ? 0 : e.size), 0);
    const totalCompressed = entries.reduce((sum, e) => sum + (e.isDirectory ? 0 : e.compressedSize), 0);

    return { entries, totalSize, totalCompressed };
  } catch (error) {
    if (error.status) throw error;
    throw { status: 500, message: `Failed to list archive: ${error.message}` };
  }
}

/**
 * Extract specific entry content as a buffer from a 7z archive
 * @param {string} absolutePath — absolute path to archive
 * @param {string} entryPath — entry path within archive
 * @returns {Promise<Buffer>}
 */
export async function extractEntry(absolutePath, entryPath) {
  const sevenZip = await findSevenZip();
  if (!sevenZip) {
    throw { status: 500, message: '7-Zip is not installed on this system' };
  }

  const fs = await import('fs/promises');
  const os = await import('os');
  const nodePath = await import('path');

  // Create a temp directory to extract the single file into
  const tempDir = await fs.mkdtemp(nodePath.join(os.tmpdir(), '7z-entry-'));

  try {
    await execFileAsync(
      sevenZip,
      ['e', '-y', `-o${tempDir}`, absolutePath, entryPath],
      { maxBuffer: 50 * 1024 * 1024, timeout: 60000 }
    );

    // The extracted file will be at tempDir/<basename>
    const basename = entryPath.split('/').pop();
    const extractedPath = nodePath.join(tempDir, basename);

    try {
      const content = await fs.readFile(extractedPath);
      return content;
    } catch {
      throw { status: 404, message: `Entry not found: ${entryPath}` };
    }
  } finally {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}
