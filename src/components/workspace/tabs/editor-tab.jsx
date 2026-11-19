"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { MonacoEditor } from "@/components/editor/monaco-editor";
import { Button } from "@/components/base/buttons/button";
import { useWorkspace } from "@/contexts/workspace-context";
import { detectLanguage, getLanguageName } from "@/lib/monaco/languages";
import {
  RiSaveLine,
  RiCloseLine,
  RiArrowGoBackLine,
} from "@remixicon/react";

/**
 * Editor tab content component.
 * Renders Monaco Editor for a single file within the workspace tab system.
 *
 * @param {Object} props
 * @param {Object} props.tab - The workspace tab object
 */
export function EditorTabContent({ tab }) {
  const { setTabDirty, closeTab } = useWorkspace();
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const contentRef = useRef(content);
  const originalRef = useRef(originalContent);

  // Keep refs in sync
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    originalRef.current = originalContent;
  }, [originalContent]);

  // Load file content
  useEffect(() => {
    if (!tab.path) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/files/${tab.path}?action=read`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) {
          throw new Error(data.error || "Failed to read file");
        }
        const fileContent = data.data.content || "";
        setContent(fileContent);
        setOriginalContent(fileContent);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab.path]);

  /**
   * Handle content change
   */
  const handleContentChange = useCallback(
    (newContent) => {
      setContent(newContent);
      const dirty = newContent !== originalRef.current;
      setTabDirty(tab.id, dirty);
    },
    [tab.id, setTabDirty]
  );

  /**
   * Save the file
   */
  const handleSave = useCallback(async () => {
    if (!tab.path) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/files/${tab.path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentRef.current }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to save file");
      }

      // Update original content and clear dirty
      const currentContent = contentRef.current;
      setOriginalContent(currentContent);
      setTabDirty(tab.id, false);
    } catch (err) {
      console.error("Failed to save:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [tab.path, tab.id, setTabDirty]);

  /**
   * Discard changes
   */
  const handleDiscard = useCallback(() => {
    setContent(originalRef.current);
    setTabDirty(tab.id, false);
  }, [tab.id, setTabDirty]);

  /**
   * Close this tab
   */
  const handleClose = useCallback(() => {
    closeTab(tab.id);
  }, [tab.id, closeTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd+S — Save
      if (isMod && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  const hasUnsavedChanges = content !== originalContent;
  const languageName = getLanguageName(detectLanguage(tab.path || ""));

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-body-medium text-text-error">{error}</p>
        <Button variant="secondary" size="small" onClick={handleClose}>
          Close Tab
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor action bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-separator-border bg-background-primary-default">
        <div className="flex items-center gap-2">
          <span className="text-caption-1-regular text-text-tertiary">
            {languageName}
          </span>
          {hasUnsavedChanges && (
            <span className="text-caption-1-regular text-text-tertiary">
              • unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="small"
            onClick={handleDiscard}
            disabled={!hasUnsavedChanges}
            leadingIcon={RiArrowGoBackLine}
          >
            Discard
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saving}
            leadingIcon={RiSaveLine}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          value={content}
          onChange={handleContentChange}
          filePath={tab.path}
        />
      </div>
    </div>
  );
}
