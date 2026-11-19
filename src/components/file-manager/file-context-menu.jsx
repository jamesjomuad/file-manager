'use client';

import { useEffect, useRef } from 'react';
import { cx } from '@/utils/cx';
import {
  RiEditLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiDownloadLine,
  RiDraggable,
} from '@remixicon/react';

/**
 * Context menu for file actions
 * @param {Object} props
 * @param {Object} props.file - File being acted on
 * @param {{ x: number, y: number }} props.position - Menu position
 * @param {() => void} props.onClose - Close callback
 * @param {(file: Object) => void} props.onRename - Rename callback
 * @param {(file: Object) => void} props.onDelete - Delete callback
 * @param {(file: Object) => void} props.onCopy - Copy callback
 * @param {(file: Object) => void} props.onMove - Move callback
 * @param {(file: Object) => void} props.onDownload - Download callback (files only)
 */
export function FileContextMenu({
  file,
  position,
  onClose,
  onRename,
  onDelete,
  onCopy,
  onMove,
  onDownload,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = position.x;
      let adjustedY = position.y;

      if (position.x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 8;
      }
      if (position.y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 8;
      }

      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [position]);

  const handleAction = (callback) => {
    callback(file);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className={cx(
        'fixed z-50 min-w-[180px] py-1 rounded-xl',
        'bg-background-primary-default border border-border-button-default',
        'shadow-lg'
      )}
      style={{ left: position.x, top: position.y }}
    >
      <button
        onClick={() => handleAction(onRename)}
        className={cx(
          'w-full px-3 py-2 flex items-center gap-3 text-start',
          'text-body-regular text-text-primary',
          'hover:bg-background-secondary-hover transition-colors'
        )}
      >
        <RiEditLine className="w-4 h-4 text-foreground-icon-secondary" />
        <span>Rename</span>
      </button>

      <button
        onClick={() => handleAction(onCopy)}
        className={cx(
          'w-full px-3 py-2 flex items-center gap-3 text-start',
          'text-body-regular text-text-primary',
          'hover:bg-background-secondary-hover transition-colors'
        )}
      >
        <RiFileCopyLine className="w-4 h-4 text-foreground-icon-secondary" />
        <span>Copy</span>
      </button>

      <button
        onClick={() => handleAction(onMove)}
        className={cx(
          'w-full px-3 py-2 flex items-center gap-3 text-start',
          'text-body-regular text-text-primary',
          'hover:bg-background-secondary-hover transition-colors'
        )}
      >
        <RiDraggable className="w-4 h-4 text-foreground-icon-secondary" />
        <span>Move</span>
      </button>

      {/* Download option - only for files, not directories */}
      {file?.type !== 'directory' && onDownload && (
        <button
          onClick={() => handleAction(onDownload)}
          className={cx(
            'w-full px-3 py-2 flex items-center gap-3 text-start',
            'text-body-regular text-text-primary',
            'hover:bg-background-secondary-hover transition-colors'
          )}
        >
          <RiDownloadLine className="w-4 h-4 text-foreground-icon-secondary" />
          <span>Download</span>
        </button>
      )}

      <div className="my-1 border-t border-separator-border" />

      <button
        onClick={() => handleAction(onDelete)}
        className={cx(
          'w-full px-3 py-2 flex items-center gap-3 text-start',
          'text-body-regular text-text-error-primary',
          'hover:bg-background-secondary-hover transition-colors'
        )}
      >
        <RiDeleteBinLine className="w-4 h-4" />
        <span>Move to Trash</span>
      </button>
    </div>
  );
}
