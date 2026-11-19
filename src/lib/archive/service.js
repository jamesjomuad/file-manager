import path from 'path';
import fs from 'fs/promises';
import AdmZip from 'adm-zip';
import { validatePath, ensureWithinRoot, ROOT_DIR } from '@/lib/filesystem/security';

/**
 * Archive service — ZIP compression and extraction with security validation.
 * 
 * Supports:
 * - Creating ZIP archives from files/folders
 * - Extracting ZIP archives with conflict resolution
 * - ZIP Slip prevention (path traversal protection)
 * - Entry-by-entry extraction for progress tracking
 * - Cancellation support
 * 
 * @module archive/service
 */

/**
 * Compression levels (mapped to adm-zip method)
 */
export const COMPRESSION_LEVELS = {
  store: { method: 0, label: 'Store (no compression)', deflate: 0 },
  fast: { method: 8, label: 'Fast', deflate: 1 },
  normal: { method: 8, label: 'Normal', deflate: 6 },
  maximum: { method: 8, label: 'Maximum', deflate: 9 },
};

/**
 * Conflict resolution strategies
 */
export const CONFLICT_STRATEGIES = {
  skip: 'skip',
  replace: 'replace',
  rename: 'rename',
  keepBoth: 'keepBoth',
};

/**
 * Security limits
 */
const LIMITS = {
  maxFileSize: 500 * 1024 * 1024, // 500MB per file
  maxArchiveSize: 2 * 1024 * 1024 * 1024, // 2GB total archive
  maxEntryCount: 100000, // 100k entries
  maxDecompressionRatio: 100, // 100x decompression ratio
  blockedExtensions: new Set(['.exe', '.bat', '.cmd', '.scr', '.msi', '.com']),
};

/**
 * Validate an archive entry path for ZIP Slip attacks
 * 
 * @param {string} entryPath - Entry path from the archive
 * @param {string} destDir - Absolute destination directory
 * @returns {{ valid: boolean, absolutePath: string, reason?: string }}
 */
export function validateEntryPath(entryPath, destDir) {
  // Normalize the entry path
  const normalized = entryPath.replace(/\\/g, '/');
  
  // Reject absolute paths
  if (path.isAbsolute(normalized)) {
    return { valid: false, absolutePath: '', reason: 'Absolute paths not allowed' };
  }
  
  // Reject paths starting with / or ../
  if (normalized.startsWith('/') || normalized.startsWith('../')) {
    return { valid: false, absolutePath: '', reason: 'Path traversal detected' };
  }
  
  // Resolve the full path
  const absolutePath = path.resolve(destDir, normalized);
  const normalizedDest = path.normalize(destDir);
  
  // Verify it stays within destination
  if (!absolutePath.startsWith(normalizedDest + path.sep) && absolutePath !== normalizedDest) {
    return { valid: false, absolutePath: '', reason: 'Path escapes destination directory' };
  }
  
  return { valid: true, absolutePath };
}

/**
 * Check if a file is a blocked executable type
 * 
 * @param {string} filename - File name
 * @returns {boolean}
 */
export function isBlockedExecutable(filename) {
  const ext = path.extname(filename).toLowerCase();
  return LIMITS.blockedExtensions.has(ext);
}

/**
 * Generate a unique filename for conflict resolution (rename strategy)
 * 
 * @param {string} filePath - Original file path
 * @returns {Promise<string>} Unique file path
 */
async function generateUniquePath(filePath) {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  
  let counter = 1;
  let newPath = filePath;
  
  while (true) {
    try {
      await fs.access(newPath);
      // File exists, try next name
      newPath = path.join(dir, `${base} (${counter})${ext}`);
      counter++;
    } catch {
      // File doesn't exist, use this path
      return newPath;
    }
  }
}

