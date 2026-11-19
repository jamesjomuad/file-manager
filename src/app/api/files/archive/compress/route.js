import { NextResponse } from 'next/server';
import { compressArchive, COMPRESSION_LEVELS } from '@/lib/archive/service';

/**
 * POST /api/files/archive/compress — Create a ZIP archive
 * 
 * Body:
 * - outputPath: string — output path relative to root
 * - items: Array<{ path: string, name?: string }> — files/folders to compress
 * - compressionLevel: 'store' | 'fast' | 'normal' | 'maximum'
 * - includeHidden: boolean — include dotfiles
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      outputPath,
      items,
      compressionLevel = 'normal',
      includeHidden = false,
    } = body;

    // Validation
    if (!outputPath) {
      return NextResponse.json(
        { success: false, error: 'outputPath is required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'items array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!COMPRESSION_LEVELS[compressionLevel]) {
      return NextResponse.json(
        { success: false, error: `Invalid compression level: ${compressionLevel}` },
        { status: 400 }
      );
    }

    // Compress
    const result = await compressArchive({
      outputPath,
      items,
      compressionLevel,
      includeHidden,
      onProgress: (processed, total, currentItem) => {
        // Progress could be tracked via SSE or polling in future
        // For now, compression is synchronous
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.includes('already exists') ? 409 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        ratio: result.ratio,
        outputPath,
      },
    });
  } catch (error) {
    console.error('POST /api/files/archive/compress error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Compression failed' },
      { status: error.status || 500 }
    );
  }
}
