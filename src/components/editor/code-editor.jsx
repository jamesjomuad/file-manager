'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { cx } from '@/utils/cx';
import Prism from 'prismjs';

// Import language components
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-less';
import 'prismjs/components/prism-markup'; // Includes HTML
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-shell-session';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-git';
import 'prismjs/components/prism-diff';

// Import Prism themes
import 'prismjs/themes/prism-tomorrow.css';

/**
 * File extension to Prism language mapping
 * @type {Object.<string, string>}
 */
const EXTENSION_TO_LANGUAGE = {
  // JavaScript/TypeScript
  'js': 'javascript',
  'jsx': 'jsx',
  'mjs': 'javascript',
  'cjs': 'javascript',
  'ts': 'typescript',
  'tsx': 'tsx',
  'mts': 'typescript',
  'cts': 'typescript',
  
  // Web
  'html': 'markup',
  'htm': 'markup',
  'css': 'css',
  'scss': 'scss',
  'sass': 'scss',
  'less': 'less',
  
  // Data
  'json': 'json',
  'yaml': 'yaml',
  'yml': 'yaml',
  'xml': 'markup',
  'svg': 'markup',
  
  // Documentation
  'md': 'markdown',
  'mdx': 'markdown',
  
  // Backend
  'py': 'python',
  'pyw': 'python',
  'pyi': 'python',
  'java': 'java',
  'php': 'php',
  'rb': 'ruby',
  'go': 'go',
  'rs': 'rust',
  'swift': 'swift',
  'kt': 'kotlin',
  'kts': 'kotlin',
  'cs': 'csharp',
  
  // C family
  'c': 'c',
  'h': 'c',
  'cpp': 'cpp',
  'cc': 'cpp',
  'cxx': 'cpp',
  'hpp': 'cpp',
  'hxx': 'cpp',
  
  // Shell
  'sh': 'bash',
  'bash': 'bash',
  'zsh': 'bash',
  'fish': 'bash',
  
  // Database
  'sql': 'sql',
  
  // Container
  'dockerfile': 'docker',
  
  // Other
  'git': 'git',
  'diff': 'diff',
  'patch': 'diff',
};

/**
 * File name to language mapping (for files without extensions)
 * @type {Object.<string, string>}
 */
const FILENAME_TO_LANGUAGE = {
  'dockerfile': 'docker',
  'makefile': 'bash',
  'cmakelists.txt': 'bash',
  '.bashrc': 'bash',
  '.bash_profile': 'bash',
  '.zshrc': 'bash',
  '.gitignore': 'git',
  '.gitattributes': 'git',
  '.gitmodules': 'git',
};

/**
 * Detect language from file path
 * @param {string} filePath - Path to file
 * @returns {string|null} Prism language name or null
 */
function detectLanguage(filePath) {
  if (!filePath) return null;
  
  const fileName = filePath.toLowerCase().split('/').pop();
  
  // Check exact filename match first
  if (FILENAME_TO_LANGUAGE[fileName]) {
    return FILENAME_TO_LANGUAGE[fileName];
  }
  
  // Extract extension
  const ext = fileName.split('.').pop();
  
  // Check extension mapping
  if (ext && EXTENSION_TO_LANGUAGE[ext]) {
    return EXTENSION_TO_LANGUAGE[ext];
  }
  
  return null;
}

/**
 * Highlight code using Prism
 * @param {string} code - Code to highlight
 * @param {string} language - Prism language name
 * @returns {string} HTML string with syntax highlighting
 */
function highlightCode(code, language) {
  if (!language || !Prism.languages[language]) {
    // Escape HTML if no language
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  
  try {
    return Prism.highlight(code, Prism.languages[language], language);
  } catch (err) {
    console.error('Prism highlight error:', err);
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

/**
 * Code editor with syntax highlighting using Prism.js
 *
 * Features:
 * - Syntax highlighting for 30+ languages
 * - Line numbers
 * - Scroll synchronization between textarea and highlight overlay
 * - Auto-detect language from file extension
 * - Dark mode support (via Prism themes)
 * - Monospace font from theme (--font-mono)
 *
 * @param {Object} props - Component props
 * @param {string} props.value - Current content
 * @param {function(string): void} props.onChange - Content change handler
 * @param {string} props.filePath - File path (for language detection)
 * @param {string} [props.language] - Override language detection
 * @param {boolean} [props.readOnly=false] - Read-only mode
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.showLineNumbers=true] - Show line numbers
 *
 * @example
 * <CodeEditor
 *   value={content}
 *   onChange={setContent}
 *   filePath="src/components/Button.jsx"
 * />
 */
export function CodeEditor({
  value,
  onChange,
  filePath,
  language: languageOverride,
  readOnly = false,
  className,
  showLineNumbers = true,
}) {
  const textareaRef = useRef(null);
  const preRef = useRef(null);
  const lineNumberRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  // Detect language from file path or use override
  const detectedLanguage = useMemo(() => {
    return languageOverride || detectLanguage(filePath);
  }, [filePath, languageOverride]);
  
  // Highlight code
  const highlightedCode = useMemo(() => {
    return highlightCode(value, detectedLanguage);
  }, [value, detectedLanguage]);
  
  // Count lines
  const lineCount = useMemo(() => {
    return value.split('\n').length;
  }, [value]);
  
  // Handle scroll synchronization
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollLeft } = e.target;
    setScrollTop(scrollTop);
    setScrollLeft(scrollLeft);
    
    // Sync scroll with highlight overlay
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    
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
    // Tab key inserts spaces (not implemented - would need selection handling)
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
      
      {/* Editor container */}
      <div className="relative flex-1 overflow-hidden">
        {/* Highlight overlay */}
        <pre
          ref={preRef}
          className="absolute inset-0 m-0 p-4 overflow-auto pointer-events-none"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            lineHeight: '1.5rem',
            background: 'transparent',
            color: 'transparent',
          }}
          aria-hidden="true"
        >
          <code
            className={cx(detectedLanguage && `language-${detectedLanguage}`)}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
            style={{
              display: 'block',
              whiteSpace: 'pre',
              color: 'var(--color-text-primary)',
            }}
          />
        </pre>
        
        {/* Textarea (transparent, on top) */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          className="absolute inset-0 w-full h-full p-4 bg-transparent resize-none outline-none"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            lineHeight: '1.5rem',
            color: 'var(--color-text-primary)',
            caretColor: 'var(--color-text-primary)',
            WebkitTextFillColor: 'transparent',
            whiteSpace: 'pre',
            overflowWrap: 'normal',
            overflowX: 'auto',
          }}
        />
      </div>
    </div>
  );
}
