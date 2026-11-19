import { NextResponse } from 'next/server';
import { listTrash } from '@/lib/filesystem/trash';

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
