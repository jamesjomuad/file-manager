'use client';

import { useEffect, useRef } from 'react';
import { cx } from '@/utils/cx';
import { useUploadStore } from '@/stores/upload-store';
import { Button } from '@/components/base/buttons/button';
import {
  RiCloseLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiLoaderLine,
  RiFileLine,
} from '@remixicon/react';

/**
 * Upload queue display component.
 * Shows active uploads with progress bars and status.
 * Auto-hides after all uploads complete successfully.
 */
export function UploadQueue() {
  const { uploadQueue, removeFile, clearCompleted, clearQueue, getStats } = useUploadStore();
  const stats = getStats();
  const autoClearTimerRef = useRef(null);

  // Auto-clear completed uploads after 5 seconds
  useEffect(() => {
    // Clear any existing timer
    if (autoClearTimerRef.current) {
      clearTimeout(autoClearTimerRef.current);
      autoClearTimerRef.current = null;
    }

    // Only auto-clear if ALL items are in a terminal state (complete or error)
    // and there are no active uploads, pending items, or conflicts
    const hasOnlyTerminal = uploadQueue.length > 0 &&
      uploadQueue.every((item) => item.status === 'complete' || item.status === 'error');

    if (hasOnlyTerminal) {
      autoClearTimerRef.current = setTimeout(() => {
        clearQueue();
      }, 5000);
    }

    // Cleanup timer on unmount
    return () => {
      if (autoClearTimerRef.current) {
        clearTimeout(autoClearTimerRef.current);
      }
    };
  }, [uploadQueue, clearQueue]);

  if (uploadQueue.length === 0) return null;

  const hasCompletedOrErrors = stats.complete > 0 || stats.error > 0;

  return (
    <div className="fixed bottom-24 right-4 w-96 max-h-[500px] flex flex-col rounded-2xl bg-background-primary-default shadow-lg border border-border-button-default z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-button-default">
        <div className="flex items-center gap-2">
          <h3 className="text-title-3-semibold text-text-primary">Uploads</h3>
          <span className="text-caption-1-regular text-text-tertiary">
            {stats.uploading > 0 && `${stats.uploading} uploading`}
            {stats.uploading > 0 && (stats.complete > 0 || stats.error > 0) && ', '}
            {stats.complete > 0 && `${stats.complete} complete`}
            {stats.complete > 0 && stats.error > 0 && ', '}
            {stats.error > 0 && `${stats.error} failed`}
          </span>
        </div>
        {hasCompletedOrErrors && (
          <Button variant="ghost" size="sm" onClick={clearCompleted}>
            Clear
          </Button>
        )}
      </div>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {uploadQueue.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-background-secondary-default"
          >
            <RiFileLine className="size-5 text-foreground-icon-secondary shrink-0 mt-0.5" />

            <div className="flex-1 min-w-0">
              <p className="text-body-medium text-text-primary truncate mb-1">
                {item.filename}
              </p>

              {/* Progress bar */}
              {item.status === 'uploading' && (
                <div className="w-full h-1.5 bg-background-primary-default rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full bg-accent-500 transition-all duration-200"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}

              {/* Status text */}
              <div className="flex items-center gap-1.5">
                {item.status === 'pending' && (
                  <>
                    <RiLoaderLine className="size-3.5 text-foreground-icon-tertiary" />
                    <span className="text-caption-1-regular text-text-tertiary">
                      Waiting...
                    </span>
                  </>
                )}
                {item.status === 'uploading' && (
                  <>
                    <RiLoaderLine className="size-3.5 text-foreground-icon-primary animate-spin" />
                    <span className="text-caption-1-regular text-text-secondary">
                      {item.progress}% • Uploading...
                    </span>
                  </>
                )}
                {item.status === 'complete' && (
                  <>
                    <RiCheckLine className="size-3.5 text-success-500" />
                    <span className="text-caption-1-regular text-success-500">
                      Complete
                    </span>
                  </>
                )}
                {item.status === 'error' && (
                  <>
                    <RiErrorWarningLine className="size-3.5 text-error-500" />
                    <span className="text-caption-1-regular text-error-500">
                      {item.error || 'Upload failed'}
                    </span>
                  </>
                )}
                {item.status === 'conflict' && (
                  <>
                    <RiErrorWarningLine className="size-3.5 text-warning-500" />
                    <span className="text-caption-1-regular text-warning-500">
                      Conflict - resolution needed
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Remove button */}
            {(item.status === 'complete' || item.status === 'error') && (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                onClick={() => removeFile(item.id)}
                aria-label="Remove from queue"
              >
                <RiCloseLine className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
