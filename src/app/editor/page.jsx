'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { TabBar } from '@/components/editor/tab-bar';
import { CodeEditor } from '@/components/editor/code-editor';
import { TextEditor } from '@/components/editor/text-editor';
import { Button } from '@/components/base/buttons/button';
import { useEditorTabs } from '@/hooks/use-editor-tabs';
import { isCodeFile } from '@/lib/editor/file-types';
import {
  RiFileTextLine,
  RiSaveLine,
  RiCloseLine,
  RiArrowGoBackLine,
} from '@remixicon/react';

/**
 * File editor content component with multi-tab support.
 *
 * Uses the `useEditorTabs` hook to manage open file tabs, their content,
 * and unsaved changes. Renders a tab bar at the top and switches between
 * `CodeEditor` (for code files) and `TextEditor` (for plain text) based
 * on the active tab's file type.
 *
 * Keyboard shortcuts:
 * - Ctrl/Cmd+S — Save active tab
 * - Ctrl/Cmd+W — Close active tab
 * - Ctrl/Cmd+Shift+W — Close all tabs
 * - Ctrl/Cmd+Tab — Next tab
 * - Ctrl/Cmd+Shift+Tab — Previous tab
 */
function EditorContent() {
  const searchParams = useSearchParams();
  const filePath = searchParams.get('path');

  const {
    tabs,
    activeTab,
    activeTabIndex,
    openTab,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    switchTab,
    updateTabContent,
    saveTab,
    discardTabChanges,
    hasUnsavedChanges,
  } = useEditorTabs();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Open file from URL on mount (or when URL changes)
  useEffect(() => {
    if (!filePath) return;

    // Check if this file is already open
    const existingIndex = tabs.findIndex((t) => t.path === filePath);
    if (existingIndex !== -1) {
      // Already open, just switch to it
      switchTab(existingIndex);
    } else {
      // Open it in a new tab
      openTab(filePath);
    }
  }, [filePath]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Handle content change in the active tab.
   * @param {string} content - New content
   */
  const handleContentChange = (content) => {
    if (activeTabIndex >= 0) {
      updateTabContent(activeTabIndex, content);
    }
  };

  /**
   * Handle save action for the active tab.
   */
  const handleSave = useCallback(async () => {
    if (!activeTab || !activeTab.unsavedChanges) return;

    try {
      setSaving(true);
      await saveTab(activeTabIndex);
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to save:', error);
      // TODO: Show error toast
    } finally {
      setSaving(false);
    }
  }, [activeTab, activeTabIndex, saveTab]);

  /**
   * Handle discard changes for the active tab.
   */
  const handleDiscard = () => {
    if (!activeTab || !activeTab.unsavedChanges) return;
    discardTabChanges(activeTabIndex);
  };

  /**
   * Handle close active tab.
   */
  const handleCloseActive = () => {
    if (activeTabIndex >= 0) {
      closeTab(activeTabIndex);
    }
  };

  // Keyboard shortcut for Ctrl/Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd+S — Save active tab
      if (isMod && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Empty state — no tabs open
  if (tabs.length === 0) {
    return (
      <AppShell currentPath="/editor">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <RiFileTextLine className="w-16 h-16 text-foreground-icon-tertiary" />
          <div className="text-center">
            <p className="text-title-3-medium text-text-primary mb-2">
              No files open
            </p>
            <p className="text-body-regular text-text-secondary">
              Open a file from the File Explorer to start editing
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  // Loading state (file being fetched)
  if (!activeTab) {
    return (
      <AppShell currentPath="/editor">
        <TabBar
          tabs={tabs}
          activeIndex={activeTabIndex}
          onSwitchTab={switchTab}
          onCloseTab={closeTab}
          onCloseOthers={closeOtherTabs}
          onCloseAll={closeAllTabs}
        />
        <div className="flex items-center justify-center h-full">
          <div className="text-text-secondary">Loading...</div>
        </div>
      </AppShell>
    );
  }

  // Determine which editor to use based on file type
  const useCodeEditor = isCodeFile(activeTab.path);

  return (
    <AppShell currentPath="/editor">
      <div className="flex flex-col h-full">
        {/* Tab bar */}
        <TabBar
          tabs={tabs}
          activeIndex={activeTabIndex}
          onSwitchTab={switchTab}
          onCloseTab={closeTab}
          onCloseOthers={closeOtherTabs}
          onCloseAll={closeAllTabs}
        />

        {/* Editor header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-separator-border bg-background-primary-default">
          <div className="flex items-center gap-2">
            <RiFileTextLine className="w-5 h-5 text-foreground-icon-secondary" />
            <span className="text-body-medium text-text-primary">
              {activeTab.name}
            </span>
            {activeTab.unsavedChanges && (
              <span className="text-caption-1-regular text-text-tertiary">
                • unsaved changes
              </span>
            )}
            <span className="text-caption-1-regular text-text-tertiary">
              — {activeTab.language}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="small"
              onClick={handleDiscard}
              disabled={!activeTab.unsavedChanges}
              leadingIcon={RiArrowGoBackLine}
            >
              Discard
            </Button>
            <Button
              variant="ghost"
              size="small"
              onClick={handleSave}
              disabled={!activeTab.unsavedChanges || saving}
              leadingIcon={RiSaveLine}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="ghost"
              size="small"
              leadingIcon={RiCloseLine}
              onClick={handleCloseActive}
            >
              Close
            </Button>
          </div>
        </div>

        {/* Editor content */}
        <div className="flex-1 overflow-hidden">
          {useCodeEditor ? (
            <CodeEditor
              value={activeTab.content}
              onChange={handleContentChange}
              filePath={activeTab.path}
            />
          ) : (
            <TextEditor
              value={activeTab.content}
              onChange={handleContentChange}
            />
          )}
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
    <Suspense
      fallback={
        <AppShell currentPath="/editor">
          <div className="flex items-center justify-center h-full">
            <div className="text-text-secondary">Loading...</div>
          </div>
        </AppShell>
      }
    >
      <EditorContent />
    </Suspense>
  );
}
