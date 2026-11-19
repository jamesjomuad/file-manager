import { NextResponse } from 'next/server';
import path from 'path';
import AdmZip from 'adm-zip';
import { validatePath, ROOT_DIR } from '@/lib/filesystem/security';
import { formatFileSize } from '@/lib/filesystem/utils';

/**
 * GET /api/files/archive?path=... — List archive contents
 * GET /api/files/archive?path=...&entry=... — Read a single entry from archive
 *
 * Currently supports .zip files via adm-zip.
 */

const SUPPORTED_EXTENSIONS = new Set(['.zip']);

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

    // Validate extension
    const ext = path.extname(archivePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { success: false, error: `Unsupported archive format: ${ext}. Supported: .zip` },
        { status: 415 }
      );
    }

    // Validate and resolve path
    const { absolutePath } = await validatePath(archivePath);

    if (ext === '.zip') {
      return handleZip(absolutePath, entryName);
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported format' },
      { status: 415 }
    );
  } catch (error) {
    console.error('GET /api/files/archive error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
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
