'use client';

/**
 * Monaco Editor wrapper component
 *
 * Integrates Monaco Editor into the File Manager with:
 * - Dynamic loading (no SSR)
 * - Theme integration (follows app theme via useTheme context)
 * - Language detection from file extension
 * - Full editor features: minimap, line numbers, folding, bracket matching,
 *   find/replace, word wrap, multi-cursor, etc.
 * - Read-only mode support
 * - Configurable font size
 *
 * Uses @monaco-editor/react for the React integration.
 * Monaco is loaded from CDN (jsDelivr) by default.
 */

import dynamic from 'next/dynamic';
import { useCallback, useRef, useEffect } from 'react';
import { monacoThemes } from '@/lib/monaco/monaco-themes';
import { detectLanguage } from '@/lib/monaco/languages';
import { useTheme } from '@/contexts/theme-context';

// Dynamically import Monaco to avoid SSR issues
const MonacoEditorLoader = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-background-primary-default">
        <div className="text-text-secondary text-body-regular">
          Loading editor...
        </div>
      </div>
    ),
  }
);

/**
 * Monaco Editor component for the File Manager.
 *
 * Automatically detects the language from the file path and applies
 * the current app theme to the editor.
 *
 * @param {Object} props - Component props
 * @param {string} props.value - Current content
 * @param {function(string): void} props.onChange - Content change handler
 * @param {string} props.filePath - File path (for language detection)
 * @param {string} [props.language] - Override language detection
 * @param {boolean} [props.readOnly=false] - Read-only mode
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.showMinimap=true] - Show minimap
 * @param {string} [props.wordWrap='off'] - Word wrap mode
 * @param {number} [props.fontSize=14] - Editor font size
 * @param {boolean} [props.showLineNumbers=true] - Show line numbers
 */
export function MonacoEditor({
  value,
  onChange,
  filePath,
  language: languageOverride,
  readOnly = false,
  className = '',
  showMinimap = true,
  wordWrap = 'off',
  fontSize = 14,
  showLineNumbers = true,
}) {
  const { currentTheme } = useTheme();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const themesRegisteredRef = useRef(false);

  // Detect language from file path or use override
  const detectedLanguage = languageOverride || detectLanguage(filePath);

  /**
   * Handle editor mount - register themes
   */
  const handleEditorMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register all themes once
    if (!themesRegisteredRef.current) {
      monacoThemes.forEach((theme) => {
        monaco.editor.defineTheme(theme.id, {
          base: theme.base,
          inherit: theme.inherit,
          rules: theme.rules,
          colors: theme.colors,
        });
      });
      themesRegisteredRef.current = true;
    }
  }, []);

  /**
   * Handle content change
   */
  const handleChange = useCallback(
    (newValue) => {
      if (onChange && newValue !== undefined) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  /**
   * Update editor theme when app theme changes
   */
  useEffect(() => {
    if (monacoRef.current && currentTheme) {
      monacoRef.current.editor.setTheme(currentTheme);
    }
  }, [currentTheme]);

  return (
    <div className={`h-full w-full ${className}`}>
      <MonacoEditorLoader
        height="100%"
        width="100%"
        language={detectedLanguage}
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme={currentTheme}
        options={{
          // Editor features
          readOnly,
          minimap: {
            enabled: showMinimap,
            maxColumn: 80,
            renderCharacters: true,
          },
          lineNumbers: showLineNumbers ? 'on' : 'off',
          wordWrap,
          fontSize,
          lineHeight: Math.round(fontSize * 1.6),
          fontFamily:
            '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontLigatures: true,

          // Code folding
          folding: true,
          foldingStrategy: 'indentation',
          showFoldingControls: 'mouseover',

          // Bracket matching
          matchBrackets: 'always',
          bracketPairColorization: {
            enabled: true,
          },

          // Indentation
          automaticLayout: true,
          autoIndent: 'full',
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: true,

          // Scrollbar
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            useShadows: false,
          },

          // Find and replace
          find: {
            addExtraSpaceOnTop: false,
            autoFindInSelection: 'never',
            seedSearchStringFromSelection: 'always',
          },

          // Selection
          selectOnLineNumbers: true,
          selectionHighlight: true,
          occurrencesHighlight: 'singleFile',

          // Cursor
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          cursorStyle: 'line',
          cursorWidth: 2,

          // Render
          renderWhitespace: 'selection',
          renderLineHighlight: 'all',
          renderLineHighlightOnlyWhenFocus: false,
          smoothScrolling: true,

          // Suggestions
          suggest: {
            showMethods: true,
            showFunctions: true,
            showConstructors: true,
            showFields: true,
            showVariables: true,
            showClasses: true,
            showStructs: true,
            showInterfaces: true,
            showModules: true,
            showProperties: true,
            showEnums: true,
            showConstants: true,
            showColors: true,
            showFolders: true,
            showReferences: true,
            showKeywords: true,
            showSnippets: true,
          },

          // Parameter hints
          parameterHints: {
            enabled: true,
            cycle: true,
          },

          // Format
          formatOnPaste: false,
          formatOnType: false,

          // Links
          links: true,

          // Color decorators
          colorDecorators: true,

          // Code lens
          codeLens: false,

          // Context menu
          contextmenu: true,

          // Mouse wheel
          mouseWheelZoom: true,

          // Drag and drop
          dragAndDrop: true,

          // Multi-cursor
          multiCursorModifier: 'altCmd',
        }}
      />
    </div>
  );
}
