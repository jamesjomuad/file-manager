import { NextResponse } from 'next/server';
import path from 'path';
import AdmZip from 'adm-zip';
import { validatePath, ROOT_DIR } from '@/lib/filesystem/security';
import { formatFileSize } from '@/lib/filesystem/utils';
import { detectArchiveFormat } from '@/lib/archive/formats';
import { listArchive, extractEntry } from '@/lib/archive/seven-zip';

/**
 * GET /api/files/archive?path=... — List archive contents
 * GET /api/files/archive?path=...&entry=... — Read a single entry from archive
 *
 * Supports:
 * - .zip via adm-zip (native)
 * - .7z via 7z.exe (system executable)
 */

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const archivePath = searchParams.get('path');
    const entryName = searchParams.get('entry');

    if (!archivePath) {
      return NextResponse.json(
        { success: false, error: 'path is required' },
        { status: 400 }
      );
    }

    // Detect format
    const format = detectArchiveFormat(archivePath);

    if (!format) {
      return NextResponse.json(
        { success: false, error: `Not a recognized archive format: ${path.extname(archivePath)}` },
        { status: 415 }
      );
    }

    if (!format.supported) {
      const supported = ['ZIP', '7-Zip'];
      return NextResponse.json(
        { success: false, error: `Unsupported archive format: ${format.label}. Supported: ${supported.join(', ')}` },
        { status: 415 }
      );
    }

    // Validate and resolve path
    const { absolutePath } = await validatePath(archivePath);

    // Dispatch to format-specific handler
    if (format.id === '7z') {
      return handleSevenZip(absolutePath, entryName);
    }

    // Default: ZIP
    return handleZip(absolutePath, entryName);
  } catch (error) {
    console.error('GET /api/files/archive error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to read archive' },
      { status: error.status || 500 }
    );
  }
}

/**
 * Handle 7z archive listing or entry extraction
 */
async function handleSevenZip(absolutePath, entryName) {
  try {
    if (entryName) {
      // Extract specific entry
      const buffer = await extractEntry(absolutePath, entryName);

      // Determine content type from extension
      const ext = path.extname(entryName).toLowerCase();
      const mimeTypes = {
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.json': 'application/json',
        '.js': 'text/javascript',
        '.html': 'text/html',
        '.css': 'text/css',
        '.xml': 'text/xml',
        '.csv': 'text/csv',
      };

      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const isText = ['text/plain', 'text/markdown', 'application/json', 'text/javascript', 'text/html', 'text/css', 'text/xml', 'text/csv'].includes(contentType);

      if (isText) {
        return NextResponse.json({
          success: true,
          data: { content: buffer.toString('utf8'), encoding: 'utf8', contentType },
        });
      }

      return NextResponse.json({
        success: true,
        data: { content: buffer.toString('base64'), encoding: 'base64', contentType },
      });
    }

    // List all entries
    const result = await listArchive(absolutePath);

    // Build tree
    const tree = result.entries.map((entry) => ({
      name: entry.name,
      path: entry.path,
      parentPath: entry.path.replace(/\/$/, '').split('/').slice(0, -1).join('/') || '',
      type: entry.isDirectory ? 'directory' : 'file',
      size: entry.size,
      sizeFormatted: entry.isDirectory ? '—' : formatFileSize(entry.size),
      compressedSize: entry.compressedSize,
      compressedSizeFormatted: entry.isDirectory ? '—' : formatFileSize(entry.compressedSize),
      extension: entry.isDirectory ? null : path.extname(entry.name),
      lastModified: entry.modified,
    }));

    // Sort: directories first, then alphabetical
    tree.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.path.localeCompare(b.path);
    });

    const totalFiles = result.entries.filter((e) => !e.isDirectory).length;
    const totalDirs = result.entries.filter((e) => e.isDirectory).length;

    return NextResponse.json({
      success: true,
      data: {
        entries: tree,
        totalEntries: result.entries.length,
        totalFiles,
        totalDirs,
        totalSize: result.totalSize,
        totalSizeFormatted: formatFileSize(result.totalSize),
        compressedSize: result.totalCompressed,
        compressedSizeFormatted: formatFileSize(result.totalCompressed),
        compressionRatio: result.totalSize > 0
          ? ((1 - result.totalCompressed / result.totalSize) * 100).toFixed(1) + '%'
          : '0%',
      },
    });
  } catch (error) {
    if (error.status) throw error;
    throw { status: 500, message: `Failed to read 7z archive: ${error.message}` };
  }
}

/**
 * Handle .zip archive listing or entry extraction
 */
function handleZip(absolutePath, entryName) {
  const zip = new AdmZip(absolutePath);
  const entries = zip.getEntries();

  // If requesting a specific entry, return its content
  if (entryName) {
    const entry = entries.find((e) => e.entryName === entryName);
    if (!entry) {
      return NextResponse.json(
        { success: false, error: `Entry not found: ${entryName}` },
        { status: 404 }
      );
    }

    if (entry.isDirectory) {
      return NextResponse.json(
        { success: false, error: 'Cannot read a directory entry' },
        { status: 400 }
      );
    }

    // Determine content type from extension
    const ext = path.extname(entryName).toLowerCase();
    const mimeTypes = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.js': 'text/javascript',
      '.html': 'text/html',
      '.css': 'text/css',
      '.xml': 'text/xml',
      '.csv': 'text/csv',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // For text files, return as text; for binary, return as base64
    const isText = ['text/plain', 'text/markdown', 'application/json', 'text/javascript', 'text/html', 'text/css', 'text/xml', 'text/csv'].includes(contentType);

    if (isText) {
      const content = entry.getData().toString('utf8');
      return NextResponse.json({
        success: true,
        data: { content, encoding: 'utf8', contentType },
      });
    }

    // Binary — return as base64
    const buffer = entry.getData();
    const base64 = buffer.toString('base64');
    return NextResponse.json({
      success: true,
      data: { content: base64, encoding: 'base64', contentType },
    });
  }

  // List all entries as a tree
  const tree = [];
  const dirMap = new Map();

  for (const entry of entries) {
    const entryPath = entry.entryName;
    const isDir = entry.isDirectory;
    const parts = entryPath.replace(/\/$/, '').split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');

    const item = {
      name,
      path: entryPath,
      parentPath: parentPath || '',
      type: isDir ? 'directory' : 'file',
      size: isDir ? 0 : entry.header.size,
      sizeFormatted: isDir ? '—' : formatFileSize(entry.header.size),
      compressedSize: isDir ? 0 : entry.header.compressedSize,
      compressedSizeFormatted: isDir ? '—' : formatFileSize(entry.header.compressedSize),
      extension: isDir ? null : path.extname(name),
      lastModified: entry.header.time?.toISOString() || null,
    };

    tree.push(item);
  }

  // Sort: directories first, then alphabetical
  tree.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  const totalSize = entries.reduce((sum, e) => sum + (e.isDirectory ? 0 : e.header.size), 0);
  const totalCompressed = entries.reduce((sum, e) => sum + (e.isDirectory ? 0 : e.header.compressedSize), 0);

  return NextResponse.json({
    success: true,
    data: {
      entries: tree,
      totalEntries: entries.length,
      totalFiles: entries.filter((e) => !e.isDirectory).length,
      totalDirs: entries.filter((e) => e.isDirectory).length,
      totalSize,
      totalSizeFormatted: formatFileSize(totalSize),
      compressedSize: totalCompressed,
      compressedSizeFormatted: formatFileSize(totalCompressed),
      compressionRatio: totalSize > 0 ? ((1 - totalCompressed / totalSize) * 100).toFixed(1) + '%' : '0%',
    },
  });
}
