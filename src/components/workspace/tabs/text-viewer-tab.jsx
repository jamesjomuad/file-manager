'use client';

import { useState, useEffect, memo } from 'react';
import { cx } from '@/utils/cx';

/**
 * Text viewer tab — displays read-only text files with line numbers
 *
 * Used for plain text, markdown, logs, CSV, etc. where Monaco editing
 * isn't needed. Shows content in a scrollable, monospaced layout.
 *
 * @param {Object} props
 * @param {Object} props.tab - The workspace tab object
 */
export const TextViewerTabContent = memo(function TextViewerTabContent({ tab }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    return () => { cancelled = true; };
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

  const lines = content.split('\n');

  return (
    <div className="flex h-full overflow-hidden bg-background-secondary-default">
      {/* Line numbers */}
      <div
        className="shrink-0 text-end select-none px-3 py-3 text-caption-2-regular text-text-tertiary bg-background-primary-default border-e border-border-subtle overflow-hidden"
        aria-hidden="true"
      >
        {lines.map((_, i) => (
          <div key={i} className="leading-6">{i + 1}</div>
        ))}
      </div>

      {/* Content */}
      <pre className="flex-1 overflow-auto p-3 text-caption-1-regular text-text-primary font-mono leading-6 whitespace-pre-wrap break-words">
        {content || <span className="text-text-tertiary italic">Empty file</span>}
      </pre>
    </div>
  );
});
