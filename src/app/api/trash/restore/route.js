import { NextResponse } from 'next/server';
import { restoreFromTrash } from '@/lib/filesystem/trash';

/**
 * POST /api/trash/restore - Restore an item from trash
 * Body: { trashName: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { trashName } = body;

    if (!trashName) {
      return NextResponse.json(
        { success: false, error: 'trashName is required' },
        { status: 400 }
      );
    }

    const result = await restoreFromTrash(trashName);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('POST /api/trash/restore error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
