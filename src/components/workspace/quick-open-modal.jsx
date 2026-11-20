'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cx } from '@/utils/cx';
import {
  RiCloseLine,
  RiFileLine,
} from '@remixicon/react';
import { FileIcon } from '@/components/file-manager/file-icon';

/**
 * Quick file search modal (Ctrl+P)
 *
 * Recursively searches the filesystem from root and lets the user
 * pick a file to open. Uses fuzzy-like matching: files whose path
 * contains the query substring (case-insensitive) are shown first,
 * then results where the filename matches.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {() => void} props.onClose - Close handler
 * @param {(file: {path: string, name: string, type: string}) => void} props.onSelect - File selected handler
 */
export function QuickOpenModal({ isOpen, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const abortRef = useRef(null);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      // Focus input after render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Search effect — debounced
  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setResults([]);
      return;
    }

    const trimmed = query.trim().toLowerCase();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        // Search via the API
        const res = await fetch(
          `/api/files/search?q=${encodeURIComponent(trimmed)}&limit=50`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) {
          setResults(data.data || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Quick search error:', err);
        }
      } finally {
        setIsSearching(false);
      }
    }, 150); // 150ms debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            onSelect(results[selectedIndex]);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIndex, onSelect, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('[data-result-item]');
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl bg-background-primary-default border border-border-emphasis rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Quick file search"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
          <RiFileLine className="w-5 h-5 text-text-tertiary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files by name or path..."
            className="flex-1 bg-transparent text-body-regular text-text-primary placeholder:text-text-tertiary outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-text-tertiary hover:text-text-secondary transition-colors"
              aria-label="Clear search"
            >
              <RiCloseLine className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-caption-2-regular text-text-tertiary bg-background-secondary-default rounded border border-border-subtle">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto overscroll-contain"
        >
          {isSearching && results.length === 0 && (
            <div className="px-4 py-6 text-center text-body-regular text-text-tertiary">
              Searching...
            </div>
          )}

          {!isSearching && query.trim() && results.length === 0 && (
            <div className="px-4 py-6 text-center text-body-regular text-text-tertiary">
              No files found
            </div>
          )}

          {results.map((file, index) => (
            <button
              key={file.path}
              data-result-item
              onClick={() => {
                onSelect(file);
                onClose();
              }}
              className={cx(
                'w-full flex items-center gap-3 px-4 py-2.5 text-start transition-colors',
                index === selectedIndex
                  ? 'bg-background-secondary-hover'
                  : 'hover:bg-background-secondary-hover/50'
              )}
            >
              <FileIcon type={file.type} name={file.name} extension={file.extension} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-body-regular text-text-primary truncate">
                  {file.name}
                </div>
                <div className="text-caption-2-regular text-text-tertiary truncate">
                  {file.path}
                </div>
              </div>
            </button>
          ))}

          {!query.trim() && (
            <div className="px-4 py-6 text-center text-body-regular text-text-tertiary">
              Type to search files...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Render the appropriate icon for a file result
 * Now handled by the centralized FileIcon component
 */
