import { NextResponse } from 'next/server';
import path from 'path';
import { listTrash, moveToTrash } from '@/lib/filesystem/trash';
import { validatePath, ROOT_DIR } from '@/lib/filesystem/security';

/**
 * GET /api/trash - List all items in trash
 */
export async function GET() {
  try {
    const items = await listTrash();
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('GET /api/trash error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/trash - Move items to trash
 * 
 * Body: { items: Array<{ path: string, name?: string }> }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'items array is required and must not be empty' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const item of items) {
      try {
        const { absolutePath } = await validatePath(item.path);
        const result = await moveToTrash(absolutePath);
        results.push({
          path: item.path,
          name: item.name || path.basename(item.path),
          ...result,
        });
      } catch (error) {
        errors.push({
          path: item.path,
          name: item.name || path.basename(item.path),
          error: error.message,
        });
      }
    }

    if (results.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { success: false, error: `Failed to move ${errors.length} item(s) to trash`, errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { moved: results.length, errors },
    });
  } catch (error) {
    console.error('POST /api/trash error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
