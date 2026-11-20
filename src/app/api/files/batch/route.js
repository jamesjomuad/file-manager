import { NextResponse } from 'next/server';
import { moveItems, copyItems } from '@/lib/filesystem/service';

/**
 * POST /api/files/batch - Perform batch file operations
 * Accepts JSON with:
 *   - action: 'move' | 'copy'
 *   - sources: string[] (relative paths)
 *   - destination: string (relative path of target directory)
 *   - conflict: 'skip' | 'replace' | 'rename' (optional, default: 'rename')
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, sources, destination, conflict = 'rename' } = body;

    // Validate required fields
    if (!action || !sources || !destination) {
      return NextResponse.json(
        { error: 'Missing required fields: action, sources, destination' },
        { status: 400 }
      );
    }

    // Validate action
    if (action !== 'move' && action !== 'copy') {
      return NextResponse.json(
        { error: `Invalid action: ${action}. Must be 'move' or 'copy'` },
        { status: 400 }
      );
    }

    // Validate sources is an array
    if (!Array.isArray(sources) || sources.length === 0) {
      return NextResponse.json(
        { error: 'sources must be a non-empty array of paths' },
        { status: 400 }
      );
    }

    // Validate conflict strategy
    if (!['skip', 'replace', 'rename'].includes(conflict)) {
      return NextResponse.json(
        { error: `Invalid conflict strategy: ${conflict}` },
        { status: 400 }
      );
    }

    let result;

    if (action === 'move') {
      result = await moveItems(sources, destination, { conflict });
      return NextResponse.json({
        success: true,
        action: 'move',
        ...result
      });
    } else {
      result = await copyItems(sources, destination, { conflict });
      return NextResponse.json({
        success: true,
        action: 'copy',
        ...result
      });
    }
  } catch (error) {
    console.error('Batch operation error:', error);
    return NextResponse.json(
      { error: error.message || 'Batch operation failed' },
      { status: error.status || 500 }
    );
  }
}
