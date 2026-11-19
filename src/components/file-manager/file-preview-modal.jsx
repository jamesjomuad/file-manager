'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cx } from '@/utils/cx';
import { Button } from '@/components/base/buttons/button';
import {
  RiCloseLine,
  RiDownloadLine,
  RiZoomInLine,
  RiZoomOutLine,
  RiFileCopyLine,
  RiCheckLine,
} from '@remixicon/react';
import { getPreviewType, getLanguage } from '@/lib/file-type';
import { formatFileSize } from '@/lib/filesystem/utils';

/**
 * File preview modal
 *
 * Renders a modal overlay that previews the contents of a file.
 * Supports images, PDFs, text files, and code files with syntax highlighting.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is visible
 * @param {Object} props.file - File metadata (name, path, size, extension)
 * @param {() => void} props.onClose - Close callback
 */
export function FilePreviewModal({ open, file, onClose }) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [prevFilePath, setPrevFilePath] = useState(file?.path ?? null);

  // Reset zoom when file changes — done during render per React's recommended pattern
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  const currentPath = file?.path ?? null;
  if (currentPath !== prevFilePath) {
    setPrevFilePath(currentPath);
    setZoom(1);
  }

  /**
   * Close modal on Escape key
   */
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  /**
   * Trap focus inside modal while open
   */
  useEffect(() => {
    if (!open || !modalRef.current) return;

    // Save the current focus for restoration on close
    previousFocusRef.current = document.activeElement;

    // Focus the modal for keyboard handling
    modalRef.current.focus();

    const handleTab = (e) => {
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  /**
   * Prevent body scroll while modal is open; restore focus on close
   */
  useEffect(() => {
    if (!open) {
      // Restore focus on close
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open || !file) return null;

  const previewType = getPreviewType(file.extension);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${file.name}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background-full/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cx(
          'relative z-10 flex flex-col w-full max-w-5xl mx-4 max-h-[90vh]',
          'bg-background-primary-default border border-border-button-default',
          'rounded-2xl shadow-xl overflow-hidden',
          'outline-none'
        )}
      >
        {/* Header */}
        <PreviewHeader
          file={file}
          previewType={previewType}
          zoom={zoom}
          onZoomChange={setZoom}
          onClose={onClose}
        />

        {/* Content area */}
        <div className="flex-1 min-h-0 overflow-auto">
          {/* Key forces fresh state on file change */}
          <PreviewContent
            key={file.path}
            file={file}
            previewType={previewType}
            zoom={zoom}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Preview header with filename, metadata, and action buttons
 *
 * @param {Object} props
 * @param {Object} props.file - File metadata
 * @param {string|null} props.previewType - Preview type
 * @param {number} props.zoom - Current zoom level (for images)
 * @param {(zoom: number) => void} props.onZoomChange - Zoom change callback
 * @param {() => void} props.onClose - Close callback
 */
function PreviewHeader({ file, previewType, zoom, onZoomChange, onClose }) {
  const [copyState, setCopyState] = useState('idle'); // idle | copying | copied | error

  /**
   * Get the text content from the preview content area for copying
   */
  const handleCopy = useCallback(async () => {
    if (copyState === 'copying') return;

    try {
      setCopyState('copying');
      // Read content from the <code> element in the preview
      const codeEl = document.querySelector('[data-preview-content] code');
      const text = codeEl?.textContent ?? '';
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2000);
    }
  }, [copyState]);

  /**
   * Handle download from preview
   */
  const handleDownload = useCallback(() => {
    const url = `/api/files/${file.path}?action=download`;
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [file]);

  return (
    <div className={cx(
      'flex items-center justify-between gap-3 px-5 py-3 border-b border-border-button-default',
      'shrink-0'
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-title-3-semibold text-text-primary truncate">
          {file.name}
        </h2>
        {file.size != null && (
          <span className="text-caption-1-regular text-text-secondary shrink-0">
            {formatFileSize(file.size)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Copy button (text/code only) */}
        {(previewType === 'text' || previewType === 'code') && (
          <Button
            variant="ghost"
            size="small"
            iconOnly
            leadingIcon={copyState === 'copied' ? RiCheckLine : RiFileCopyLine}
            aria-label={copyState === 'copied' ? 'Copied' : 'Copy to clipboard'}
            onClick={handleCopy}
            disabled={copyState === 'copying'}
          />
        )}

        {/* Zoom controls (image only) */}
        {previewType === 'image' && (
          <>
            <Button
              variant="ghost"
              size="small"
              iconOnly
              leadingIcon={RiZoomOutLine}
              aria-label="Zoom out"
              onClick={() => onZoomChange(Math.max(0.1, zoom - 0.25))}
            />
            <span className="text-caption-1-regular text-text-secondary min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="small"
              iconOnly
              leadingIcon={RiZoomInLine}
              aria-label="Zoom in"
              onClick={() => onZoomChange(Math.min(5, zoom + 0.25))}
            />
          </>
        )}

        {/* Download */}
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiDownloadLine}
          aria-label="Download file"
          onClick={handleDownload}
        />

        {/* Close */}
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiCloseLine}
          aria-label="Close preview"
          onClick={onClose}
        />
      </div>
    </div>
  );
}

/**
 * Preview content area — dispatches to the appropriate preview renderer.
 * Remounts on file change via key prop, so loading/error/content state
 * is always fresh.
 *
 * @param {Object} props
 * @param {Object} props.file - File metadata
 * @param {string|null} props.previewType - Preview type
 * @param {number} props.zoom - Current zoom level (for images)
 */
function PreviewContent({ file, previewType, zoom }) {
  if (previewType === 'image') {
    return <ImagePreview file={file} zoom={zoom} />;
  }
  if (previewType === 'pdf') {
    return <PdfPreview file={file} />;
  }
  if (previewType === 'text' || previewType === 'code') {
    return (
      <TextPreview
        file={file}
        language={previewType === 'code' ? getLanguage(file.extension) : null}
        highlight={previewType === 'code'}
      />
    );
  }
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-body-regular text-text-secondary">
        No preview available for this file type.
      </p>
    </div>
  );
}

/**
 * Image preview renderer
 *
 * @param {Object} props
 * @param {Object} props.file - File metadata
 * @param {number} props.zoom - Current zoom level
 */
function ImagePreview({ file, zoom }) {
  const [dimensions, setDimensions] = useState(null);
  const [error, setError] = useState(false);
  const src = `/api/files/${file.path}?action=download`;

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-body-regular text-error-600">Failed to load image</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-center min-h-64 p-4">
        <img
          src={src}
          alt={file.name}
          onLoad={(e) => setDimensions({
            width: e.target.naturalWidth,
            height: e.target.naturalHeight,
          })}
          onError={() => setError(true)}
          className="max-w-full object-contain transition-transform duration-150"
          style={{ transform: `scale(${zoom})` }}
          draggable={false}
        />
      </div>
      {dimensions && (
        <div className={cx(
          'flex items-center justify-between px-5 py-2 border-t border-border-button-default',
          'shrink-0'
        )}>
          <span className="text-caption-1-regular text-text-secondary">
            {dimensions.width} × {dimensions.height} px
          </span>
          {file.size != null && (
            <span className="text-caption-1-regular text-text-secondary">
              {formatFileSize(file.size)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * PDF preview renderer using native browser PDF viewer
 *
 * @param {Object} props
 * @param {Object} props.file - File metadata
 */
function PdfPreview({ file }) {
  const [error, setError] = useState(false);
  const src = `/api/files/${file.path}?action=download`;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-body-regular text-error-600">
          Unable to display PDF in browser.
        </p>
        <Button
          variant="secondary"
          size="medium"
          leadingIcon={RiDownloadLine}
          onClick={() => {
            const link = document.createElement('a');
            link.href = src;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        >
          Download PDF
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[70vh]">
      <iframe
        src={src}
        title={`PDF preview: ${file.name}`}
        className="w-full h-full border-0"
        onError={() => setError(true)}
      />
    </div>
  );
}

/**
 * Text/code preview renderer with line numbers and basic syntax highlighting.
 * Manages its own loading/error/content state — remounts cleanly on file change.
 *
 * @param {Object} props
 * @param {Object} props.file - File metadata
 * @param {string|null} props.language - Language identifier
 * @param {boolean} props.highlight - Whether to apply syntax highlighting
 */
function TextPreview({ file, language, highlight }) {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/files/${file.path}?action=read`);
        if (!response.ok) {
          throw new Error('Failed to load file content');
        }

        const data = await response.json();
        if (!cancelled) {
          setContent(data.data?.content ?? '');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading file content:', err);
          setError(err.message || 'Failed to load file');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [file.path]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-body-regular text-text-secondary">Loading preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-body-regular text-error-600">{error}</p>
      </div>
    );
  }

  const lines = content.split('\n');
  // Remove trailing empty line from split (common with files ending in newline)
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return (
    <div className="flex min-h-64 font-mono" data-preview-content>
      {/* Line numbers gutter */}
      <div
        className={cx(
          'shrink-0 select-none text-right py-4 px-3',
          'bg-background-secondary-default border-e border-border-button-default',
          'text-caption-1-regular text-text-tertiary'
        )}
        aria-hidden="true"
      >
        {lines.map((_, i) => (
          <div key={i} className="leading-6">
            {i + 1}
          </div>
        ))}
      </div>

      {/* Content */}
      <pre
        className={cx(
          'flex-1 m-0 py-4 px-4 overflow-x-auto',
          'text-caption-1-regular text-text-primary leading-6'
        )}
      >
        <code>
          {highlight
            ? lines.map((line, i) => (
                <div key={i}>{highlightLine(line, language)}</div>
              ))
            : lines.map((line, i) => <div key={i}>{line || '\n'}</div>)}
        </code>
      </pre>
    </div>
  );
}

/**
 * Regex-based syntax highlighting for a single line of code.
 *
 * Supports: keywords, strings, comments, numbers, and a subset of common
 * languages (JS/TS, Python, JSON, HTML, CSS). This is intentionally lightweight
 * — for production syntax highlighting, integrate a library like Prism or Shiki.
 *
 * @param {string} line - Source line
 * @param {string|null} language - Language identifier
 * @returns {React.ReactNode} Highlighted line
 */
function highlightLine(line, language) {
  if (!language) return line;

  const tokens = [];
  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    let matched = false;

    // Comments
    if (language !== 'json') {
      // Line comments (// or # or --)
      const commentMatch = remaining.match(/^(\/\/.*|#(?!\{).*)$/);
      if (commentMatch && !isInsideString(line, line.length - remaining.length)) {
        tokens.push(
          <span key={key++} className="text-text-tertiary italic">
            {commentMatch[0]}
          </span>
        );
        remaining = remaining.slice(commentMatch[0].length);
        matched = true;
      }
    }

    // Strings (double-quoted, single-quoted, backtick)
    if (!matched) {
      const stringMatch = remaining.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/);
      if (stringMatch) {
        tokens.push(
          <span key={key++} className="text-text-success-primary">
            {stringMatch[0]}
          </span>
        );
        remaining = remaining.slice(stringMatch[0].length);
        matched = true;
      }
    }

    // Numbers
    if (!matched) {
      const numMatch = remaining.match(/^-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/);
      if (numMatch) {
        tokens.push(
          <span key={key++} className="text-text-warning-primary">
            {numMatch[0]}
          </span>
        );
        remaining = remaining.slice(numMatch[0].length);
        matched = true;
      }
    }

    // Keywords
    if (!matched && language !== 'json') {
      const keywordSet = getKeywords(language);
      const wordMatch = remaining.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
      if (wordMatch && keywordSet.has(wordMatch[0])) {
        tokens.push(
          <span key={key++} className="text-text-brand-primary font-medium">
            {wordMatch[0]}
          </span>
        );
        remaining = remaining.slice(wordMatch[0].length);
        matched = true;
      }
    }

    // HTML tags
    if (!matched && (language === 'html' || language === 'xml')) {
      const tagMatch = remaining.match(/^<\/?[a-zA-Z][a-zA-Z0-9-]*/);
      if (tagMatch) {
        tokens.push(
          <span key={key++} className="text-text-brand-primary">
            {tagMatch[0]}
          </span>
        );
        remaining = remaining.slice(tagMatch[0].length);
        matched = true;
      }
    }

    // Default: consume one character
    if (!matched) {
      // Collect consecutive plain characters until next special token
      const plainMatch = remaining.match(/^[^"'`#\d\\/a-zA-Z_<]+/);
      if (plainMatch && plainMatch[0].length > 0) {
        tokens.push(plainMatch[0]);
        remaining = remaining.slice(plainMatch[0].length);
      } else {
        tokens.push(remaining[0]);
        remaining = remaining.slice(1);
      }
    }
  }

  return tokens;
}

/**
 * Get keyword set for a language
 * @param {string} language
 * @returns {Set<string>}
 */
function getKeywords(language) {
  const keywords = {
    javascript: new Set([
      'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for',
      'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this',
      'class', 'extends', 'super', 'import', 'export', 'default', 'from',
      'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof',
      'instanceof', 'in', 'of', 'null', 'undefined', 'true', 'false',
    ]),
    typescript: new Set([
      'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for',
      'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this',
      'class', 'extends', 'super', 'import', 'export', 'default', 'from',
      'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof',
      'instanceof', 'in', 'of', 'null', 'undefined', 'true', 'false',
      'interface', 'type', 'enum', 'namespace', 'public', 'private',
      'protected', 'readonly', 'abstract', 'implements', 'as', 'is',
      'keyof', 'infer', 'never', 'unknown', 'any', 'void',
    ]),
    python: new Set([
      'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while',
      'import', 'from', 'as', 'with', 'try', 'except', 'finally', 'raise',
      'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'lambda',
      'yield', 'global', 'nonlocal', 'True', 'False', 'None', 'async', 'await',
    ]),
    css: new Set([
      'important', 'media', 'keyframes', 'import', 'charset', 'font-face',
      'page', 'supports',
    ]),
    html: new Set([]),
    xml: new Set([]),
    json: new Set(['true', 'false', 'null']),
    go: new Set([
      'func', 'return', 'if', 'else', 'for', 'range', 'switch', 'case',
      'break', 'continue', 'import', 'package', 'var', 'const', 'type',
      'struct', 'interface', 'map', 'chan', 'go', 'defer', 'select',
      'true', 'false', 'nil',
    ]),
    rust: new Set([
      'fn', 'let', 'mut', 'return', 'if', 'else', 'for', 'while', 'loop',
      'match', 'use', 'mod', 'pub', 'struct', 'enum', 'impl', 'trait',
      'self', 'Self', 'true', 'false', 'None', 'Some', 'Ok', 'Err',
    ]),
    java: new Set([
      'public', 'private', 'protected', 'static', 'final', 'class', 'interface',
      'extends', 'implements', 'return', 'if', 'else', 'for', 'while', 'do',
      'switch', 'case', 'break', 'continue', 'new', 'this', 'super', 'import',
      'package', 'void', 'int', 'long', 'double', 'float', 'boolean', 'char',
      'String', 'null', 'true', 'false', 'try', 'catch', 'finally', 'throw',
    ]),
    php: new Set([
      'function', 'return', 'if', 'else', 'elseif', 'for', 'foreach', 'while',
      'class', 'public', 'private', 'protected', 'static', 'new', 'echo',
      'null', 'true', 'false', 'use', 'namespace', 'try', 'catch', 'finally',
      'throw', 'array', 'require', 'include',
    ]),
    sql: new Set([
      'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
      'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'INDEX', 'JOIN', 'LEFT',
      'RIGHT', 'INNER', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'NULL', 'IS',
      'IN', 'LIKE', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET',
      'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'BETWEEN',
      'select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set',
      'delete', 'create', 'table', 'drop', 'alter', 'index', 'join', 'left',
      'right', 'inner', 'outer', 'on', 'and', 'or', 'not', 'null', 'is',
      'in', 'like', 'order', 'by', 'group', 'having', 'limit', 'offset',
      'as', 'distinct', 'count', 'sum', 'avg', 'min', 'max', 'between',
    ]),
  };

  return keywords[language] || new Set();
}

/**
 * Check if a position in a line is inside a string literal
 * @param {string} line - Source line
 * @param {number} position - Position to check
 * @returns {boolean}
 */
function isInsideString(line, position) {
  let inString = false;
  let stringChar = '';
  for (let i = 0; i < position && i < line.length; i++) {
    const ch = line[i];
    if (inString) {
      if (ch === '\\') {
        i++; // skip escaped character
      } else if (ch === stringChar) {
        inString = false;
      }
    } else {
      if (ch === '"' || ch === "'" || ch === '`') {
        inString = true;
        stringChar = ch;
      }
    }
  }
  return inString;
}
