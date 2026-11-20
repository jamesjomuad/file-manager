'use client';

import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { cx } from '@/utils/cx';
import { FileIcon } from '@/components/file-manager/file-icon';
import { isSupportedImageFormat } from '@/lib/image/image-utils';

/**
 * Thumbnail image component with lazy loading
 *
 * Uses IntersectionObserver to load thumbnails only when they scroll into view.
 * Shows a placeholder skeleton while loading and falls back to FileIcon on error.
 * Transparent images display over a checkerboard background.
 *
 * @param {Object} props
 * @param {Object} props.file - File metadata (path, name, type, extension)
 * @param {'small'|'medium'|'large'} [props.size='medium'] - Thumbnail size preset
 * @param {string} [props.className] - Additional classes
 */
export const ThumbnailImage = memo(function ThumbnailImage({
  file,
  size = 'medium',
  className,
}) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Determine if this file can show a thumbnail
  const canShowThumbnail = file.type !== 'directory' && isSupportedImageFormat(file.extension);

  // The thumbnail URL
  const src = canShowThumbnail
    ? `/api/thumbnails/${file.path}?size=${size}`
    : null;

  // Lazy load via IntersectionObserver
  useEffect(() => {
    if (!canShowThumbnail) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(container);
          }
        });
      },
      { rootMargin: '200px 0px' } // Pre-load 200px before visible
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [canShowThumbnail]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  // Size classes
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-full aspect-square',
    large: 'w-full aspect-square',
  };

  // For list view (small), don't show lazy loading overhead
  if (!canShowThumbnail || !src) {
    return (
      <div className={cx(
        'flex items-center justify-center shrink-0',
        sizeClasses[size],
        className
      )}>
        <FileIcon
          type={file.type}
          name={file.name}
          extension={file.extension}
          size={size === 'small' ? 'sm' : 'lg'}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cx(
        'relative overflow-hidden shrink-0',
        'rounded-lg',
        'image-viewer-thumbnail-bg',
        sizeClasses[size],
        className
      )}
    >
      {/* Loading skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          {isVisible ? (
            <div className="w-5 h-5 border-2 border-text-tertiary border-t-text-primary rounded-full animate-spin" />
          ) : (
            <FileIcon
              type={file.type}
              name={file.name}
              extension={file.extension}
              size={size === 'small' ? 'sm' : 'lg'}
              className="opacity-40"
            />
          )}
        </div>
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <FileIcon
            type={file.type}
            name={file.name}
            extension={file.extension}
            size={size === 'small' ? 'sm' : 'lg'}
          />
        </div>
      )}

      {/* Thumbnail image */}
      {isVisible && !hasError && (
        <img
          ref={imgRef}
          src={src}
          alt=""
          role="presentation"
          onLoad={handleLoad}
          onError={handleError}
          draggable={false}
          className={cx(
            'w-full h-full object-cover transition-opacity duration-200',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  );
});