/**
 * Compress files/folders into a ZIP archive
 * 
 * @param {Object} options
 * @param {string} options.outputPath - Output archive path (relative to root)
 * @param {Array<{path: string, name?: string}>} options.items - Items to compress
 * @param {string} [options.compressionLevel='normal'] - Compression level
 * @param {boolean} [options.includeHidden=false] - Include hidden files
 * @param {Function} [options.onProgress] - Progress callback (processed, total, currentItem)
 * @param {{ cancelled: boolean }} [options.cancelToken] - Cancellation token
 * @returns {Promise<{ success: boolean, originalSize: number, compressedSize: number, ratio: string, error?: string }>}
 */
export async function compressArchive({
  outputPath,
  items,
  compressionLevel = 'normal',
  includeHidden = false,
  onProgress,
  cancelToken,
}) {
  try {
    // Validate output path
    const { absolutePath: absOutputPath } = await validatePath(outputPath);
    
    // Ensure output is within root
    const normalizedRoot = path.normalize(ROOT_DIR);
    if (!absOutputPath.startsWith(normalizedRoot)) {
      throw { status: 403, message: 'Output path outside root directory' };
    }
    
    // Check if output already exists
    try {
      await fs.access(absOutputPath);
      throw { status: 409, message: 'Archive already exists at this path' };
    } catch (err) {
      if (err.status === 409) throw err;
      // File doesn't exist, good
    }
    
    // Get compression settings
    const level = COMPRESSION_LEVELS[compressionLevel] || COMPRESSION_LEVELS.normal;
    
    // Create ZIP
    const zip = new AdmZip();
    
    // Count total items for progress
    let totalItems = 0;
    for (const item of items) {
      const { absolutePath: absItemPath } = await validatePath(item.path);
      const stat = await fs.stat(absItemPath);
      if (stat.isDirectory()) {
        totalItems += await countFiles(absItemPath, includeHidden);
      } else {
        totalItems++;
      }
    }
    
    let processedItems = 0;
    let totalOriginalSize = 0;
    
    // Add items to archive
    for (const item of items) {
      if (cancelToken?.cancelled) {
        throw { status: 499, message: 'Operation cancelled' };
      }
      
      const { absolutePath: absItemPath } = await validatePath(item.path);
      const stat = await fs.stat(absItemPath);
      
      if (stat.isDirectory()) {
        await addDirectoryToZip(zip, absItemPath, item.name || path.basename(absItemPath), includeHidden, level, async () => {
          processedItems++;
          onProgress?.(processedItems, totalItems, item.name);
        });
      } else {
        // Single file
        const fileBuffer = await fs.readFile(absItemPath);
        totalOriginalSize += fileBuffer.length;
        
        // Check size limit
        if (fileBuffer.length > LIMITS.maxFileSize) {
          throw { status: 413, message: `File too large: ${item.name} (${fileBuffer.length} bytes)` };
        }
        
        zip.addFile(
          item.name || path.basename(absItemPath),
          fileBuffer,
          '',
          level.deflate
        );
        
        processedItems++;
        onProgress?.(processedItems, totalItems, item.name);
      }
    }
    
    // Write the ZIP file
    await new Promise((resolve, reject) => {
      zip.writeZipAsync(absOutputPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Get final size
    const outputStat = await fs.stat(absOutputPath);
    const compressedSize = outputStat.size;
    
    const ratio = totalOriginalSize > 0
      ? ((1 - compressedSize / totalOriginalSize) * 100).toFixed(1) + '%'
      : '0%';
    
    return {
      success: true,
      originalSize: totalOriginalSize,
      compressedSize,
      ratio,
    };
  } catch (error) {
    console.error('Compression error:', error);
    return {
      success: false,
      error: error.message || 'Compression failed',
      originalSize: 0,
      compressedSize: 0,
      ratio: '0%',
    };
  }
}

/**
 * Recursively add a directory to the ZIP
 */
async function addDirectoryToZip(zip, dirPath, zipPath, includeHidden, level, onFileAdded) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    // Skip hidden files if not included
    if (!includeHidden && entry.name.startsWith('.')) {
      continue;
    }
    
    const fullPath = path.join(dirPath, entry.name);
    const entryZipPath = path.join(zipPath, entry.name).replace(/\\/g, '/');
    
    if (entry.isDirectory()) {
      zip.addFile(entryZipPath + '/', Buffer.alloc(0));
      await addDirectoryToZip(zip, fullPath, entryZipPath, includeHidden, level, onFileAdded);
    } else {
      const stat = await fs.stat(fullPath);
      
      // Skip files over limit
      if (stat.size > LIMITS.maxFileSize) {
        console.warn(`Skipping file over size limit: ${fullPath}`);
        continue;
      }
      
      const fileBuffer = await fs.readFile(fullPath);
      zip.addFile(entryZipPath, fileBuffer, '', level.deflate);
      await onFileAdded?.();
    }
  }
}

/**
 * Count files in a directory recursively
 */
async function countFiles(dirPath, includeHidden) {
  let count = 0;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    if (!includeHidden && entry.name.startsWith('.')) continue;
    
    if (entry.isDirectory()) {
      count += await countFiles(path.join(dirPath, entry.name), includeHidden);
    } else {
      count++;
    }
  }
  
  return count;
}

