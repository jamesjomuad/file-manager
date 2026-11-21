import { NextResponse } from 'next/server';
import { scanFilesystem, cancelScan, getCachedResult, invalidateCache } from '@/lib/insights/scanner';

/**
 * In-progress scan state.
 * @type {Map<string, {promise: Promise, progress: Object|null, done: boolean, error: string|null}>}
 */
const runningScans = new Map();

/**
 * GET /api/insights/scan
 *
 * Returns cached scan result or triggers a new scan.
 * Query params:
 *   - refresh=true: Force a fresh scan
 *   - progress=<scanId>: SSE stream for scan progress
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get('refresh') === 'true';
  const progressScanId = searchParams.get('progress');

  // SSE progress stream for an in-progress scan
  if (progressScanId) {
    const scan = runningScans.get(progressScanId);
    if (!scan) {
      return NextResponse.json(
        { success: false, error: 'Scan not found or already completed' },
        { status: 404 }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Send initial state
        send({ type: 'progress', ...scan.progress });

        // Poll for progress updates
        const interval = setInterval(() => {
          if (scan.progress) {
            send({ type: 'progress', ...scan.progress });
          }
        }, 200);

        try {
          const result = await scan.promise;
          clearInterval(interval);
          send({ type: 'complete', result });
          send({ type: 'done' });
          runningScans.delete(progressScanId);
          controller.close();
        } catch (err) {
          clearInterval(interval);
          send({ type: 'error', error: err.message });
          send({ type: 'done' });
          runningScans.delete(progressScanId);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  // Return cached result or signal that a scan is needed
  if (!refresh) {
    const cached = getCachedResult('default');
    if (cached) {
      return NextResponse.json({
        success: true,
        data: { ...cached, scanMeta: { ...cached.scanMeta, cached: true } },
      });
    }
    // No cache - tell the client to start a scan via POST
    return NextResponse.json({
      success: false,
      needsScan: true,
      message: 'No cached data. Start a scan to get insights.',
    });
  }

  // GET without cache - signal that a scan is needed
  return NextResponse.json({
    success: false,
    needsScan: true,
    message: 'No cached data. Start a scan to get insights.',
  });
}

/**
 * POST /api/insights/scan
 *
 * Start a scan with SSE progress streaming.
 * Body: { refresh?: boolean, skipDuplicates?: boolean }
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { refresh = false, skipDuplicates = false } = body;

    // If not refreshing and we have cache, return immediately
    if (!refresh) {
      const cached = getCachedResult('default');
      if (cached) {
        return NextResponse.json({
          success: true,
          data: { ...cached, scanMeta: { ...cached.scanMeta, cached: true } },
        });
      }
    }

    const scanId = `scan-${Date.now()}`;
    const scanState = {
      progress: {
        filesScanned: 0,
        dirsScanned: 0,
        currentPath: 'Starting scan...',
        phase: 'scanning',
      },
      done: false,
      error: null,
    };

    const promise = scanFilesystem({
      forceFresh: refresh,
      skipDuplicates,
      onProgress: (progress) => {
        scanState.progress = progress;
      },
    });

    scanState.promise = promise;
    runningScans.set(scanId, scanState);

    // Return SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            // Stream already closed
          }
        };

        // Send initial progress
        send({ type: 'progress', scanId, ...scanState.progress });

        // Poll for updates
        const interval = setInterval(() => {
          send({ type: 'progress', scanId, ...scanState.progress });
        }, 250);

        try {
          const result = await promise;
          clearInterval(interval);
          send({ type: 'complete', scanId, result });
          send({ type: 'done', scanId });
          runningScans.delete(scanId);
          controller.close();
        } catch (err) {
          clearInterval(interval);
          send({ type: 'error', scanId, error: err.message });
          send({ type: 'done', scanId });
          scanState.error = err.message;
          runningScans.delete(scanId);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Scan-Id': scanId,
      },
    });
  } catch (error) {
    console.error('POST /api/insights/scan error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/insights/scan
 *
 * Cancel an active scan or invalidate cache.
 * Body: { scanId?: string, invalidateCache?: boolean }
 */
export async function DELETE(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { scanId, invalidateCache: doInvalidate } = body;

    if (doInvalidate) {
      invalidateCache();
      return NextResponse.json({ success: true, message: 'Cache invalidated' });
    }

    if (scanId) {
      const cancelled = cancelScan(scanId);
      return NextResponse.json({
        success: true,
        cancelled,
        message: cancelled ? 'Scan cancelled' : 'Scan not found',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Provide scanId or invalidateCache: true' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
