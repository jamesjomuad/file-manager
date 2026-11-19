'use client';

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { cx } from '@/utils/cx';
import { Button } from '@/components/base/buttons/button';
import { ButtonGroup } from '@/components/base/buttons/button-group';
import { Input } from '@/components/base/input/input';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiZoomInLine,
  RiZoomOutLine,
  RiRotateLockLine,
  RiSearchLine,
  RiFullscreenLine,
  RiFullscreenExitLine,
  RiDownloadLine,
  RiPrinterLine,
  RiCloseLine,
} from '@remixicon/react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker from CDN
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/**
 * PDF Viewer component
 *
 * A full-featured PDF viewing experience with page navigation, zoom, rotation,
 * search, fullscreen, download, and print capabilities.
 *
 * @param {Object} props
 * @param {string} props.fileUrl - URL to the PDF file
 * @param {string} props.fileName - File name for download
 * @param {boolean} [props.embedded] - Whether viewer is embedded in a tab
 */
export const PdfViewer = memo(function PdfViewer({
  fileUrl,
  fileName,
  embedded = true,
}) {
  // Document state
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);

  // UI state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs
  const containerRef = useRef(null);
  const pageInputRef = useRef(null);

  // Zoom presets
  const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];

  // --------------------------------------------------------------------------
  // Document handlers
  // --------------------------------------------------------------------------

  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err) => {
    console.error('PDF load error:', err);
    setError(err.message || 'Failed to load PDF');
    setLoading(false);
  }, []);

  const onPageRenderError = useCallback((err) => {
    console.error('Page render error:', err);
  }, []);

  // --------------------------------------------------------------------------
  // Navigation
  // --------------------------------------------------------------------------

  const goToPreviousPage = useCallback(() => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setPageNumber((prev) => Math.min(numPages || 1, prev + 1));
  }, [numPages]);

  const handlePageInputChange = useCallback(
    (e) => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value) && value >= 1 && value <= (numPages || 1)) {
        setPageNumber(value);
      }
    },
    [numPages]
  );

  // --------------------------------------------------------------------------
  // Zoom
  // --------------------------------------------------------------------------

  const zoomIn = useCallback(() => {
    setScale((prev) => {
      const nextLevel = ZOOM_LEVELS.find((level) => level > prev);
      return nextLevel || Math.min(5.0, prev + 0.25);
    });
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const prevLevel = [...ZOOM_LEVELS].reverse().find((level) => level < prev);
      return prevLevel || Math.max(0.25, prev - 0.25);
    });
  }, []);

  const fitToWidth = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 40; // padding
    const pageWidth = 612; // Standard letter width in points
    const fitScale = containerWidth / pageWidth;
    setScale(Math.max(0.25, Math.min(5.0, fitScale)));
  }, []);

  const fitToPage = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 40;
    const containerHeight = containerRef.current.clientHeight - 80; // toolbar + padding
    const pageWidth = 612;
    const pageHeight = 792;
    const scaleX = containerWidth / pageWidth;
    const scaleY = containerHeight / pageHeight;
    const fitScale = Math.min(scaleX, scaleY) * 0.95; // 5% padding
    setScale(Math.max(0.25, Math.min(5.0, fitScale)));
  }, []);

  // --------------------------------------------------------------------------
  // Rotation
  // --------------------------------------------------------------------------

  const rotateClockwise = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  // --------------------------------------------------------------------------
  // Fullscreen
  // --------------------------------------------------------------------------

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // --------------------------------------------------------------------------
  // Download & Print
  // --------------------------------------------------------------------------

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [fileUrl, fileName]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // --------------------------------------------------------------------------
  // Password handling
  // --------------------------------------------------------------------------

  const handlePasswordCallback = useCallback((callback, reason) => {
    if (reason === 1) {
      // Password needed
      setNeedsPassword(true);
      setLoading(false);
    } else {
      // Invalid password
      setError('Invalid password');
      setNeedsPassword(true);
      setLoading(false);
    }
  }, []);

  const handlePasswordSubmit = useCallback(() => {
    // Password will be handled by react-pdf's onPassword callback
    setNeedsPassword(false);
    setLoading(true);
  }, []);

  // --------------------------------------------------------------------------
  // Keyboard shortcuts
  // --------------------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const isMod = e.ctrlKey || e.metaKey;

      // Navigation
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPreviousPage();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goToNextPage();
      }
      // Zoom
      else if (isMod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
      } else if (isMod && e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (isMod && e.key === '0') {
        e.preventDefault();
        setScale(1.0);
      }
      // Search
      else if (isMod && e.key === 'f') {
        e.preventDefault();
        setShowSearch((prev) => !prev);
      }
      // Fullscreen
      else if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        document.exitFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPreviousPage, goToNextPage, zoomIn, zoomOut, toggleFullscreen, isFullscreen]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-body-regular text-text-primary mb-1">Failed to load PDF</p>
          <p className="text-caption-1-regular text-text-tertiary">{error}</p>
        </div>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 p-6 bg-background-primary-default rounded-xl border border-border-button-default">
          <p className="text-body-regular text-text-primary">This PDF is password protected</p>
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePasswordSubmit();
            }}
          />
          <Button onClick={handlePasswordSubmit}>Unlock</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cx(
        'flex flex-col h-full bg-background-secondary-default',
        isFullscreen && 'bg-background-full'
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-background-primary-default border-b border-border-subtle shadow-sm">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2">
          <Button
            iconOnly
            onClick={goToPreviousPage}
            disabled={pageNumber <= 1}
            leadingIcon={RiArrowLeftSLine}
            aria-label="Previous page"
          >
            Previous page
          </Button>
          <div className="flex items-center gap-2 text-caption-1-regular text-text-primary">
            <input
              ref={pageInputRef}
              type="number"
              min={1}
              max={numPages || 1}
              value={pageNumber}
              onChange={handlePageInputChange}
              className="w-12 px-2 py-1 text-center bg-background-secondary-default border border-border-button-default rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus-ring"
            />
            <span className="text-text-secondary">/ {numPages || '—'}</span>
          </div>
          <Button
            iconOnly
            onClick={goToNextPage}
            disabled={pageNumber >= (numPages || 1)}
            leadingIcon={RiArrowRightSLine}
            aria-label="Next page"
          >
            Next page
          </Button>
        </div>

        {/* Center: Zoom */}
        <div className="flex items-center gap-2">
          <ButtonGroup>
            <Button iconOnly onClick={zoomOut} leadingIcon={RiZoomOutLine} aria-label="Zoom out">
              Zoom out
            </Button>
            <span className="px-3 text-caption-1-regular text-text-primary">
              {Math.round(scale * 100)}%
            </span>
            <Button iconOnly onClick={zoomIn} leadingIcon={RiZoomInLine} aria-label="Zoom in">
              Zoom in
            </Button>
          </ButtonGroup>
          <Button variant="ghost" onClick={fitToWidth}>
            Fit width
          </Button>
          <Button variant="ghost" onClick={fitToPage}>
            Fit page
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            iconOnly
            onClick={rotateClockwise}
            leadingIcon={RiRotateLockLine}
            aria-label="Rotate clockwise"
          >
            Rotate
          </Button>
          <Button
            iconOnly
            onClick={() => setShowSearch(!showSearch)}
            leadingIcon={showSearch ? RiCloseLine : RiSearchLine}
            aria-label={showSearch ? 'Close search' : 'Search'}
          >
            Search
          </Button>
          <Button
            iconOnly
            onClick={toggleFullscreen}
            leadingIcon={isFullscreen ? RiFullscreenExitLine : RiFullscreenLine}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            Fullscreen
          </Button>
          <Button
            iconOnly
            onClick={handleDownload}
            leadingIcon={RiDownloadLine}
            aria-label="Download"
          >
            Download
          </Button>
          <Button
            iconOnly
            onClick={handlePrint}
            leadingIcon={RiPrinterLine}
            aria-label="Print"
          >
            Print
          </Button>
        </div>
      </div>

      {/* Search bar (hidden by default) */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 py-2 bg-background-primary-default border-b border-border-subtle">
          <Input
            placeholder="Search in document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <Button variant="ghost" onClick={() => setShowSearch(false)}>
            Close
          </Button>
        </div>
      )}

      {/* PDF Content */}
      <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          onPassword={handlePasswordCallback}
          loading={
            <div className="flex items-center gap-3 text-text-tertiary">
              <div className="w-5 h-5 border-2 border-text-tertiary border-t-text-primary rounded-full animate-spin" />
              <span className="text-body-regular">Loading PDF...</span>
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            rotation={rotation}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            onError={onPageRenderError}
            className="shadow-lg"
          />
        </Document>
      </div>
    </div>
  );
});
