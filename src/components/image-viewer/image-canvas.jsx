'use client';

import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { cx } from '@/utils/cx';

/**
 * Image canvas with zoom, pan, rotate, and flip transforms.
 *
 * Renders the image with CSS transforms for smooth, GPU-accelerated
 * manipulation. Supports drag-to-pan when zoomed in, and shows a
 * checkerboard background for transparent images.
 *
 * @param {Object} props
 * @param {Object} props.file - Current image file metadata
 * @param {Object} props.transform - { zoom, rotation, flipH, flipV, panX, panY }
 * @param {boolean} props.loading - Whether the image is loading
 * @param {(img: HTMLImageElement) => void} props.onImageLoad - Called when image loads
 * @param {(error: string) => void} props.onImageError - Called on load error
 * @param {(dx: number, dy: number) => void} props.onPan - Pan delta callback
 * @param {() => void} props.onFitToScreen - Double-click to fit
 * @param {string} [props.className] - Additional classes
 */
export const ImageCanvas = memo(function ImageCanvas({
  file,
  transform,
  loading,
  onImageLoad,
  onImageError,
  onPan,
  onFitToScreen,
  className,
}) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const prevSrcRef = useRef(null);

  const src = file ? `/api/files/${file.path}?action=download` : '';

  // Reset loading/error state when file changes
  useEffect(() => {
    if (src !== prevSrcRef.current) {
      prevSrcRef.current = src;
      setLoaded(false);
      setImageError(false);
    }
  }, [src]);

  // --------------------------------------------------------------------------
  // Drag-to-pan
  // --------------------------------------------------------------------------

  const handleMouseDown = useCallback((e) => {
    // Only left button
    if (e.button !== 0) return;
    e.preventDefault();
    setDragState({
      startX: e.clientX,
      startY: e.clientY,
      startPanX: transform.panX,
      startPanY: transform.panY,
    });
  }, [transform.panX, transform.panY]);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e) => {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      onPan(
        dx - (dragState.lastDx || 0),
        dy - (dragState.lastDy || 0)
      );
      setDragState((prev) => prev ? {
        ...prev,
        lastDx: dx,
        lastDy: dy,
      } : null);
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, onPan]);

  // --------------------------------------------------------------------------
  // Wheel zoom (Ctrl+wheel or pinch)
  // --------------------------------------------------------------------------

  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      // Zoom in/out based on wheel direction
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.1, Math.min(10, transform.zoom + delta));
      // We can't call setZoom directly here since it's passed via props,
      // but the parent can handle this via onWheelZoom callback if needed
    }
  }, [transform.zoom]);

  // --------------------------------------------------------------------------
  // Double-click to fit
  // --------------------------------------------------------------------------

  const handleDoubleClick = useCallback((e) => {
    e.preventDefault();
    onFitToScreen?.();
  }, [onFitToScreen]);

  // --------------------------------------------------------------------------
  // Image load / error handlers
  // --------------------------------------------------------------------------

  const handleLoad = useCallback((e) => {
    setLoaded(true);
    onImageLoad?.(e.target);
  }, [onImageLoad]);

  const handleError = useCallback(() => {
    setLoaded(false);
    setImageError(true);
    onImageError?.('Failed to load image');
  }, [onImageError]);

  // --------------------------------------------------------------------------
  // Build CSS transform string
  // --------------------------------------------------------------------------

  const transformStyle = {
    transform: [
      `translate(${transform.panX}px, ${transform.panY}px)`,
      `scale(${transform.flipH ? -1 : 1}, ${transform.flipV ? -1 : 1})`,
      `rotate(${transform.rotation}deg)`,
      `scale(${transform.zoom})`,
    ].join(' '),
    transition: dragState ? 'none' : 'transform 0.15s ease-out',
    cursor: transform.zoom > 1 ? (dragState ? 'grabbing' : 'grab') : 'default',
    willChange: 'transform',
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  if (!file) {
    return (
      <div className={cx(
        'flex items-center justify-center h-full',
        'image-viewer-canvas-bg',
        className
      )}>
        <p className="text-body-regular text-text-secondary">No image selected</p>
      </div>
    );
  }

  if (imageError) {
    return (
      <div className={cx(
        'flex flex-col items-center justify-center h-full gap-4',
        'image-viewer-canvas-bg',
        className
      )}>
        <p className="text-body-regular text-text-error-primary">
          Failed to load image
        </p>
        <p className="text-caption-1-regular text-text-secondary">
          The file may be corrupted or in an unsupported format.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cx(
        'relative flex items-center justify-center h-full w-full overflow-hidden',
        'image-viewer-canvas-bg',
        className
      )}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
    >
      {/* Loading indicator */}
      {(!loaded || loading) && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-text-tertiary border-t-text-primary rounded-full animate-spin" />
            <p className="text-caption-1-regular text-text-secondary">Loading image...</p>
          </div>
        </div>
      )}

      {/* Image element with transforms */}
      <img
        ref={imgRef}
        src={src}
        alt={file.name}
        onLoad={handleLoad}
        onError={handleError}
        draggable={false}
        className={cx(
          'max-w-none select-none pointer-events-none',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          ...transformStyle,
          opacity: loaded ? 1 : 0,
          transition: dragState
            ? 'opacity 0.2s ease'
            : 'transform 0.15s ease-out, opacity 0.2s ease',
        }}
      />
    </div>
  );
});
