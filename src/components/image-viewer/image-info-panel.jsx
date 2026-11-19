'use client';

import { memo, useState, useCallback } from 'react';
import { cx } from '@/utils/cx';
import { Button } from '@/components/base/buttons/button';
import {
  RiFileLine,
  RiDownloadLine,
  RiFileCopyLine,
  RiEditLine,
  RiDraggable,
  RiDeleteBinLine,
  RiCheckLine,
  RiCloseLine,
} from '@remixicon/react';
import { formatFileSize } from '@/lib/filesystem/utils';
import { getFormatName } from '@/lib/image/image-utils';
import { formatExifForDisplay, formatDate } from '@/lib/image/image-utils';

/**
 * Image information panel (metadata inspector)
 *
 * Displays file metadata, image dimensions, and EXIF data.
 * Also provides quick file actions (rename, copy, move, delete, download).
 *
 * @param {Object} props
 * @param {Object} props.file - Current file metadata
 * @param {Object|null} props.imageMetadata - Image metadata (dimensions, EXIF)
 * @param {Function} props.onDownload - Download callback
 * @param {Function} props.onRename - Rename callback
 * @param {Function} props.onCopy - Copy callback
 * @param {Function} props.onMove - Move callback
 * @param {Function} props.onDelete - Delete callback
 * @param {Function} props.onClose - Close panel callback
 * @param {string} [props.className] - Additional classes
 */
export const ImageInfoPanel = memo(function ImageInfoPanel({
  file,
  imageMetadata,
  onDownload,
  onRename,
  onCopy,
  onMove,
  onDelete,
  onClose,
  className,
}) {
  const [copyPathState, setCopyPathState] = useState('idle');

  /**
   * Copy file path to clipboard
   */
  const handleCopyPath = useCallback(async () => {
    if (copyPathState === 'copying' || !file) return;
    try {
      setCopyPathState('copying');
      await navigator.clipboard.writeText(file.path || file.name);
      setCopyPathState('copied');
      setTimeout(() => setCopyPathState('idle'), 2000);
    } catch {
      setCopyPathState('error');
      setTimeout(() => setCopyPathState('idle'), 2000);
    }
  }, [file, copyPathState]);

  if (!file) return null;

  const exifEntries = imageMetadata?.exif
    ? formatExifForDisplay(imageMetadata.exif)
    : [];

  return (
    <div
      className={cx(
        'flex flex-col w-80 shrink-0 h-full overflow-hidden',
        'bg-background-primary-default border-s border-border-button-default',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-button-default shrink-0">
        <h3 className="text-caption-1-semibold text-text-primary">
          Image Info
        </h3>
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiCloseLine}
          aria-label="Close info panel"
          onClick={onClose}
        />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* File section */}
        <InfoSection title="File">
          <InfoRow label="Name" value={file.name} truncate />
          <InfoRow label="Format" value={getFormatName(file.extension)} />
          {file.size != null && (
            <InfoRow label="Size" value={formatFileSize(file.size)} />
          )}
          {file.path && (
            <div className="flex items-start justify-between gap-2 py-1.5">
              <span className="text-caption-1-regular text-text-tertiary shrink-0">
                Path
              </span>
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-caption-1-regular text-text-secondary truncate flex-1" title={file.path}>
                  {file.path}
                </span>
                <button
                  onClick={handleCopyPath}
                  className={cx(
                    'shrink-0 p-1 rounded transition-colors',
                    'hover:bg-background-secondary-hover',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring'
                  )}
                  aria-label="Copy file path"
                  title="Copy path"
                >
                  {copyPathState === 'copied' ? (
                    <RiCheckLine className="w-3.5 h-3.5 text-text-success-primary" />
                  ) : (
                    <RiFileCopyLine className="w-3.5 h-3.5 text-text-tertiary" />
                  )}
                </button>
              </div>
            </div>
          )}
        </InfoSection>

        {/* Image dimensions */}
        {imageMetadata && (
          <InfoSection title="Image">
            <InfoRow
              label="Dimensions"
              value={`${imageMetadata.width} × ${imageMetadata.height} px`}
            />
            <InfoRow
              label="Aspect Ratio"
              value={getAspectRatio(imageMetadata.width, imageMetadata.height)}
            />
            <InfoRow
              label="Megapixels"
              value={`${((imageMetadata.width * imageMetadata.height) / 1_000_000).toFixed(1)} MP`}
            />
            {imageMetadata.mimeType && (
              <InfoRow label="MIME Type" value={imageMetadata.mimeType} />
            )}
          </InfoSection>
        )}

        {/* File dates */}
        {(file.createdAt || file.modifiedAt) && (
          <InfoSection title="Dates">
            {file.modifiedAt && (
              <InfoRow label="Modified" value={formatDate(file.modifiedAt)} />
            )}
            {file.createdAt && (
              <InfoRow label="Created" value={formatDate(file.createdAt)} />
            )}
          </InfoSection>
        )}

        {/* EXIF / Camera data */}
        {exifEntries.length > 0 && (
          <InfoSection title="Camera & Capture">
            {exifEntries.map((entry) => (
              <InfoRow
                key={entry.label}
                label={entry.label}
                value={entry.value}
              />
            ))}
          </InfoSection>
        )}

        {/* Actions section */}
        <InfoSection title="Actions">
          <div className="flex flex-col gap-1 pt-1">
            <ActionButton
              icon={RiDownloadLine}
              label="Download"
              onClick={onDownload}
            />
            <ActionButton
              icon={RiEditLine}
              label="Rename"
              onClick={onRename}
            />
            <ActionButton
              icon={RiFileCopyLine}
              label="Copy to..."
              onClick={onCopy}
            />
            <ActionButton
              icon={RiDraggable}
              label="Move to..."
              onClick={onMove}
            />
            <div className="my-1 border-t border-separator-border" />
            <ActionButton
              icon={RiDeleteBinLine}
              label="Move to Trash"
              onClick={onDelete}
              danger
            />
          </div>
        </InfoSection>
      </div>
    </div>
  );
});

