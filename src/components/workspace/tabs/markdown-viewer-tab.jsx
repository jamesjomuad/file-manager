'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import { MarkdownViewer } from '@/components/markdown/markdown-viewer';
import { useWorkspace } from '@/contexts/workspace-context';

/**
 * Markdown viewer tab — renders markdown with GitHub-style formatting
 *
 * Loads markdown content from the filesystem and renders it with
 * syntax-highlighted code blocks, tables, task lists, and more.
 *
 * @param {Object} props
 * @param {Object} props.tab - The workspace tab object
 */
export const MarkdownViewerTabContent = memo(function MarkdownViewerTabContent({ tab }) {
  const { updateTabState } = useWorkspace();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Derive directory path for resolving relative images
  const directoryPath = tab.path
    ? tab.path.replace(/\\/g, '/').replace(/\/[^/]+$/, '')
    : '';

  useEffect(() => {
    let cancelled = false;

    async function loadContent() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/files/${tab.path}?action=read`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to read file (${res.status})`);
        }
        const data = await res.json();
        if (!cancelled) {
          setContent(data.data?.content || '');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadContent();
    return () => {
      cancelled = true;
    };
  }, [tab.path]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-text-tertiary">
          <div className="w-5 h-5 border-2 border-text-tertiary border-t-text-primary rounded-full animate-spin" />
          <span className="text-body-regular">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-body-regular text-text-primary mb-1">Failed to load file</p>
          <p className="text-caption-1-regular text-text-tertiary">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <MarkdownViewer
      content={content}
      fileName={tab.title}
      filePath={tab.path}
      directoryPath={directoryPath}
    />
  );
});
