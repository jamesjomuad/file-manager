'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { cx } from '@/utils/cx';
import { Button } from '@/components/base/buttons/button';
import {
  RiFolderDownloadLine,
  RiCloseLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiFolderLine,
  RiLoaderLine,
  RiFileLine,
  RiStopCircleLine,
  RiTimerLine,
} from '@remixicon/react';
import { formatFileSize } from '@/lib/filesystem/utils';

/**
 * Conflict resolution strategy options
 */
const CONFLICT_OPTIONS = [
  { value: 'skip', label: 'Skip', description: 'Skip files that already exist' },
  { value: 'replace', label: 'Replace', description: 'Overwrite existing files' },
  { value: 'rename', label: 'Rename', description: 'Rename conflicts (e.g., file (1).txt)' },
  { value: 'keepBoth', label: 'Keep Both', description: 'Keep both files' },
];

/**
 * Format elapsed time in human-readable format
 * @param {number} ms - Milliseconds
 * @returns {string}
 */
function formatElapsedTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Status label mapping
 */
const STATUS_LABELS = {
  preparing: 'Preparing...',
  extracting: 'Extracting...',
  finalizing: 'Finalizing...',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

/**
 * Status icon color mapping
 */
const STATUS_COLORS = {
  preparing: 'text-accent-500',
  extracting: 'text-accent-500',
  finalizing: 'text-accent-500',
  completed: 'text-text-success',
  failed: 'text-text-error',
  cancelled: 'text-text-warning',
};

/**
 * Extract dialog with real-time progress tracking
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether dialog is visible
 * @param {string} props.archivePath - Path to the archive
 * @param {string} props.archiveName - Name of the archive for display
 * @param {string[]} [props.selectedEntries] - Specific entries to extract
 * @param {string} props.currentPath - Current directory (default destination)
 * @param {boolean} [props.autoExtract=false] - Skip config and extract immediately
 * @param {() => void} props.onClose - Close callback
 * @param {(result: Object) => void} props.onComplete - Success callback
 */
export function ExtractDialog({
  open,
  archivePath,
  archiveName,
  selectedEntries,
  currentPath,
  autoExtract = false,
  onClose,
  onComplete,
}) {
  const [destPath, setDestPath] = useState(currentPath || '');
  const [conflictStrategy, setConflictStrategy] = useState('skip');
  const [preserveStructure, setPreserveStructure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [error, setError] = useState(null);
  const [archiveInfo, setArchiveInfo] = useState(null);
  const [folders, setFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  
  // Progress state
  const [operationId, setOperationId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  
  // Refs
  const eventSourceRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Reset state when opened
  const resetState = useCallback(() => {
    setDestPath(currentPath || '');
    setConflictStrategy('skip');
    setPreserveStructure(true);
    setLoading(false);
    setError(null);
    setArchiveInfo(null);
    setFolders([]);
    setOperationId(null);
    setProgress(null);
    setCancelling(false);
  }, [currentPath]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      // Clean up event source
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      resetState();
    }
  }, [open, resetState]);

  // Load archive info
  useEffect(() => {
    if (!open || !archivePath) return;
    
    async function loadInfo() {
      try {
        setFetchingInfo(true);
        const response = await fetch(
          `/api/files/archive?path=${encodeURIComponent(archivePath)}`
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to read archive');
        }
        
        const data = await response.json();
        setArchiveInfo(data.data);
      } catch (err) {
        console.error('Failed to load archive info:', err);
        setError(err.message || 'Failed to read archive');
      } finally {
        setFetchingInfo(false);
      }
    }
    
    loadInfo();
  }, [open, archivePath]);

  // Load folders for destination picker
  useEffect(() => {
    if (!open) return;
    
    async function loadFolders() {
      try {
        setLoadingFolders(true);
        const response = await fetch('/api/files?path=&type=directory');
        if (response.ok) {
          const data = await response.json();
          setFolders(data.data?.files?.filter(f => f.type === 'directory') || []);
        }
      } catch (err) {
        console.error('Failed to load folders:', err);
      } finally {
        setLoadingFolders(false);
      }
    }
    
    loadFolders();
  }, [open]);

  // Subscribe to progress updates via SSE
  const subscribeToProgress = useCallback((opId) => {
    const url = `/api/files/archive/extract?operationId=${encodeURIComponent(opId)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'end') {
          eventSource.close();
          eventSourceRef.current = null;
          return;
        }
        
        if (data.type === 'heartbeat') {
          // Just keep connection alive
          return;
        }
        
        if (data.type === 'progress') {
          setProgress(data);
          
          // If terminal state, close connection
          if (['completed', 'failed', 'cancelled'].includes(data.status)) {
            eventSource.close();
            eventSourceRef.current = null;
            
            if (data.status === 'completed') {
              onComplete?.({
                extracted: data.extractedFiles,
                skipped: data.skippedFiles,
                errors: data.errors,
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to parse progress event:', err);
      }
    };

    eventSource.onerror = () => {
      console.error('SSE connection error');
      eventSource.close();
      eventSourceRef.current = null;
      
      // Check if operation is still running
      setTimeout(async () => {
        try {
          const response = await fetch(`/api/files/archive/extract?operationId=${opId}`);
          if (response.ok) {
            const data = await response.json();
            setProgress(data);
          }
        } catch {
          // Ignore reconnection errors
        }
      }, 1000);
    };
  }, [onComplete]);

  if (!open) return null;

  /**
   * Handle extraction start
   */
  const handleExtract = async () => {
    setLoading(true);
    setError(null);
    setProgress(null);

    try {
      const response = await fetch('/api/files/archive/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archivePath,
          destPath: destPath || '.',
          entries: selectedEntries,
          conflictStrategy,
          preserveStructure,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Extraction failed');
      }

      // Store operation ID and subscribe to progress
      setOperationId(data.operationId);
      subscribeToProgress(data.operationId);
    } catch (err) {
      setError(err.message || 'Extraction failed');
      setLoading(false);
    }
  };

  // Auto-extract when autoExtract is true (skip config, extract immediately)
  useEffect(() => {
    if (open && autoExtract && !loading && !operationId) {
      handleExtract();
    }
  }, [open, autoExtract]);

  /**
   * Handle cancellation
   */
  const handleCancel = async () => {
    if (!operationId || cancelling) return;
    
    setCancelling(true);
    
    try {
      const response = await fetch('/api/files/archive/extract/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationId }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel');
      }
    } catch (err) {
      console.error('Cancellation failed:', err);
      setError(err.message || 'Failed to cancel extraction');
    } finally {
      setCancelling(false);
    }
  };

  const handleClose = () => {
    // If operation is running, cancel it first
    if (operationId && progress && !['completed', 'failed', 'cancelled'].includes(progress.status)) {
      handleCancel();
    }
    onClose();
  };

  // Determine if we're in progress mode
  const isExtracting = loading || (operationId && progress && !['completed', 'failed', 'cancelled'].includes(progress.status));
  const isTerminal = progress && ['completed', 'failed', 'cancelled'].includes(progress.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background-overlay/80"
        onClick={isTerminal ? handleClose : undefined}
      />

      {/* Dialog */}
      <div
        className={cx(
          'relative z-10 max-w-lg w-full mx-4 rounded-3xl',
          'bg-background-primary-default border border-border-button-default',
          'shadow-xl overflow-hidden max-h-[90vh] flex flex-col'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-button-default shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent-500/10">
              <RiFolderDownloadLine className="w-5 h-5 text-accent-500" />
            </div>
            <div>
              <h3 className="text-title-3-semibold text-text-primary">
                {isExtracting || isTerminal ? 'Extracting Archive' : 'Extract Archive'}
              </h3>
              <p className="text-caption-1-regular text-text-secondary">
                {archiveName}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="small"
            iconOnly
            leadingIcon={RiCloseLine}
            onClick={handleClose}
            disabled={isExtracting && !isTerminal}
            aria-label="Close"
          />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Archive info (only show when not extracting) */}
          {!isExtracting && !isTerminal && !autoExtract && (
            <>
              {fetchingInfo ? (
                <div className="flex items-center gap-2 text-caption-1-regular text-text-tertiary">
                  <RiLoaderLine className="w-4 h-4 animate-spin" />
                  Reading archive...
                </div>
              ) : archiveInfo ? (
                <div className="rounded-xl bg-background-secondary-default p-3">
                  <div className="grid grid-cols-2 gap-2 text-caption-1-regular">
                    <div>
                      <span className="text-text-tertiary">Files:</span>{' '}
                      <span className="text-text-primary">{archiveInfo.totalFiles}</span>
                    </div>
                    <div>
                      <span className="text-text-tertiary">Folders:</span>{' '}
                      <span className="text-text-primary">{archiveInfo.totalDirs}</span>
                    </div>
                    <div>
                      <span className="text-text-tertiary">Size:</span>{' '}
                      <span className="text-text-primary">{archiveInfo.totalSizeFormatted}</span>
                    </div>
                    <div>
                      <span className="text-text-tertiary">Compression:</span>{' '}
                      <span className="text-text-primary">{archiveInfo.compressionRatio}</span>
                    </div>
                  </div>
                  {selectedEntries && (
                    <div className="mt-2 text-caption-2-regular text-text-tertiary">
                      Extracting {selectedEntries.length} selected entries
                    </div>
                  )}
                </div>
              ) : null}

              {/* Destination */}
              <div className="space-y-1.5">
                <label className="text-body-regular text-text-primary">
                  Extract to
                </label>
                <div className={cx(
                  'flex items-center gap-2 px-3 py-2 rounded-xl',
                  'bg-background-primary-default border border-border-button-default'
                )}>
                  <RiFolderLine className="w-4 h-4 text-foreground-icon-secondary shrink-0" />
                  <input
                    type="text"
                    value={destPath}
                    onChange={(e) => setDestPath(e.target.value)}
                    placeholder="Current directory"
                    disabled={loading}
                    className={cx(
                      'flex-1 bg-transparent text-body-regular text-text-primary',
                      'placeholder:text-text-tertiary',
                      'focus:outline-none',
                      'disabled:opacity-50'
                    )}
                  />
                </div>
                {/* Quick folder picker */}
                {loadingFolders ? (
                  <div className="flex items-center gap-2 text-caption-2-regular text-text-tertiary">
                    <RiLoaderLine className="w-3 h-3 animate-spin" />
                    Loading folders...
                  </div>
                ) : folders.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDestPath('')}
                      className={cx(
                        'px-2 py-0.5 rounded-lg text-caption-2-regular transition-colors',
                        !destPath
                          ? 'bg-accent-500 text-white'
                          : 'bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover'
                      )}
                    >
                      Root
                    </button>
                    {folders.slice(0, 8).map(folder => (
                      <button
                        key={folder.path}
                        type="button"
                        onClick={() => setDestPath(folder.path)}
                        className={cx(
                          'px-2 py-0.5 rounded-lg text-caption-2-regular transition-colors truncate max-w-[120px]',
                          destPath === folder.path
                            ? 'bg-accent-500 text-white'
                            : 'bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover'
                        )}
                      >
                        {folder.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Conflict resolution */}
              <div className="space-y-1.5">
                <label className="text-body-regular text-text-primary">
                  If files exist
                </label>
                <div className="space-y-1">
                  {CONFLICT_OPTIONS.map(opt => (
                    <label
                      key={opt.value}
                      className={cx(
                        'flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                        'hover:bg-background-secondary-hover'
                      )}
                    >
                      <input
                        type="radio"
                        name="conflictStrategy"
                        value={opt.value}
                        checked={conflictStrategy === opt.value}
                        onChange={() => setConflictStrategy(opt.value)}
                        disabled={loading}
                        className="mt-0.5 w-4 h-4 border-border-button-default text-accent-500 focus:ring-border-focus-ring"
                      />
                      <div>
                        <div className="text-caption-1-semibold text-text-primary">
                          {opt.label}
                        </div>
                        <div className="text-caption-2-regular text-text-tertiary">
                          {opt.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Preserve structure */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveStructure}
                  onChange={(e) => setPreserveStructure(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 rounded border-border-button-default text-accent-500 focus:ring-border-focus-ring"
                />
                <div>
                  <span className="text-body-regular text-text-primary">
                    Preserve folder structure
                  </span>
                  <div className="text-caption-2-regular text-text-tertiary">
                    Uncheck to extract all files flat
                  </div>
                </div>
              </label>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-background-error-subtle border border-border-error p-3">
                  <RiErrorWarningLine className="w-4 h-4 text-text-error mt-0.5 shrink-0" />
                  <span className="text-caption-1-regular text-text-error">
                    {error}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Progress view */}
          {(isExtracting || isTerminal) && progress && (
            <ProgressView progress={progress} />
          )}

          {/* Auto-extract loading state (waiting for first progress event) */}
          {autoExtract && isExtracting && !progress && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <RiLoaderLine className="w-8 h-8 animate-spin text-accent-500" />
              <div className="text-body-medium text-text-primary">
                Starting extraction...
              </div>
              <div className="text-caption-1-regular text-text-tertiary">
                {archiveName}
              </div>
            </div>
          )}

          {/* Auto-extract error state */}
          {autoExtract && !isExtracting && !isTerminal && error && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <RiErrorWarningLine className="w-8 h-8 text-text-error" />
              <div className="text-body-medium text-text-error">
                Extraction failed
              </div>
              <div className="text-caption-1-regular text-text-secondary text-center max-w-xs">
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-button-default shrink-0">
          {isTerminal ? (
            <Button
              variant="primary"
              size="medium"
              onClick={handleClose}
            >
              Done
            </Button>
          ) : isExtracting ? (
            <>
              <Button
                variant="ghost"
                size="medium"
                leadingIcon={RiStopCircleLine}
                onClick={handleCancel}
                disabled={cancelling || !operationId}
              >
                {cancelling ? 'Cancelling...' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                size="medium"
                disabled
                leadingIcon={RiLoaderLine}
              >
                {progress?.status === 'preparing' ? 'Preparing...' : 'Extracting...'}
              </Button>
            </>
          ) : autoExtract && error ? (
            <Button
              variant="primary"
              size="medium"
              onClick={handleClose}
            >
              Close
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="medium"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="medium"
                leadingIcon={RiFolderDownloadLine}
                onClick={handleExtract}
                disabled={loading}
              >
                Extract
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Progress view component showing real-time extraction status
 * 
 * @param {Object} props
 * @param {Object} props.progress - Progress data from SSE
 */
function ProgressView({ progress }) {
  const {
    status,
    totalEntries,
    processedEntries,
    extractedFiles,
    skippedFiles,
    currentEntry,
    totalBytes,
    extractedBytes,
    elapsedMs,
    errors,
    progressPercent,
  } = progress;

  const statusColor = STATUS_COLORS[status] || 'text-accent-500';
  const statusLabel = STATUS_LABELS[status] || 'Processing...';

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="flex items-center gap-3">
        {status === 'extracting' && (
          <RiLoaderLine className={cx('w-6 h-6 animate-spin', statusColor)} />
        )}
        {status === 'completed' && (
          <RiCheckboxCircleLine className={cx('w-6 h-6', statusColor)} />
        )}
        {status === 'failed' && (
          <RiErrorWarningLine className={cx('w-6 h-6', statusColor)} />
        )}
        {['preparing', 'finalizing'].includes(status) && (
          <RiLoaderLine className={cx('w-6 h-6 animate-spin', statusColor)} />
        )}
        {status === 'cancelled' && (
          <RiErrorWarningLine className={cx('w-6 h-6', statusColor)} />
        )}
        <div className="flex-1">
          <div className={cx('text-body-medium font-semibold', statusColor)}>
            {statusLabel}
          </div>
          <div className="text-caption-1-regular text-text-secondary">
            <RiTimerLine className="w-3 h-3 inline me-1" />
            {formatElapsedTime(elapsedMs)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-caption-1-regular">
          <span className="text-text-secondary">Progress</span>
          <span className="text-text-primary font-semibold">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 bg-background-secondary-default rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="rounded-xl bg-background-secondary-default p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-caption-1-regular">
          <div>
            <span className="text-text-tertiary">Files extracted:</span>{' '}
            <span className="text-text-primary font-medium">{extractedFiles}</span>
          </div>
          <div>
            <span className="text-text-tertiary">Progress:</span>{' '}
            <span className="text-text-primary font-medium">
              {processedEntries} / {totalEntries}
            </span>
          </div>
          {skippedFiles > 0 && (
            <div>
              <span className="text-text-tertiary">Skipped:</span>{' '}
              <span className="text-text-primary font-medium">{skippedFiles}</span>
            </div>
          )}
          {totalBytes > 0 && (
            <div>
              <span className="text-text-tertiary">Size:</span>{' '}
              <span className="text-text-primary font-medium">
                {formatFileSize(extractedBytes)} / {formatFileSize(totalBytes)}
              </span>
            </div>
          )}
        </div>

        {/* Current file */}
        {currentEntry && status === 'extracting' && (
          <div className="pt-2 border-t border-border-divider">
            <div className="text-caption-2-regular text-text-tertiary mb-1">
              Current file:
            </div>
            <div className="text-caption-1-regular text-text-primary truncate flex items-center gap-1.5">
              <RiFileLine className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{currentEntry}</span>
            </div>
          </div>
        )}
      </div>

      {/* Errors */}
      {errors && errors.length > 0 && (
        <div className="rounded-xl bg-background-error-subtle border border-border-error p-3">
          <div className="flex items-start gap-2">
            <RiErrorWarningLine className="w-4 h-4 text-text-error mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="text-caption-1-semibold text-text-error mb-1">
                {errors.length} error{errors.length !== 1 ? 's' : ''} occurred
              </div>
              <details>
                <summary className="text-caption-2-regular text-text-error cursor-pointer">
                  Show details
                </summary>
                <div className="mt-2 space-y-1">
                  {errors.map((err, i) => (
                    <div key={i} className="text-caption-2-regular text-text-error">
                      {err}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
