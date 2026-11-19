import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readFile, writeFile, deleteItem, renameItem, copyItem, getMetadata } from '@/lib/filesystem/service';
import { validatePath } from '@/lib/filesystem/security';
import { moveToTrash } from '@/lib/filesystem/trash';

/**
 * Simple MIME type lookup by file extension
 * @param {string} filename
 * @returns {string}
 */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.avif': 'image/avif',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.csv': 'text/csv',
    '.md': 'text/markdown',
    '.zip': 'application/zip',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * GET /api/files/[...path] - Read file content, get metadata, or download file
 * Query: ?action=read | ?action=metadata | ?action=download (default: metadata)
 */
export async function GET(request, { params }) {
  try {
    const { path: pathSegments } = await params;
    const filePath = pathSegments.join('/');
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'metadata';

    if (action === 'read') {
      const content = await readFile(filePath);
      return NextResponse.json({ success: true, data: { content, path: filePath } });
    }

    if (action === 'download') {
      const { absolutePath } = await validatePath(filePath);
      const stats = await fs.promises.stat(absolutePath);
      
      if (stats.isDirectory()) {
        throw Object.assign(new Error('Cannot download a directory'), { status: 400 });
      }

      const fileName = path.basename(filePath);
      const mimeType = getMimeType(fileName);
      
      // Use fs.createReadStream for efficient streaming
      const readStream = fs.createReadStream(absolutePath);
      const readableStream = new ReadableStream({
        start(controller) {
          readStream.on('data', (chunk) => {
            controller.enqueue(new Uint8Array(chunk));
          });
          readStream.on('end', () => {
            controller.close();
          });
          readStream.on('error', (err) => {
            controller.error(err);
          });
        },
        cancel() {
          readStream.destroy();
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': stats.size.toString(),
        },
      });
    }

    const metadata = await getMetadata(filePath);
    return NextResponse.json({ success: true, data: metadata });
  } catch (error) {
    console.error('GET /api/files/[...path] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/files/[...path] - Update file content or rename
 * Body: { action: 'write' | 'rename', content?: string, newPath?: string }
 */
export async function PUT(request, { params }) {
  try {
    const { path: pathSegments } = await params;
    const filePath = pathSegments.join('/');
    const body = await request.json();
    const { action, content, newPath } = body;

    let result;
    if (action === 'rename' && newPath) {
      result = await renameItem(filePath, newPath);
    } else if (action === 'copy' && newPath) {
      result = await copyItem(filePath, newPath);
    } else {
      result = await writeFile(filePath, content ?? '');
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('PUT /api/files/[...path] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/files/[...path] - Move file or directory to trash
 */
export async function DELETE(request, { params }) {
  try {
    const { path: pathSegments } = await params;
    const filePath = pathSegments.join('/');
    const { absolutePath } = await validatePath(filePath);
    
    const trashInfo = await moveToTrash(absolutePath);
    return NextResponse.json({ 
      success: true, 
      data: { 
        trashed: true, 
        ...trashInfo 
      } 
    });
  } catch (error) {
    console.error('DELETE /api/files/[...path] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
