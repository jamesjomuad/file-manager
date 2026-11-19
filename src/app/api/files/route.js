import { NextResponse } from 'next/server';
import { listDirectory, createDirectory, writeFile } from '@/lib/filesystem/service';
import { ROOT_DIR } from '@/lib/filesystem/security';

/**
 * GET /api/files?path=... - List directory contents
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dirPath = searchParams.get('path') || '';
    const items = await listDirectory(dirPath);
    return NextResponse.json({ success: true, data: items, rootPath: ROOT_DIR });
  } catch (error) {
    console.error('GET /api/files error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/files - Create file or directory
 * Body: { type: 'file' | 'directory', path: string, content?: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { type, path: itemPath, content } = body;

    if (!itemPath) {
      return NextResponse.json(
        { success: false, error: 'Path is required' },
        { status: 400 }
      );
    }

    let result;
    if (type === 'directory') {
      result = await createDirectory(itemPath);
    } else {
      result = await writeFile(itemPath, content || '');
    }

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error('POST /api/files error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
