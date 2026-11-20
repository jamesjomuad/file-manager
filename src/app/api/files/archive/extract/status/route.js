import { NextResponse } from 'next/server';
import { getOperation } from '@/lib/archive/operation-store';

/**
 * GET /api/files/archive/extract/status?operationId={id}
 * 
 * Returns the current status of an extraction operation.
 * This is a simple REST endpoint for checking status without SSE.
 */
export async function GET(request) {
  try {
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

    // Calculate progress percentage
    const progressPercent = operation.totalEntries > 0
      ? Math.round((operation.processedEntries / operation.totalEntries) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      operationId: operation.id,
      status: operation.status,
      archiveName: operation.archiveName,
      destPath: operation.destPath,
      totalEntries: operation.totalEntries,
      processedEntries: operation.processedEntries,
      extractedFiles: operation.extractedFiles,
      skippedFiles: operation.skippedFiles,
      currentEntry: operation.currentEntry,
      totalBytes: operation.totalBytes,
      extractedBytes: operation.extractedBytes,
      progressPercent,
      errors: operation.errors || [],
      startedAt: operation.startedAt,
      completedAt: operation.completedAt,
    });
  } catch (error) {
    console.error('GET /api/files/archive/extract/status error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get operation status' },
      { status: error.status || 500 }
    );
  }
}
