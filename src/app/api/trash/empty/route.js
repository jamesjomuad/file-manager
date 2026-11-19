import { NextResponse } from 'next/server';
import { emptyTrash } from '@/lib/filesystem/trash';

/**
 * DELETE /api/trash/empty - Permanently delete all items in trash
 */
export async function DELETE() {
  try {
    const result = await emptyTrash();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('DELETE /api/trash/empty error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