/**
 * Collapsible info section
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {React.ReactNode} props.children
 */
function InfoSection({ title, children }) {
  return (
    <div className="px-4 py-3 border-b border-border-button-default">
      <h4 className="text-caption-1-semibold text-text-tertiary uppercase tracking-wider mb-2">
        {title}
      </h4>
      <div>{children}</div>
    </div>
  );
}

/**
 * Single metadata row
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.value
 * @param {boolean} [props.truncate]
 */
function InfoRow({ label, value, truncate: shouldTruncate }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1.5">
      <span className="text-caption-1-regular text-text-tertiary shrink-0">
        {label}
      </span>
      <span className={cx(
        'text-caption-1-regular text-text-secondary text-end',
        shouldTruncate && 'truncate'
      )} title={shouldTruncate ? value : undefined}>
        {value || '—'}
      </span>
    </div>
  );
}

/**
 * Action button in the actions section
 * @param {Object} props
 * @param {React.ComponentType} props.icon
 * @param {string} props.label
 * @param {Function} props.onClick
 * @param {boolean} [props.danger]
 */
function ActionButton({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'w-full px-3 py-2 flex items-center gap-3 text-start rounded-lg',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring',
        danger
          ? 'text-text-error-primary hover:bg-background-error-subtle'
          : 'text-text-primary hover:bg-background-secondary-hover'
      )}
    >
      <Icon className={cx('w-4 h-4', danger ? 'text-text-error-primary' : 'text-foreground-icon-secondary')} />
      <span className="text-caption-1-medium">{label}</span>
    </button>
  );
}

/**
 * Calculate simplified aspect ratio from dimensions
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
function getAspectRatio(width, height) {
  if (!width || !height) return '—';

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const w = width / divisor;
  const h = height / divisor;

  // Cap at reasonable numbers for very large ratios
  if (w > 100 || h > 100) {
    const ratio = width / height;
    return `~${ratio.toFixed(2)}:1`;
  }

  return `${w}:${h}`;
}