/**
 * Extract a ZIP archive to a destination directory
 * 
 * @param {Object} options
 * @param {string} options.archivePath - Archive path (relative to root)
 * @param {string} options.destPath - Destination directory (relative to root)
 * @param {string[]} [options.entries] - Specific entries to extract (all if not specified)
 * @param {string} [options.conflictStrategy='skip'] - Conflict resolution strategy
 * @param {boolean} [options.preserveStructure=true] - Preserve directory structure
 * @param {Function} [options.onProgress] - Progress callback (processed, total, currentItem)
 * @param {{ cancelled: boolean }} [options.cancelToken] - Cancellation token
 * @returns {Promise<{ success: boolean, extracted: number, skipped: number, errors: string[] }>}
 */
export async function extractArchive({
  archivePath,
  destPath,
  entries: selectedEntries,
  conflictStrategy = CONFLICT_STRATEGIES.skip,
  preserveStructure = true,
  onProgress,
  cancelToken,
}) {
  const errors = [];
  let extracted = 0;
  let skipped = 0;
  
  try {
    // Validate paths
    const { absolutePath: absArchivePath } = await validatePath(archivePath);
    const { absolutePath: absDestPath } = await validatePath(destPath);
    
    // Verify archive exists
    const archiveStat = await fs.stat(absArchivePath);
    if (archiveStat.isDirectory()) {
      throw { status: 400, message: 'Archive path is a directory' };
    }
    
    // Ensure destination exists
    try {
      await fs.access(absDestPath);
    } catch {
      throw { status: 404, message: 'Destination directory does not exist' };
    }
    
    // Verify destination is within root
    const normalizedRoot = path.normalize(ROOT_DIR);
    if (!absDestPath.startsWith(normalizedRoot)) {
      throw { status: 403, message: 'Destination path outside root directory' };
    }
    
    // Load the archive
    const zip = new AdmZip(absArchivePath);
    const allEntries = zip.getEntries();
    
    // Check entry count limit
    if (allEntries.length > LIMITS.maxEntryCount) {
      throw { status: 413, message: `Archive has too many entries: ${allEntries.length}` };
    }
    
    // Check total size limit
    const totalSize = allEntries.reduce((sum, e) => sum + e.header.size, 0);
    if (totalSize > LIMITS.maxArchiveSize) {
      throw { status: 413, message: `Archive too large: ${totalSize} bytes` };
    }
    
    // Check decompression ratio
    const ratio = totalSize / archiveStat.size;
    if (ratio > LIMITS.maxDecompressionRatio) {
      throw { status: 413, message: `Suspicious decompression ratio: ${ratio.toFixed(1)}x` };
    }
    
    // Filter entries if specific ones selected
    const entriesToExtract = selectedEntries
      ? allEntries.filter(e => selectedEntries.includes(e.entryName))
      : allEntries;
    
    const totalEntries = entriesToExtract.length;
    let processedEntries = 0;
    
    // Extract entries one by one
    for (const entry of entriesToExtract) {
      if (cancelToken?.cancelled) {
        break;
      }
      
      const entryName = entry.entryName;
      
      // Determine output path
      let outputPath;
      if (preserveStructure) {
        outputPath = path.join(absDestPath, entryName);
      } else {
        // Flatten structure
        outputPath = path.join(absDestPath, path.basename(entryName));
      }
      
      // Validate entry path (ZIP Slip protection)
      const validation = validateEntryPath(entryName, absDestPath);
      if (!validation.valid) {
        errors.push(`Skipped "${entryName}": ${validation.reason}`);
        skipped++;
        continue;
      }
      
      // Check for blocked executables
      if (isBlockedExecutable(entryName)) {
        errors.push(`Skipped "${entryName}": Blocked executable type`);
        skipped++;
        continue;
      }
      
      if (entry.isDirectory) {
        // Create directory
        try {
          await fs.mkdir(validation.absolutePath, { recursive: true });
        } catch (err) {
          errors.push(`Failed to create directory "${entryName}": ${err.message}`);
        }
      } else {
        // File — check for conflicts
        let targetPath = validation.absolutePath;
        
        try {
          await fs.access(targetPath);
          // File exists — apply conflict strategy
          switch (conflictStrategy) {
            case CONFLICT_STRATEGIES.skip:
              skipped++;
              continue;
            
            case CONFLICT_STRATEGIES.replace:
              // Will overwrite
              break;
            
            case CONFLICT_STRATEGIES.rename:
              targetPath = await generateUniquePath(targetPath);
              break;
            
            case CONFLICT_STRATEGIES.keepBoth:
              targetPath = await generateUniquePath(targetPath);
              break;
          }
        } catch {
          // File doesn't exist, proceed
        }
        
        // Extract the file
        try {
          // Ensure parent directory exists
          await fs.mkdir(path.dirname(targetPath), { recursive: true });
          
          // Write the file
          const buffer = entry.getData();
          await fs.writeFile(targetPath, buffer);
          extracted++;
        } catch (err) {
          errors.push(`Failed to extract "${entryName}": ${err.message}`);
        }
      }
      
      processedEntries++;
      onProgress?.(processedEntries, totalEntries, entryName);
    }
    
    return {
      success: errors.length === 0,
      extracted,
      skipped,
      errors,
    };
  } catch (error) {
    console.error('Extraction error:', error);
    return {
      success: false,
      error: error.message || 'Extraction failed',
      extracted,
      skipped,
      errors: [...errors, error.message],
    };
  }
}

/**
 * Get archive metadata without extracting
 * 
 * @param {string} archivePath - Archive path (relative to root)
 * @returns {Promise<{ success: boolean, data?: Object, error?: string }>}
 */
export async function getArchiveInfo(archivePath) {
  try {
    const { absolutePath } = await validatePath(archivePath);
    const zip = new AdmZip(absolutePath);
    const entries = zip.getEntries();
    
    const totalSize = entries.reduce((sum, e) => sum + (e.isDirectory ? 0 : e.header.size), 0);
    const totalCompressed = entries.reduce((sum, e) => sum + (e.isDirectory ? 0 : e.header.compressedSize), 0);
    
    return {
      success: true,
      data: {
        totalEntries: entries.length,
        totalFiles: entries.filter(e => !e.isDirectory).length,
        totalDirs: entries.filter(e => e.isDirectory).length,
        totalSize,
        compressedSize: totalCompressed,
        ratio: totalSize > 0 ? ((1 - totalCompressed / totalSize) * 100).toFixed(1) + '%' : '0%',
      },
    };
  } catch (error) {
    console.error('Archive info error:', error);
    return {
      success: false,
      error: error.message || 'Failed to read archive',
    };
  }
}
