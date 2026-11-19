'use client';

import { useRef, useCallback, useMemo, useState } from 'react';
import { cx } from '@/utils/cx';

/**
 * Simple text editor with line numbers (no syntax highlighting)
 *
 * Use this for plain text files where syntax highlighting is not needed.
 * For code files with syntax highlighting, use CodeEditor instead.
 *
 * Features:
 * - Line numbers on left side
 * - Monospace font
 * - Scroll synchronization between textarea and line numbers
 * - Tab key inserts spaces
 *
 * @param {Object} props - Component props
 * @param {string} props.value - Current content
 * @param {function(string): void} props.onChange - Content change handler
 * @param {boolean} [props.readOnly=false] - Read-only mode
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.showLineNumbers=true] - Show line numbers
 *
 * @example
 * <TextEditor
 *   value={content}
 *   onChange={setContent}
 * />
 */
export function TextEditor({
  value,
  onChange,
  readOnly = false,
  className,
  showLineNumbers = true,
}) {
  const textareaRef = useRef(null);
  const lineNumberRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  // Count lines
  const lineCount = useMemo(() => {
    return value.split('\n').length;
  }, [value]);
  
  // Handle scroll synchronization
  const handleScroll = useCallback((e) => {
    const { scrollTop } = e.target;
    setScrollTop(scrollTop);
    
    // Sync scroll with line numbers
    if (lineNumberRef.current) {
      lineNumberRef.current.scrollTop = scrollTop;
    }
  }, []);
  
  // Handle content change
  const handleChange = useCallback((e) => {
    onChange(e.target.value);
  }, [onChange]);
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    // Tab key inserts spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
      // Set cursor position after spaces
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  }, [value, onChange]);
  
  // Generate line numbers
  const lineNumbers = useMemo(() => {
    const numbers = [];
    for (let i = 1; i <= lineCount; i++) {
      numbers.push(
        <div key={i} className="text-text-tertiary text-right pr-3 select-none" style={{ height: '1.5rem', lineHeight: '1.5rem' }}>
          {i}
        </div>
      );
    }
    return numbers;
  }, [lineCount]);
  
  return (
    <div className={cx('relative flex h-full bg-background-primary-default', className)}>
      {/* Line numbers */}
      {showLineNumbers && (
        <div
          ref={lineNumberRef}
          className="flex flex-col bg-background-secondary-default border-r border-separator-border overflow-hidden select-none"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            lineHeight: '1.5rem',
            paddingTop: '1rem',
            paddingBottom: '1rem',
            minWidth: '3.5rem',
          }}
        >
          {lineNumbers}
        </div>
      )}
      
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        spellCheck={false}
        className="flex-1 p-4 bg-transparent resize-none outline-none overflow-auto"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.875rem',
          lineHeight: '1.5rem',
          color: 'var(--color-text-primary)',
          caretColor: 'var(--color-text-primary)',
          whiteSpace: 'pre',
          overflowWrap: 'normal',
          overflowX: 'auto',
        }}
      />
    </div>
  );
}
