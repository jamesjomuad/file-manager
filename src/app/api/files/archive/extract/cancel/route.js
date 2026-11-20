import { NextResponse } from 'next/server';
import { getOperation, cancelOperation } from '@/lib/archive/operation-store';

/**
 * POST /api/files/archive/extract/cancel — Cancel an extraction operation
 * 
 * Body:
 * - operationId: string — The operation ID to cancel
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { operationId } = body;

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

    // Check if already in terminal state
    if (['completed', 'failed', 'cancelled'].includes(operation.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Operation already ${operation.status}`,
          status: operation.status,
        },
        { status: 409 }
      );
    }

    // Attempt cancellation
    const cancelled = cancelOperation(operationId);

    if (cancelled) {
      return NextResponse.json({
        success: true,
        message: 'Extraction cancelled',
        operationId,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to cancel operation' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('POST /api/files/archive/extract/cancel error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Cancellation failed' },
      { status: 500 }
    );
  }
}
