'use client';

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { cx } from '@/utils/cx';
import { ImageCanvas } from './image-canvas';
import { ImageViewerToolbar } from './image-toolbar';
import { ImageInfoPanel } from './image-info-panel';
import { ImageFilmstrip } from './image-filmstrip';
import { useImageViewer } from '@/hooks/use-image-viewer';
import {
  parseExifData,
  getImageMetadata,
  isSupportedImageFormat,
} from '@/lib/image/image-utils';
import { formatFileSize } from '@/lib/filesystem/utils';

/**
 * Premium image viewer component
 *
 * A full-featured image viewing experience inspired by premium desktop
 * image viewers. Supports zoom, pan, rotate, flip, gallery navigation,
 * slideshow, metadata display, and fullscreen mode.
 *
 * @param {Object} props
 * @param {boolean} [props.open] - Whether the viewer is visible (modal mode)
 * @param {Object} props.file - Current image file metadata
 * @param {Object[]} [props.galleryFiles] - All image files in the current directory
 * @param {number} [props.initialIndex] - Initial gallery index (embedded mode)
 * @param {() => void} [props.onClose] - Close callback
 * @param {(index: number) => void} [props.onNavigate] - Navigation callback (embedded mode)
 * @param {boolean} [props.embedded] - Whether viewer is embedded in a tab (not modal)
 * @param {(file: Object) => void} [props.onRename] - Rename callback
 * @param {(file: Object) => void} [props.onCopy] - Copy callback
 * @param {(file: Object) => void} [props.onMove] - Move callback
 * @param {(file: Object) => void} [props.onDelete] - Delete callback
 */
