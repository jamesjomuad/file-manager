'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * @typedef {Object} ImageTransform
 * @property {number} zoom - Zoom level (0.1 to 10)
 * @property {number} rotation - Rotation in degrees (0, 90, 180, 270)
 * @property {boolean} flipH - Flipped horizontally
 * @property {boolean} flipV - Flipped vertically
 * @property {number} panX - Horizontal pan offset
 * @property {number} panY - Vertical pan offset
 */

/**
 * @typedef {Object} ImageViewerState
 * @property {Object} currentFile - Current image file metadata
 * @property {number} currentIndex - Index in gallery
 * @property {Object[]} galleryFiles - Array of image files in the current directory
 * @property {ImageTransform} transform - Current transform state
 * @property {boolean} isFullscreen - Fullscreen mode
 * @property {boolean} showInfoPanel - Metadata inspector visible
 * @property {boolean} showFilmstrip - Thumbnail filmstrip visible
 * @property {boolean} slideshowActive - Slideshow is running
 * @property {number} slideshowInterval - Slideshow interval in ms
 * @property {Object} imageMetadata - Image metadata (dimensions, EXIF)
 * @property {boolean} loading - Image is loading
 */

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.25;
const DEFAULT_SLIDESHOW_INTERVAL = 3000;

/**
 * State management hook for the image viewer.
 *
 * Handles zoom/pan/rotate/flip transforms, gallery navigation,
 * slideshow, fullscreen, and panel visibility.
 *
 * @param {Object} options
 * @param {Object} options.file - Initial file to display
 * @param {Object[]} [options.galleryFiles] - All image files in the directory
 * @param {number} [options.initialIndex] - Initial gallery index
 * @param {boolean} [options.showInfoPanel] - Initial info panel visibility
 * @param {boolean} [options.showFilmstrip] - Initial filmstrip visibility
 * @returns {Object} Image viewer state and actions
 */
