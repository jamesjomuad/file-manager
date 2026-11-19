'use client';

import { memo } from 'react';
import { cx } from '@/utils/cx';
import { Button } from '@/components/base/buttons/button';
import {
  RiZoomInLine,
  RiZoomOutLine,
  RiFullscreenLine,
  RiFullscreenExitLine,
  RiRotateLockLine,
  RiAnticlockwiseLine,
  RiFlipHorizontalLine,
  RiFlipVerticalLine,
  RiRestartLine,
  RiPlayLine,
  RiPauseLine,
  RiInformationLine,
  RiFilmLine,
  RiCloseLine,
  RiDownloadLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from '@remixicon/react';

/**
 * Image viewer toolbar
 *
 * Minimal, professional toolbar with zoom controls, transform operations,
 * navigation, slideshow, and panel toggles.
 *
 * @param {Object} props
 * @param {Object} props.transform - Current transform state
 * @param {number} props.minZoom - Minimum zoom
 * @param {number} props.maxZoom - Maximum zoom
 * @param {boolean} props.canGoPrevious - Can navigate to previous image
 * @param {boolean} props.canGoNext - Can navigate to next image
 * @param {boolean} props.isFullscreen - Fullscreen mode
 * @param {boolean} props.slideshowActive - Slideshow running
 * @param {boolean} props.showInfoPanel - Info panel visible
 * @param {boolean} props.showFilmstrip - Filmstrip visible
 * @param {number} props.currentIndex - Current index in gallery
 * @param {number} props.gallerySize - Total images in gallery
 * @param {Function} props.onZoomIn - Zoom in
 * @param {Function} props.onZoomOut - Zoom out
 * @param {Function} props.onActualSize - Reset to 100%
 * @param {Function} props.onFitToScreen - Fit to viewport
 * @param {Function} props.onRotateCW - Rotate clockwise
 * @param {Function} props.onRotateCCW - Rotate counter-clockwise
 * @param {Function} props.onFlipH - Flip horizontal
 * @param {Function} props.onFlipV - Flip vertical
 * @param {Function} props.onReset - Reset all transforms
 * @param {Function} props.onPrevious - Previous image
 * @param {Function} props.onNext - Next image
 * @param {Function} props.onToggleFullscreen - Toggle fullscreen
 * @param {Function} props.onToggleSlideshow - Toggle slideshow
 * @param {Function} props.onToggleInfoPanel - Toggle info panel
 * @param {Function} props.onToggleFilmstrip - Toggle filmstrip
 * @param {Function} props.onDownload - Download image
 * @param {Function} props.onClose - Close viewer
 * @param {string} [props.className] - Additional classes
 */
export const ImageViewerToolbar = memo(function ImageViewerToolbar({
  transform,
  minZoom,
  maxZoom,
  canGoPrevious,
  canGoNext,
  isFullscreen,
  slideshowActive,
  showInfoPanel,
  showFilmstrip,
  currentIndex,
  gallerySize,
  onZoomIn,
  onZoomOut,
  onActualSize,
  onFitToScreen,
  onRotateCW,
  onRotateCCW,
  onFlipH,
  onFlipV,
  onReset,
  onPrevious,
  onNext,
  onToggleFullscreen,
  onToggleSlideshow,
  onToggleInfoPanel,
  onToggleFilmstrip,
  onDownload,
  onClose,
  className,
}) {
  const zoomPercent = Math.round(transform.zoom * 100);

  return (
    <div
      className={cx(
        'flex items-center justify-between gap-2 px-4 py-2',
        'bg-background-primary-default/95 backdrop-blur-sm',
        'border-b border-border-button-default',
        'shrink-0',
        className
      )}
    >
      {/* Left section: Navigation */}
      <div className="flex items-center gap-1">
        {/* Nav arrows (only if gallery has multiple images) */}
        {gallerySize > 1 && (
          <>
            <Button
              variant="ghost"
              size="small"
              iconOnly
              leadingIcon={RiArrowLeftSLine}
              aria-label="Previous image"
              onClick={onPrevious}
              disabled={!canGoPrevious}
            />
            <span className="text-caption-1-regular text-text-secondary min-w-[3.5rem] text-center tabular-nums">
              {currentIndex + 1} / {gallerySize}
            </span>
            <Button
              variant="ghost"
              size="small"
              iconOnly
              leadingIcon={RiArrowRightSLine}
              aria-label="Next image"
              onClick={onNext}
              disabled={!canGoNext}
            />
            <ToolbarDivider />
          </>
        )}

        {/* Slideshow toggle */}
        {gallerySize > 1 && (
          <Button
            variant="ghost"
            size="small"
            iconOnly
            leadingIcon={slideshowActive ? RiPauseLine : RiPlayLine}
            aria-label={slideshowActive ? 'Pause slideshow' : 'Start slideshow'}
            onClick={onToggleSlideshow}
          />
        )}
      </div>

      {/* Center section: Zoom & Transform */}
      <div className="flex items-center gap-1">
        {/* Zoom controls */}
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiZoomOutLine}
          aria-label="Zoom out"
          onClick={onZoomOut}
          disabled={transform.zoom <= minZoom}
        />

        <button
          onClick={onActualSize}
          className={cx(
            'min-w-[3.5rem] h-8 px-2 rounded-lg',
            'text-caption-1-medium text-text-secondary tabular-nums',
            'hover:bg-background-secondary-hover transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring'
          )}
          title="Actual size (100%)"
          aria-label={`Zoom: ${zoomPercent}%. Click to reset to 100%.`}
        >
          {zoomPercent}%
        </button>

        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiZoomInLine}
          aria-label="Zoom in"
          onClick={onZoomIn}
          disabled={transform.zoom >= maxZoom}
        />

        <ToolbarDivider />

        {/* Fit */}
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiFullscreenLine}
          aria-label="Fit to screen"
          onClick={onFitToScreen}
          title="Fit to screen"
        />

        <ToolbarDivider />

        {/* Rotate */}
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiRotateLockLine}
          aria-label="Rotate clockwise"
          onClick={onRotateCW}
          title="Rotate clockwise"
        />
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiAnticlockwiseLine}
          aria-label="Rotate counter-clockwise"
          onClick={onRotateCCW}
          title="Rotate counter-clockwise"
        />

        <ToolbarDivider />

        {/* Flip */}
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiFlipHorizontalLine}
          aria-label="Flip horizontal"
          onClick={onFlipH}
          title="Flip horizontal"
        />
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiFlipVerticalLine}
          aria-label="Flip vertical"
          onClick={onFlipV}
          title="Flip vertical"
        />

        {/* Reset */}
        {(transform.rotation !== 0 || transform.flipH || transform.flipV ||
          transform.zoom !== 1 || transform.panX !== 0 || transform.panY !== 0) && (
          <>
            <ToolbarDivider />
            <Button
              variant="ghost"
              size="small"
              iconOnly
              leadingIcon={RiRestartLine}
              aria-label="Reset transformations"
              onClick={onReset}
              title="Reset"
            />
          </>
        )}
      </div>

      {/* Right section: Panels & Actions */}
      <div className="flex items-center gap-1">
        {/* Info panel toggle */}
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiInformationLine}
          aria-label={showInfoPanel ? 'Hide info panel' : 'Show info panel'}
          onClick={onToggleInfoPanel}
          title="Info panel"
        />

        {/* Filmstrip toggle (only for gallery) */}
        {gallerySize > 1 && (
          <Button
            variant="ghost"
            size="small"
            iconOnly
            leadingIcon={RiFilmLine}
            aria-label={showFilmstrip ? 'Hide filmstrip' : 'Show filmstrip'}
            onClick={onToggleFilmstrip}
            title="Thumbnail filmstrip"
          />
        )}

        <ToolbarDivider />

        {/* Download */}
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiDownloadLine}
          aria-label="Download image"
          onClick={onDownload}
          title="Download"
        />

        {/* Fullscreen */}
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={isFullscreen ? RiFullscreenExitLine : RiFullscreenLine}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        />

        <ToolbarDivider />

        {/* Close */}
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiCloseLine}
          aria-label="Close image viewer"
          onClick={onClose}
          title="Close"
        />
      </div>
    </div>
  );
});

/**
 * Vertical divider for toolbar sections
 */
function ToolbarDivider() {
  return (
    <div
      className="w-px h-5 mx-1 bg-border-button-default"
      aria-hidden="true"
    />
  );
}
