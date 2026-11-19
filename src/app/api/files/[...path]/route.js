import { NextResponse } from 'next/server';
import { readFile, writeFile, deleteItem, renameItem, copyItem, getMetadata } from '@/lib/filesystem/service';

/**
 * GET /api/files/[...path] - Read file content or get metadata
 * Query: ?action=read | ?action=metadata (default: metadata)
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
 * DELETE /api/files/[...path] - Delete file or directory
 */
export async function DELETE(request, { params }) {
  try {
    const { path: pathSegments } = await params;
    const filePath = pathSegments.join('/');
    const result = await deleteItem(filePath);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('DELETE /api/files/[...path] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
