import { NextResponse } from 'next/server';
import { extractArchive, CONFLICT_STRATEGIES } from '@/lib/archive/service';
import {
  createOperation,
  getOperation,
  updateOperation,
  cancelOperation,
  addEventListener,
  removeEventListener,
} from '@/lib/archive/operation-store';

/**
 * POST /api/files/archive/extract — Start a ZIP archive extraction
 * 
 * Body:
 * - archivePath: string — archive path relative to root
 * - destPath: string — destination directory relative to root
 * - entries?: string[] — specific entries to extract (all if omitted)
 * - conflictStrategy: 'skip' | 'replace' | 'rename' | 'keepBoth'
 * - preserveStructure: boolean — preserve directory structure (default: true)
 * 
 * Returns: { operationId: string }
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

    // Create operation
    const operation = createOperation({ archivePath, destPath });

    // Start extraction in background (non-blocking)
    runExtraction(operation, {
      entries,
      conflictStrategy,
      preserveStructure,
    });

    // Return immediately with the operation ID
    return NextResponse.json({
      success: true,
      operationId: operation.id,
    });
  } catch (error) {
    console.error('POST /api/files/archive/extract error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Extraction failed' },
      { status: error.status || 500 }
    );
  }
}

/**
 * Run extraction in background and update operation state
 * 
 * @param {Object} operation - The operation object
 * @param {Object} options - Extraction options
 */
async function runExtraction(operation, { entries, conflictStrategy, preserveStructure }) {
  try {
    // Phase: extracting
    updateOperation(operation.id, { status: 'extracting' });

    const result = await extractArchive({
      archivePath: operation.archivePath,
      destPath: operation.destPath,
      entries,
      conflictStrategy,
      preserveStructure,
      operationId: operation.id,
      onProgress: (processed, total, currentItem, extractedBytes, totalBytes) => {
        const currentOp = getOperation(operation.id);
        if (currentOp && !currentOp.cancelToken.cancelled) {
          updateOperation(operation.id, {
            totalEntries: total,
            processedEntries: processed,
            currentEntry: currentItem,
            extractedBytes: extractedBytes || 0,
            totalBytes: totalBytes || 0,
          });
        }
      },
      cancelToken: operation.cancelToken,
    });

    // Check if it was cancelled
    if (operation.cancelToken.cancelled) {
      updateOperation(operation.id, {
        status: 'cancelled',
        processedEntries: result.extracted,
        extractedFiles: result.extracted,
        skippedFiles: result.skipped,
      });
      return;
    }

    // Phase: finalizing
    updateOperation(operation.id, {
      status: 'finalizing',
      processedEntries: result.extracted + result.skipped,
      extractedFiles: result.extracted,
      skippedFiles: result.skipped,
    });

    // Check for errors
    if (!result.success && result.error) {
      updateOperation(operation.id, {
        status: 'failed',
        errors: result.errors || [result.error],
      });
      return;
    }

    // Phase: completed
    updateOperation(operation.id, {
      status: 'completed',
      processedEntries: result.extracted + result.skipped,
      extractedFiles: result.extracted,
      skippedFiles: result.skipped,
      errors: result.errors || [],
    });
  } catch (error) {
    console.error('Background extraction error:', error);
    updateOperation(operation.id, {
      status: 'failed',
      errors: [error.message || 'Extraction failed unexpectedly'],
    });
  }
}

/**
 * GET /api/files/archive/extract?operationId=... — SSE progress stream
 * 
 * Subscribes to real-time progress updates for an extraction operation.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const operationId = searchParams.get('operationId');

  if (!operationId) {
    return NextResponse.json(
      { success: false, error: 'operationId is required' },
      { status: 400 }
    );
  }

  const operation = getOperation(operationId);
  if (!operation) {
    return NextResponse.json(
      { success: false, error: 'Operation not found' },
      { status: 404 }
    );
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state immediately
      const sendEvent = (data) => {
        if (isClosed) return false;
        try {
          const event = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(event));
          return true;
        } catch {
          isClosed = true;
          return false;
        }
      };

      // Send initial operation state
      sendEvent(formatOperationState(operation));

      // If already terminal, send and close
      if (['completed', 'failed', 'cancelled'].includes(operation.status)) {
        controller.close();
        return;
      }

      // Listen for updates
      const listener = (updatedOp) => {
        if (isClosed) return;

        sendEvent(formatOperationState(updatedOp));

        // Close stream on terminal state
        if (['completed', 'failed', 'cancelled'].includes(updatedOp.status)) {
          isClosed = true;
          try {
            // Send a final 'end' event
            const endEvent = `data: ${JSON.stringify({ type: 'end' })}\n\n`;
            controller.enqueue(encoder.encode(endEvent));
            controller.close();
          } catch {
            // Already closed
          }
        }
      };

      addEventListener(operationId, listener);

      // Heartbeat to keep connection alive (every 15 seconds)
      const heartbeatInterval = setInterval(() => {
        if (isClosed) {
          clearInterval(heartbeatInterval);
          return;
        }
        const op = getOperation(operationId);
        if (op && ['completed', 'failed', 'cancelled'].includes(op.status)) {
          clearInterval(heartbeatInterval);
          return;
        }
        sendEvent({ type: 'heartbeat' });
      }, 15000);

      // Cleanup on cancel
      const cleanup = () => {
        isClosed = true;
        clearInterval(heartbeatInterval);
        removeEventListener(operationId, listener);
      };

      // Store cleanup reference
      stream._cleanup = cleanup;
    },
    cancel() {
      isClosed = true;
      if (stream._cleanup) {
        stream._cleanup();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Prevent nginx buffering
    },
  });
}

/**
 * Format operation state for SSE transmission
 * 
 * @param {Object} operation - The operation object
 * @returns {Object} Formatted state for client
 */
function formatOperationState(operation) {
  return {
    type: 'progress',
    operationId: operation.id,
    status: operation.status,
    archiveName: operation.archivePath.split(/[/\\]/).pop(),
    destPath: operation.destPath,
    totalEntries: operation.totalEntries,
    processedEntries: operation.processedEntries,
    extractedFiles: operation.extractedFiles,
    skippedFiles: operation.skippedFiles,
    currentEntry: operation.currentEntry,
    totalBytes: operation.totalBytes,
    extractedBytes: operation.extractedBytes,
    elapsedMs: Date.now() - operation.startTime,
    errors: operation.errors,
    progressPercent: operation.totalEntries > 0
      ? Math.round((operation.processedEntries / operation.totalEntries) * 100)
      : 0,
  };
}
