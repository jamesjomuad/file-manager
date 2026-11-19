'use client';

import { useState, useCallback, useEffect } from 'react';
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
 * Extract dialog — extract a ZIP archive to a destination
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether dialog is visible
 * @param {string} props.archivePath - Path to the archive
 * @param {string} props.archiveName - Name of the archive for display
 * @param {string[]} [props.selectedEntries] - Specific entries to extract
 * @param {string} props.currentPath - Current directory (default destination)
 * @param {() => void} props.onClose - Close callback
 * @param {(result: Object) => void} props.onComplete - Success callback
 */
export function ExtractDialog({
  open,
  archivePath,
  archiveName,
  selectedEntries,
  currentPath,
  onClose,
  onComplete,
}) {
  const [destPath, setDestPath] = useState(currentPath || '');
  const [conflictStrategy, setConflictStrategy] = useState('skip');
  const [preserveStructure, setPreserveStructure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [archiveInfo, setArchiveInfo] = useState(null);
  const [folders, setFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(false);

  // Reset state when opened
  const resetState = useCallback(() => {
    setDestPath(currentPath || '');
    setConflictStrategy('skip');
    setPreserveStructure(true);
    setLoading(false);
    setError(null);
    setResult(null);
    setArchiveInfo(null);
    setFolders([]);
  }, [currentPath]);

  // Load archive info
  useEffect(() => {
    if (!open || !archivePath) return;
    
    async function loadInfo() {
      try {
        setFetchingInfo(true);
        const response = await fetch(
          `/api/files/archive?path=${encodeURIComponent(archivePath)}`
        );
        if (response.ok) {
          const data = await response.json();
          setArchiveInfo(data.data);
        }
      } catch (err) {
        console.error('Failed to load archive info:', err);
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

  if (!open) return null;

  /**
   * Handle extraction
   */
  const handleExtract = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

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

      setResult(data.data);
      onComplete?.(data.data);
    } catch (err) {
      setError(err.message || 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background-overlay/80"
        onClick={handleClose}
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
                Extract Archive
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
            aria-label="Close"
          />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Archive info */}
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

          {/* Success state */}
          {result ? (
            <div className="rounded-xl bg-background-success-subtle border border-border-success p-4">
              <div className="flex items-start gap-3">
                <RiCheckboxCircleLine className="w-5 h-5 text-text-success mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-body-medium text-text-success mb-1">
                    Extraction complete
                  </div>
                  <div className="text-caption-1-regular text-text-secondary space-y-0.5">
                    <div>Extracted: {result.extracted} file{result.extracted !== 1 ? 's' : ''}</div>
                    {result.skipped > 0 && (
                      <div>Skipped: {result.skipped} file{result.skipped !== 1 ? 's' : ''}</div>
                    )}
                    {result.errors?.length > 0 && (
                      <div className="text-text-error">
                        {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  {result.errors?.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-caption-2-regular text-text-error cursor-pointer">
                        Show errors
                      </summary>
                      <div className="mt-1 space-y-0.5">
                        {result.errors.map((err, i) => (
                          <div key={i} className="text-caption-2-regular text-text-error">
                            {err}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-button-default shrink-0">
          {result ? (
            <Button
              variant="primary"
              size="medium"
              onClick={handleClose}
            >
              Done
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
                {loading ? 'Extracting...' : 'Extract'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
