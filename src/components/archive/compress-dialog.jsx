'use client';

import { useState, useCallback } from 'react';
import { cx } from '@/utils/cx';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Select } from '@/components/base/select/select';
import {
  RiArchiveLine,
  RiCloseLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
} from '@remixicon/react';
import { formatFileSize } from '@/lib/filesystem/utils';

/**
 * Compression levels for the dropdown
 */
const COMPRESSION_OPTIONS = [
  { value: 'store', label: 'Store (no compression)', description: 'Fastest, largest file' },
  { value: 'fast', label: 'Fast', description: 'Quick compression' },
  { value: 'normal', label: 'Normal', description: 'Balanced compression' },
  { value: 'maximum', label: 'Maximum', description: 'Smallest file, slowest' },
];

/**
 * Compress dialog — create a ZIP archive from selected files/folders
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether dialog is visible
 * @param {Array<{path: string, name: string, type: string}>} props.items - Items to compress
 * @param {string} props.currentPath - Current directory path
 * @param {() => void} props.onClose - Close callback
 * @param {(result: Object) => void} props.onComplete - Success callback
 */
export function CompressDialog({
  open,
  items = [],
  currentPath,
  onClose,
  onComplete,
}) {
  const [archiveName, setArchiveName] = useState('archive');
  const [compressionLevel, setCompressionLevel] = useState('normal');
  const [includeHidden, setIncludeHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Reset state when opened
  const resetState = useCallback(() => {
    setArchiveName('archive');
    setCompressionLevel('normal');
    setIncludeHidden(false);
    setLoading(false);
    setError(null);
    setResult(null);
  }, []);

  // Generate suggested name from items
  const suggestedName = items.length === 1
    ? items[0].name.replace(/\.[^.]+$/, '')
    : items.length > 1
    ? `archive-${items.length}-items`
    : 'archive';

  if (!open) return null;

  /**
   * Handle compress submission
   */
  const handleCompress = async () => {
    if (!archiveName.trim()) {
      setError('Archive name is required');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const outputPath = currentPath
        ? `${currentPath}/${archiveName.trim()}.zip`
        : `${archiveName.trim()}.zip`;

      const response = await fetch('/api/files/archive/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outputPath,
          items: items.map(item => ({
            path: item.path,
            name: item.name,
          })),
          compressionLevel,
          includeHidden,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Compression failed');
      }

      setResult(data.data);
      onComplete?.(data.data);
    } catch (err) {
      setError(err.message || 'Compression failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle dialog close with reset
   */
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
          'shadow-xl overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-button-default">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent-500/10">
              <RiArchiveLine className="w-5 h-5 text-accent-500" />
            </div>
            <h3 className="text-title-3-semibold text-text-primary">
              Create Archive
            </h3>
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

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Items summary */}
          <div className="rounded-xl bg-background-secondary-default p-3">
            <div className="text-caption-1-semibold text-text-secondary mb-1">
              {items.length} item{items.length !== 1 ? 's' : ''} to compress
            </div>
            <div className="text-caption-2-regular text-text-tertiary truncate">
              {items.map(i => i.name).join(', ')}
            </div>
          </div>

          {/* Success state */}
          {result ? (
            <div className="rounded-xl bg-background-success-subtle border border-border-success p-4">
              <div className="flex items-start gap-3">
                <RiCheckboxCircleLine className="w-5 h-5 text-text-success mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-body-medium text-text-success mb-1">
                    Archive created successfully
                  </div>
                  <div className="text-caption-1-regular text-text-secondary space-y-0.5">
                    <div>Original: {formatFileSize(result.originalSize)}</div>
                    <div>Compressed: {formatFileSize(result.compressedSize)}</div>
                    <div>Ratio: {result.ratio} reduction</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Archive name */}
              <Input
                label="Archive name"
                value={archiveName}
                onChange={(e) => setArchiveName(e.target.value)}
                placeholder={suggestedName}
                trailingAccessory={<span className="text-caption-1-regular text-text-tertiary pe-2">.zip</span>}
                disabled={loading}
              />

              {/* Compression level */}
              <div className="space-y-1.5">
                <label className="text-body-regular text-text-primary">
                  Compression level
                </label>
                <select
                  value={compressionLevel}
                  onChange={(e) => setCompressionLevel(e.target.value)}
                  disabled={loading}
                  className={cx(
                    'w-full px-3 py-2 rounded-xl text-body-regular',
                    'bg-background-primary-default border border-border-button-default',
                    'text-text-primary',
                    'focus:outline-none focus:ring-2 focus:ring-border-focus-ring',
                    'disabled:opacity-50'
                  )}
                >
                  {COMPRESSION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Include hidden files */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHidden}
                  onChange={(e) => setIncludeHidden(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 rounded border-border-button-default text-accent-500 focus:ring-border-focus-ring"
                />
                <span className="text-body-regular text-text-primary">
                  Include hidden files
                </span>
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-button-default">
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
                leadingIcon={RiArchiveLine}
                onClick={handleCompress}
                disabled={loading || !archiveName.trim()}
              >
                {loading ? 'Compressing...' : 'Create Archive'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
