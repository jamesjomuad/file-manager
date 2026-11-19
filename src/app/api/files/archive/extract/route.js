import { NextResponse } from 'next/server';
import { extractArchive, CONFLICT_STRATEGIES } from '@/lib/archive/service';

/**
 * POST /api/files/archive/extract — Extract a ZIP archive
 * 
 * Body:
 * - archivePath: string — archive path relative to root
 * - destPath: string — destination directory relative to root
 * - entries?: string[] — specific entries to extract (all if omitted)
 * - conflictStrategy: 'skip' | 'replace' | 'rename' | 'keepBoth'
 * - preserveStructure: boolean — preserve directory structure (default: true)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      archivePath,
      destPath,
      entries,
      conflictStrategy = 'skip',
      preserveStructure = true,
    } = body;

    // Validation
    if (!archivePath) {
      return NextResponse.json(
        { success: false, error: 'archivePath is required' },
        { status: 400 }
      );
    }

    if (!destPath) {
      return NextResponse.json(
        { success: false, error: 'destPath is required' },
        { status: 400 }
      );
    }

    if (!CONFLICT_STRATEGIES[conflictStrategy]) {
      return NextResponse.json(
        { success: false, error: `Invalid conflict strategy: ${conflictStrategy}` },
        { status: 400 }
      );
    }

    // Extract
    const result = await extractArchive({
      archivePath,
      destPath,
      entries,
      conflictStrategy,
      preserveStructure,
    });

    if (!result.success && result.error) {
      return NextResponse.json(
        { success: false, ...result },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('POST /api/files/archive/extract error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Extraction failed' },
      { status: error.status || 500 }
    );
  }
}