export function useImageViewer({
  file,
  galleryFiles = [],
  initialIndex = 0,
  showInfoPanel: initialShowInfoPanel = true,
  showFilmstrip: initialShowFilmstrip = false, // Disabled by default to avoid loading all thumbnails
}) {
  // Transform state
  const [transform, setTransform] = useState({
    zoom: 1,
    rotation: 0,
    flipH: false,
    flipV: false,
    panX: 0,
    panY: 0,
  });

  // Gallery state
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialIndex >= 0 && initialIndex < galleryFiles.length) {
      return initialIndex;
    }
    if (!file || !galleryFiles.length) return 0;
    const idx = galleryFiles.findIndex((f) => f.path === file.path);
    return idx >= 0 ? idx : 0;
  });

  // Panel visibility
  const [showInfoPanel, setShowInfoPanel] = useState(initialShowInfoPanel);
  const [showFilmstrip, setShowFilmstrip] = useState(initialShowFilmstrip);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  // Slideshow
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [slideshowInterval, setSlideshowInterval] = useState(DEFAULT_SLIDESHOW_INTERVAL);
  const slideshowTimerRef = useRef(null);

  // Image metadata
  const [imageMetadata, setImageMetadata] = useState(null);
  const [loading, setLoading] = useState(true);

  // Current file (derived from gallery index or direct file)
  const currentFile = galleryFiles.length > 0
    ? galleryFiles[currentIndex]
    : file;

  // --------------------------------------------------------------------------
  // Zoom actions
  // --------------------------------------------------------------------------

  /**
   * Set zoom level, clamped to bounds
   * @param {number} newZoom
   */
  const setZoom = useCallback((newZoom) => {
    setTransform((prev) => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom)),
    }));
  }, []);

  const zoomIn = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      zoom: Math.min(MAX_ZOOM, prev.zoom + ZOOM_STEP),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, prev.zoom - ZOOM_STEP),
    }));
  }, []);

  /**
   * Zoom to fit the image within the viewport
   * @param {Object} containerSize - { width, height }
   * @param {Object} imageSize - { width, height }
   */
  const fitToScreen = useCallback((containerSize, imageSize) => {
    if (!containerSize || !imageSize || !imageSize.width || !imageSize.height) {
      setTransform((prev) => ({ ...prev, zoom: 1, panX: 0, panY: 0 }));
      return;
    }
    const scaleX = containerSize.width / imageSize.width;
    const scaleY = containerSize.height / imageSize.height;
    const fitZoom = Math.min(scaleX, scaleY) * 0.95; // 5% padding
    setTransform((prev) => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fitZoom)),
      panX: 0,
      panY: 0,
    }));
  }, []);

  /**
   * Show image at actual size (100%)
   */
  const actualSize = useCallback(() => {
    setTransform((prev) => ({ ...prev, zoom: 1, panX: 0, panY: 0 }));
  }, []);

  // --------------------------------------------------------------------------
  // Rotation & flip
  // --------------------------------------------------------------------------

  const rotateClockwise = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
    }));
  }, []);

  const rotateCounterClockwise = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      rotation: (prev.rotation - 90 + 360) % 360,
    }));
  }, []);

  const flipHorizontal = useCallback(() => {
    setTransform((prev) => ({ ...prev, flipH: !prev.flipH }));
  }, []);

  const flipVertical = useCallback(() => {
    setTransform((prev) => ({ ...prev, flipV: !prev.flipV }));
  }, []);

  // --------------------------------------------------------------------------
  // Pan (drag)
  // --------------------------------------------------------------------------

  /**
   * Apply a pan delta
   * @param {number} dx
   * @param {number} dy
   */
  const pan = useCallback((dx, dy) => {
    setTransform((prev) => ({
      ...prev,
      panX: prev.panX + dx,
      panY: prev.panY + dy,
    }));
  }, []);

  // --------------------------------------------------------------------------
  // Reset
  // --------------------------------------------------------------------------

  const resetTransform = useCallback(() => {
    setTransform({
      zoom: 1,
      rotation: 0,
      flipH: false,
      flipV: false,
      panX: 0,
      panY: 0,
    });
  }, []);

  // --------------------------------------------------------------------------
  // Gallery navigation
  // --------------------------------------------------------------------------

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < galleryFiles.length - 1;

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    resetTransform();
    setImageMetadata(null);
    setLoading(true);
  }, [resetTransform]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(galleryFiles.length - 1, prev + 1));
    resetTransform();
    setImageMetadata(null);
    setLoading(true);
  }, [galleryFiles.length, resetTransform]);

  const goToIndex = useCallback((index) => {
    if (index >= 0 && index < galleryFiles.length) {
      setCurrentIndex(index);
      resetTransform();
      setImageMetadata(null);
      setLoading(true);
    }
  }, [galleryFiles.length, resetTransform]);

  // Update current index when file prop changes or when gallery loads later
  useEffect(() => {
    if (file && galleryFiles.length > 0) {
      const idx = galleryFiles.findIndex((f) => f.path === file.path);
      if (idx >= 0) {
        setCurrentIndex(idx);
        resetTransform();
        setImageMetadata(null);
        setLoading(true);
      }
    }
  }, [file?.path, galleryFiles.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // --------------------------------------------------------------------------
  // Fullscreen
  // --------------------------------------------------------------------------

  const enterFullscreen = useCallback(() => {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen().catch(() => {});
    }
    setIsFullscreen(true);
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen]);

  // Sync fullscreen state with browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // --------------------------------------------------------------------------
  // Slideshow
  // --------------------------------------------------------------------------

  const startSlideshow = useCallback(() => {
    setSlideshowActive(true);
  }, []);

  const stopSlideshow = useCallback(() => {
    setSlideshowActive(false);
  }, []);

  const toggleSlideshow = useCallback(() => {
    setSlideshowActive((prev) => !prev);
  }, []);

  // Auto-advance during slideshow
  useEffect(() => {
    if (!slideshowActive) {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current);
        slideshowTimerRef.current = null;
      }
      return;
    }

    slideshowTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= galleryFiles.length - 1) {
          return 0; // Loop back to start
        }
        return prev + 1;
      });
      resetTransform();
      setImageMetadata(null);
      setLoading(true);
    }, slideshowInterval);

    return () => {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current);
      }
    };
  }, [slideshowActive, slideshowInterval, galleryFiles.length, resetTransform]);

  // --------------------------------------------------------------------------
  // Panel toggles
  // --------------------------------------------------------------------------

  const toggleInfoPanel = useCallback(() => {
    setShowInfoPanel((prev) => !prev);
  }, []);

  const toggleFilmstrip = useCallback(() => {
    setShowFilmstrip((prev) => !prev);
  }, []);

  // --------------------------------------------------------------------------
  // Metadata
  // --------------------------------------------------------------------------

  const setImageMetadataCallback = useCallback((metadata) => {
    setImageMetadata(metadata);
  }, []);

  const setLoadingCallback = useCallback((isLoading) => {
    setLoading(isLoading);
  }, []);

  return {
    // State
    currentFile,
    currentIndex,
    galleryFiles,
    transform,
    isFullscreen,
    showInfoPanel,
    showFilmstrip,
    slideshowActive,
    slideshowInterval,
    imageMetadata,
    loading,
    containerRef,

    // Zoom
    setZoom,
    zoomIn,
    zoomOut,
    fitToScreen,
    actualSize,

    // Transform
    rotateClockwise,
    rotateCounterClockwise,
    flipHorizontal,
    flipVertical,
    pan,
    resetTransform,

    // Navigation
    canGoPrevious,
    canGoNext,
    goToPrevious,
    goToNext,
    goToIndex,

    // Fullscreen
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,

    // Slideshow
    toggleSlideshow,
    startSlideshow,
    stopSlideshow,
    setSlideshowInterval,

    // Panels
    toggleInfoPanel,
    toggleFilmstrip,

    // Metadata
    setImageMetadata: setImageMetadataCallback,
    setLoading: setLoadingCallback,

    // Constants for UI
    MIN_ZOOM,
    MAX_ZOOM,
  };
}
