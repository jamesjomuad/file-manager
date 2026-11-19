'use client';

import { useState, useCallback, useEffect, memo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { cx } from '@/utils/cx';
import { Button } from '@/components/base/buttons/button';
import { ButtonGroup } from '@/components/base/buttons/button-group';
import {
  RiCodeBoxLine,
  RiEyeLine,
  RiSplitCellsVertical,
  RiDownloadLine,
  RiFileTextLine,
} from '@remixicon/react';
import { copyToClipboard } from '@/lib/clipboard';
import { toast } from '@/components/base/toast/toast';
import '@/styles/markdown.css';

// Import highlight.js themes
import 'highlight.js/styles/github.css';

/**
 * Markdown viewer component
 *
 * Renders Markdown content with GitHub-style formatting, syntax-highlighted
 * code blocks, task lists, tables, and other GFM features.
 *
 * Supports three view modes:
 * - preview: Rendered markdown only
 * - source: Raw markdown with line numbers
 * - split: Side-by-side source and preview
 *
 * @param {Object} props
 * @param {string} props.content - Raw markdown content
 * @param {string} props.fileName - File name for display/download
 * @param {string} [props.filePath] - File path for resolving relative images
 * @param {string} [props.directoryPath] - Directory containing the file
 */
export const MarkdownViewer = memo(function MarkdownViewer({
  content,
  fileName,
  filePath,
  directoryPath,
}) {
  const [viewMode, setViewMode] = useState('preview'); // 'preview' | 'source' | 'split'
  const [copyingBlock, setCopyingBlock] = useState(null);
  const previewRef = useRef(null);

  // --------------------------------------------------------------------------
  // Download
  // --------------------------------------------------------------------------

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'document.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [content, fileName]);

  // --------------------------------------------------------------------------
  // Custom renderers
  // --------------------------------------------------------------------------

  /**
   * Custom code block renderer with copy button
   */
  const CodeBlock = useCallback(({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const codeText = String(children).replace(/\n$/, '');

    if (inline || !match) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }

    const blockId = `code-${node?.position?.start?.line || Math.random()}`;
    const isCopying = copyingBlock === blockId;

    const handleCopy = async () => {
      const success = await copyToClipboard(codeText);
      if (success) {
        setCopyingBlock(blockId);
        toast.success('Code copied to clipboard');
        setTimeout(() => setCopyingBlock(null), 2000);
      } else {
        toast.error('Failed to copy');
      }
    };

    return (
      <div className="code-block-wrapper">
        <button
          className="copy-button"
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {isCopying ? '✓ Copied' : 'Copy'}
        </button>
        <pre className={className} {...props}>
          <code className={`hljs language-${match[1]}`}>{children}</code>
        </pre>
      </div>
    );
  }, [copyingBlock]);

  /**
   * Custom image renderer that resolves relative paths
   */
  const ImageRenderer = useCallback(
    ({ src, alt, ...props }) => {
      let resolvedSrc = src;

      // Resolve relative URLs through the filesystem API
      if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
        if (directoryPath) {
          const relativeDir = directoryPath.replace(/\\/g, '/');
          const imagePath = `${relativeDir}/${src}`.replace(/\/+/g, '/');
          resolvedSrc = `/api/files/${imagePath}?action=download`;
        }
      }

      return <img src={resolvedSrc} alt={alt || ''} loading="lazy" {...props} />;
    },
    [directoryPath]
  );

  /**
   * Custom link renderer with security checks
   */
  const LinkRenderer = useCallback(({ href, children, ...props }) => {
    // Block dangerous protocols
    if (href && (href.startsWith('javascript:') || href.startsWith('vbscript:'))) {
      return <span className="text-text-tertiary line-through">{children}</span>;
    }

    const isExternal =
      href && (href.startsWith('http://') || href.startsWith('https://'));

    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        {...props}
      >
        {children}
      </a>
    );
  }, []);

  // --------------------------------------------------------------------------
  // Render source view
  // --------------------------------------------------------------------------

  const renderSource = () => {
    const lines = content.split('\n');
    return (
      <div className="flex h-full overflow-hidden bg-background-secondary-default">
        {/* Line numbers */}
        <div
          className="shrink-0 text-end select-none px-3 py-3 text-caption-2-regular text-text-tertiary bg-background-primary-default border-e border-border-subtle overflow-hidden"
          aria-hidden="true"
        >
          {lines.map((_, i) => (
            <div key={i} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Content */}
        <pre className="flex-1 overflow-auto p-3 text-caption-1-regular text-text-primary font-mono leading-6 whitespace-pre-wrap break-words">
          {content || (
            <span className="text-text-tertiary italic">Empty file</span>
          )}
        </pre>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // Render preview
  // --------------------------------------------------------------------------

  const renderPreview = () => (
    <div
      ref={previewRef}
      className="flex-1 overflow-auto p-6 bg-background-primary-default"
    >
      <div className="markdown-body max-w-4xl mx-auto">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            code: CodeBlock,
            img: ImageRenderer,
            a: LinkRenderer,
          }}
        >
          {content || '*Empty file*'}
        </ReactMarkdown>
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // Main render
  // --------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-background-primary-default border-b border-border-subtle shadow-sm">
        {/* Left: View mode */}
        <div className="flex items-center gap-2">
          <ButtonGroup>
            <Button
              iconOnly
              selected={viewMode === 'preview'}
              onClick={() => setViewMode('preview')}
              leadingIcon={RiEyeLine}
              aria-label="Preview mode"
            >
              Preview
            </Button>
            <Button
              iconOnly
              selected={viewMode === 'split'}
              onClick={() => setViewMode('split')}
              leadingIcon={RiSplitCellsVertical}
              aria-label="Split view"
            >
              Split
            </Button>
            <Button
              iconOnly
              selected={viewMode === 'source'}
              onClick={() => setViewMode('source')}
              leadingIcon={RiCodeBoxLine}
              aria-label="Source mode"
            >
              Source
            </Button>
          </ButtonGroup>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            iconOnly
            onClick={handleDownload}
            leadingIcon={RiDownloadLine}
            aria-label="Download"
          >
            Download
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'preview' && renderPreview()}
      {viewMode === 'source' && renderSource()}
      {viewMode === 'split' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Source panel */}
          <div className="flex-1 overflow-hidden border-e border-border-subtle">
            {renderSource()}
          </div>
          {/* Preview panel */}
          <div className="flex-1 overflow-hidden">
            {renderPreview()}
          </div>
        </div>
      )}
    </div>
  );
});