export function ImageViewer({
  open,
  file,
  galleryFiles = [],
  initialIndex,
  onClose,
  onNavigate,
  embedded = false,
  onRename,
  onCopy,
  onMove,
  onDelete,
}) {
  // Filter gallery files to only include supported image formats
  const imageGalleryFiles = useMemo(() => {
    if (!galleryFiles || galleryFiles.length === 0) return [];
    return galleryFiles.filter(
      (f) => f.type !== 'directory' && isSupportedImageFormat(f.extension)
    );
  }, [galleryFiles]);

  const viewer = useImageViewer({
    file,
    galleryFiles: imageGalleryFiles,
    initialIndex: initialIndex || 0,
  });

  const {
    currentFile,
    currentIndex,
    transform,
    isFullscreen,
    showInfoPanel,
    showFilmstrip,
    slideshowActive,
    imageMetadata,
    loading,
    containerRef,
    canGoPrevious,
    canGoNext,
    zoomIn,
    zoomOut,
    actualSize,
    fitToScreen,
    rotateClockwise,
    rotateCounterClockwise,
    flipHorizontal,
    flipVertical,
    pan,
    resetTransform,
    goToPrevious,
    goToNext,
    goToIndex,
    toggleFullscreen,
    toggleSlideshow,
    toggleInfoPanel,
    toggleFilmstrip,
    setImageMetadata,
    setLoading,
    MIN_ZOOM,
    MAX_ZOOM,
  } = viewer;

  // --------------------------------------------------------------------------
  // Image load handler — extract metadata and EXIF data
  // --------------------------------------------------------------------------

  const handleImageLoad = useCallback(async (imgElement) => {
    if (!currentFile) return;

    // Extract basic metadata
    const metadata = getImageMetadata(
      imgElement,
      currentFile.size || 0,
      currentFile.extension
    );

    // Try to load EXIF data for JPEG images
    const ext = (currentFile.extension || '').toLowerCase().replace(/^\./, '');
    if (ext === 'jpg' || ext === 'jpeg') {
      try {
        const response = await fetch(`/api/files/${currentFile.path}?action=download`);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const exif = parseExifData(buffer);
          if (exif) {
            metadata.exif = exif;
          }
        }
      } catch {
        // EXIF parsing is non-critical
      }
    }

    setImageMetadata(metadata);
    setLoading(false);
  }, [currentFile, setImageMetadata, setLoading]);

  const handleImageError = useCallback(() => {
    setLoading(false);
  }, [setLoading]);

  // --------------------------------------------------------------------------
  // Fit to screen (needs container + image size)
  // --------------------------------------------------------------------------

  const handleFitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container || !imageMetadata) {
      resetTransform();
      return;
    }
    const canvasArea = container.querySelector('.image-canvas-container');
    const rect = canvasArea?.getBoundingClientRect();
    if (rect) {
      fitToScreen(
        { width: rect.width, height: rect.height },
        { width: imageMetadata.width, height: imageMetadata.height }
      );
    } else {
      resetTransform();
    }
  }, [containerRef, imageMetadata, fitToScreen, resetTransform]);

  // --------------------------------------------------------------------------
  // Download handler
  // --------------------------------------------------------------------------

  const handleDownload = useCallback(() => {
    if (!currentFile) return;
    const url = `/api/files/${currentFile.path}?action=download`;
    const link = document.createElement('a');
    link.href = url;
    link.download = currentFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentFile]);

  // --------------------------------------------------------------------------
  // Sync gallery navigation back to tab state (embedded mode)
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (embedded && onNavigate) {
      onNavigate(currentIndex);
    }
  }, [embedded, onNavigate, currentIndex]);

  // --------------------------------------------------------------------------
  // Keyboard shortcuts
  // --------------------------------------------------------------------------

  useEffect(() => {
    // In embedded mode, keyboard shortcuts are handled by the workspace
    if (embedded) return;
    if (!open) return;

    const handleKeyDown = (e) => {
      // Don't intercept when typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (canGoPrevious) goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (canGoNext) goToNext();
          break;
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          e.preventDefault();
          actualSize();
          break;
        case 'f':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handleFitToScreen();
          }
          break;
        case 'r':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            rotateClockwise();
          }
          break;
        case 'h':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            flipHorizontal();
          }
          break;
        case 'v':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            flipVertical();
          }
          break;
        case 'i':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleInfoPanel();
          }
          break;
        case ' ':
          e.preventDefault();
          toggleSlideshow();
          break;
        case 'F11':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    embedded,
    open,
    canGoPrevious,
    canGoNext,
    goToPrevious,
    goToNext,
    zoomIn,
    zoomOut,
    actualSize,
    handleFitToScreen,
    rotateClockwise,
    flipHorizontal,
    flipVertical,
    toggleInfoPanel,
    toggleSlideshow,
    toggleFullscreen,
    onClose,
  ]);

  // --------------------------------------------------------------------------
  // Prevent body scroll while viewer is open (modal mode only)
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (embedded) return;
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open, embedded]);

  // --------------------------------------------------------------------------
  // Action callbacks with current file
  // --------------------------------------------------------------------------

  const handleRenameAction = useCallback(() => {
    if (currentFile) onRename?.(currentFile);
  }, [currentFile, onRename]);

  const handleCopyAction = useCallback(() => {
    if (currentFile) onCopy?.(currentFile);
  }, [currentFile, onCopy]);

  const handleMoveAction = useCallback(() => {
    if (currentFile) onMove?.(currentFile);
  }, [currentFile, onMove]);

  const handleDeleteAction = useCallback(() => {
    if (currentFile) onDelete?.(currentFile);
  }, [currentFile, onDelete]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  // In modal mode, require open prop. In embedded mode, just need currentFile.
  if (!embedded && !open) return null;
  if (!currentFile) return null;

  return (
    <div
      ref={containerRef}
      className={cx(
        'flex flex-col h-full',
        'bg-background-primary-default',
        'outline-none',
        !embedded && 'fixed inset-0 z-50'
      )}
      role={embedded ? undefined : "dialog"}
      aria-modal={embedded ? undefined : "true"}
      aria-label={`Image viewer: ${currentFile.name}`}
      tabIndex={-1}
    >
      {/* Toolbar */}
      <ImageViewerToolbar
        transform={transform}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        isFullscreen={isFullscreen}
        slideshowActive={slideshowActive}
        showInfoPanel={showInfoPanel}
        showFilmstrip={showFilmstrip}
        currentIndex={currentIndex}
        gallerySize={imageGalleryFiles.length}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onActualSize={actualSize}
        onFitToScreen={handleFitToScreen}
        onRotateCW={rotateClockwise}
        onRotateCCW={rotateCounterClockwise}
        onFlipH={flipHorizontal}
        onFlipV={flipVertical}
        onReset={resetTransform}
        onPrevious={goToPrevious}
        onNext={goToNext}
        onToggleFullscreen={toggleFullscreen}
        onToggleSlideshow={toggleSlideshow}
        onToggleInfoPanel={toggleInfoPanel}
        onToggleFilmstrip={toggleFilmstrip}
        onDownload={handleDownload}
        onClose={onClose}
      />

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        {/* Canvas area */}
        <div className="flex-1 min-w-0 image-canvas-container">
          <ImageCanvas
            file={currentFile}
            transform={transform}
            loading={loading}
            onImageLoad={handleImageLoad}
            onImageError={handleImageError}
            onPan={pan}
            onFitToScreen={handleFitToScreen}
          />
        </div>

        {/* Info panel (right side) */}
        {showInfoPanel && (
          <ImageInfoPanel
            file={currentFile}
            imageMetadata={imageMetadata}
            onDownload={handleDownload}
            onRename={handleRenameAction}
            onCopy={handleCopyAction}
            onMove={handleMoveAction}
            onDelete={handleDeleteAction}
            onClose={toggleInfoPanel}
          />
        )}
      </div>

      {/* Filmstrip (bottom) */}
      {showFilmstrip && imageGalleryFiles.length > 1 && (
        <ImageFilmstrip
          files={imageGalleryFiles}
          currentIndex={currentIndex}
          onSelect={goToIndex}
        />
      )}
    </div>
  );
}
