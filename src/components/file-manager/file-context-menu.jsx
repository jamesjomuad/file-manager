'use client';

import { useEffect, useRef } from 'react';
import { cx } from '@/utils/cx';
import {
  RiEditLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiDownloadLine,
  RiDraggable,
  RiEyeLine,
  RiImageLine,
  RiCodeBoxLine,
} from '@remixicon/react';
import { isSupportedImageFormat } from '@/lib/image/image-utils';

/**
 * Context menu for file actions
 * @param {Object} props
 * @param {Object} props.file - File being acted on
 * @param {{ x: number, y: number }} props.position - Menu position
 * @param {() => void} props.onClose - Close callback
 * @param {(file: Object) => void} [props.onPreview] - Preview callback
 * @param {(file: Object) => void} [props.onRename] - Rename callback
 * @param {(file: Object) => void} [props.onDelete] - Delete callback
 * @param {(file: Object) => void} [props.onCopy] - Copy callback
 * @param {(file: Object) => void} [props.onMove] - Move callback
 * @param {(file: Object) => void} [props.onDownload] - Download callback (files only)
 * @param {(file: Object) => void} [props.onOpenInEditor] - Open in editor callback
 * @param {(file: Object) => void} [props.onOpenImageViewer] - Open in image viewer callback
 */
export function FileContextMenu({
  file,
  position,
  onClose,
  onPreview,
  onRename,
  onDelete,
  onCopy,
  onMove,
  onDownload,
  onOpenInEditor,
  onOpenImageViewer,
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
    if (menuRef.current && position) {
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
    if (!callback) return;
    callback(file);
    onClose();
  };

  const isFile = file?.type !== 'directory';
  const isImageFile = isFile && isSupportedImageFormat(file?.extension);

  return (
    <div
      ref={menuRef}
      className={cx(
        'fixed z-50 min-w-[180px] py-1 rounded-xl',
        'bg-background-primary-default border border-border-button-default',
        'shadow-lg'
      )}
      style={{ left: position?.x ?? 0, top: position?.y ?? 0 }}
    >
      {/* Open in editor - for text/code files */}
      {isFile && onOpenInEditor && !isImageFile && (
        <button
          onClick={() => handleAction(onOpenInEditor)}
          className={cx(
            'w-full px-3 py-2 flex items-center gap-3 text-start',
            'text-body-regular text-text-primary',
            'hover:bg-background-secondary-hover transition-colors'
          )}
        >
          <RiCodeBoxLine className="w-4 h-4 text-foreground-icon-secondary" />
          <span>Open in Editor</span>
        </button>
      )}

      {/* Open in Image Viewer - for image files */}
      {isImageFile && onOpenImageViewer && (
        <button
          onClick={() => handleAction(onOpenImageViewer)}
          className={cx(
            'w-full px-3 py-2 flex items-center gap-3 text-start',
            'text-body-regular text-text-primary',
            'hover:bg-background-secondary-hover transition-colors'
          )}
        >
          <RiImageLine className="w-4 h-4 text-foreground-icon-secondary" />
          <span>Open in Image Viewer</span>
        </button>
      )}

      {/* Preview - for non-image previewable files */}
      {isFile && onPreview && !isImageFile && (
        <button
          onClick={() => handleAction(onPreview)}
          className={cx(
            'w-full px-3 py-2 flex items-center gap-3 text-start',
            'text-body-regular text-text-primary',
            'hover:bg-background-secondary-hover transition-colors'
          )}
        >
          <RiEyeLine className="w-4 h-4 text-foreground-icon-secondary" />
          <span>Preview</span>
        </button>
      )}

      {/* Rename */}
      {onRename && (
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
      )}

      {/* Copy */}
      {onCopy && (
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
      )}

      {/* Move */}
      {onMove && (
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
      )}

      {/* Download option - only for files, not directories */}
      {isFile && onDownload && (
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

      {/* Delete */}
      {onDelete && (
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
      )}
    </div>
  );
}
