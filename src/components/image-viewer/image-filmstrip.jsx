'use client';

import { useRef, useEffect, useCallback, memo } from 'react';
import { cx } from '@/utils/cx';

/**
 * Thumbnail filmstrip for gallery navigation
 *
 * Shows a horizontal strip of image thumbnails with the current
 * image highlighted. Thumbnails are lazy-loaded for performance.
 *
 * @param {Object} props
 * @param {Object[]} props.files - Array of image files in the gallery
 * @param {number} props.currentIndex - Currently displayed image index
 * @param {(index: number) => void} props.onSelect - Select a thumbnail
 * @param {string} [props.className] - Additional classes
 */
export const ImageFilmstrip = memo(function ImageFilmstrip({
  files = [],
  currentIndex,
  onSelect,
  className,
}) {
  const stripRef = useRef(null);
  const itemRefs = useRef(new Map());

  // Auto-scroll to keep the current thumbnail in view
  useEffect(() => {
    const currentItem = itemRefs.current.get(currentIndex);
    const strip = stripRef.current;
    if (!currentItem || !strip) return;

    const stripRect = strip.getBoundingClientRect();
    const itemRect = currentItem.getBoundingClientRect();

    // Check if item is outside visible area
    const padding = 60; // px padding from edges
    if (itemRect.left < stripRect.left + padding) {
      strip.scrollBy({
        left: itemRect.left - stripRect.left - padding,
        behavior: 'smooth',
      });
    } else if (itemRect.right > stripRect.right - padding) {
      strip.scrollBy({
        left: itemRect.right - stripRect.right + padding,
        behavior: 'smooth',
      });
    }
  }, [currentIndex]);

  const handleSelect = useCallback((index) => {
    onSelect?.(index);
  }, [onSelect]);

  const handleKeyDown = useCallback((e, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(index);
    }
  }, [onSelect]);

  if (files.length === 0) return null;

  return (
    <div
      className={cx(
        'shrink-0 border-t border-border-button-default',
        'bg-background-primary-default/95 backdrop-blur-sm',
        className
      )}
    >
      <div
        ref={stripRef}
        className="flex items-center gap-2 px-4 py-3 overflow-x-auto filmstrip-scroll"
        role="tablist"
        aria-label="Image thumbnails"
      >
        {files.map((file, index) => {
          const isActive = index === currentIndex;
          const src = `/api/files/${file.path}?action=download`;

          return (
            <button
              key={file.path}
              ref={(el) => {
                if (el) itemRefs.current.set(index, el);
                else itemRefs.current.delete(index);
              }}
              role="tab"
              aria-selected={isActive}
              aria-label={file.name}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleSelect(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cx(
                'relative shrink-0 rounded-lg overflow-hidden transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring',
                isActive
                  ? 'ring-2 ring-accent-500 scale-105'
                  : 'ring-1 ring-border-button-default hover:ring-text-tertiary opacity-70 hover:opacity-100'
              )}
              style={{ width: 56, height: 56 }}
            >
              <LazyThumbnail
                src={src}
                alt={file.name}
                isActive={isActive}
              />

              {/* Active indicator dot */}
              {isActive && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

/**
 * Lazy-loaded thumbnail using IntersectionObserver
 *
 * @param {Object} props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alt text
 * @param {boolean} props.isActive - Whether this is the current image
 */
const LazyThumbnail = memo(function LazyThumbnail({ src, alt, isActive }) {
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && imgRef.current) {
            imgRef.current.src = src;
            observer.unobserve(container);
          }
        });
      },
      { rootMargin: '200px' } // Pre-load thumbnails slightly before they scroll into view
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [src]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full image-viewer-thumbnail-bg"
    >
      <img
        ref={imgRef}
        alt={alt}
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
  );
});
