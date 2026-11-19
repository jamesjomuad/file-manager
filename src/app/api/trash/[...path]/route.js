import { NextResponse } from 'next/server';
import { permanentDelete } from '@/lib/filesystem/trash';

/**
 * DELETE /api/trash/[...path] - Permanently delete a specific item from trash
 */
export async function DELETE(request, { params }) {
  try {
    const { path: pathSegments } = await params;
    const trashName = pathSegments.join('/');

    if (!trashName) {
      return NextResponse.json(
        { success: false, error: 'Trash item name is required' },
        { status: 400 }
      );
    }

    const result = await permanentDelete(trashName);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('DELETE /api/trash/[...path] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
