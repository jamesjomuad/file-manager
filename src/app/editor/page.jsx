'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/base/buttons/button';
import { RiFileTextLine, RiCloseLine, RiSaveLine } from '@remixicon/react';

/**
 * File editor content component
 */
function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filePath = searchParams.get('path');
  const [fileData, setFileData] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!filePath) return;
    
    async function loadFile() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/files/${filePath}?action=read`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error);
        }
        
        setFileData({ name: data.data.path.split('/').pop(), path: data.data.path });
        setContent(data.data.content || '');
        setDirty(false);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadFile();
  }, [filePath]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const response = await fetch(`/api/files/${filePath}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error);
      }
      
      setDirty(false);
      // TODO: Show success toast
    } catch (err) {
      setError(err.message);
      // TODO: Show error toast
    } finally {
      setSaving(false);
    }
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
    setDirty(true);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <div className="text-text-secondary">Loading...</div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <div className="text-text-error-primary">Error: {error}</div>
        </div>
      </AppShell>
    );
  }

  if (!fileData) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <div className="text-text-secondary">No file selected</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        {/* Editor header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-separator-border bg-background-primary-default">
          <div className="flex items-center gap-2">
            <RiFileTextLine className="w-5 h-5 text-foreground-icon-secondary" />
            <span className="text-body-medium text-text-primary">{fileData.name}</span>
            {dirty && (
              <span className="text-caption-1-regular text-text-tertiary">(unsaved)</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="small"
              onClick={handleSave}
              disabled={!dirty || saving}
              leadingIcon={RiSaveLine}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="ghost"
              size="small"
              leadingIcon={RiCloseLine}
              onClick={() => router.back()}
            >
              Close
            </Button>
          </div>
        </div>

        {/* Editor content */}
        <div className="flex-1 overflow-hidden">
          <textarea
            value={content}
            onChange={handleContentChange}
            className="w-full h-full p-4 bg-background-primary-default text-text-primary text-body-regular font-mono resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>
      </div>
    </AppShell>
  );
}

/**
 * File editor page with Suspense boundary
 */
export default function EditorPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <div className="text-text-secondary">Loading...</div>
        </div>
      </AppShell>
    }>
      <EditorContent />
    </Suspense>
  );
}
