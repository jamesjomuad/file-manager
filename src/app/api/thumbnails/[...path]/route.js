import { NextResponse } from 'next/server';
import path from 'path';
import { generateThumbnail, isThumbnailable } from '@/lib/thumbnail/service';
import { validatePath } from '@/lib/filesystem/security';

/**
 * GET /api/thumbnails/[...path]?size=small|medium|large
 *
 * Generates or serves a cached thumbnail for the specified image file.
 * Returns a WebP image buffer with appropriate cache headers.
 */
export async function GET(request, { params }) {
  try {
    const { path: pathSegments } = await params;
    const filePath = pathSegments.join('/');
    const { searchParams } = new URL(request.url);
    const size = searchParams.get('size') || 'medium';

    // Validate size parameter
    if (!['small', 'medium', 'large'].includes(size)) {
      return NextResponse.json(
        { success: false, error: 'Invalid size. Use small, medium, or large.' },
        { status: 400 }
      );
    }

    // Validate extension is supported
    const ext = path.extname(filePath).toLowerCase();
    if (!isThumbnailable(ext)) {
      return NextResponse.json(
        { success: false, error: 'File type not supported for thumbnails' },
        { status: 415 }
      );
    }

    // Validate path exists and is within root
    await validatePath(filePath);

    // Generate thumbnail (uses cache internally)
    const result = await generateThumbnail(filePath, size);

    // Return with caching headers
    // Thumbnails are immutable per (path + mtime + size), so long cache is safe
    return new Response(result.buffer, {
      headers: {
        'Content-Type': result.contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-Thumbnail-Cache': result.cached ? 'hit' : 'miss',
      },
    });
  } catch (error) {
    console.error('GET /api/thumbnails/[...path] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
