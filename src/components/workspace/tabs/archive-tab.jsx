"use client";

import { useState, useEffect, useCallback } from "react";
import { cx } from "@/utils/cx";
import {
  RiFileLine,
  RiFolderLine,
  RiFileDownloadLine,
  RiArrowLeftLine,
  RiLoaderLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";

/**
 * Archive browser tab component
 * 
 * Displays the contents of a ZIP archive in a two-panel layout:
 * - Left: Tree view of directories and files
 * - Right: Preview of selected file (text shown inline, binary shows download)
 * 
 * @param {Object} props
 * @param {Object} props.tab - Tab object with path and state
 * @param {Function} props.onNavigate - Callback for gallery navigation (unused here)
 */
export function ArchiveTabContent({ tab, onNavigate }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPath, setCurrentPath] = useState("");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Load archive listing
  useEffect(() => {
    if (!tab.path) return;

    async function loadArchive() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/files/archive?path=${encodeURIComponent(tab.path)}`
        );
        if (!response.ok) {
          throw new Error(`Failed to load archive: ${response.statusText}`);
        }
        const data = await response.json();
        setEntries(data.entries || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadArchive();
  }, [tab.path]);

  // Navigate into a directory
  const handleDirectoryClick = useCallback((entryPath) => {
    setCurrentPath(entryPath);
    setSelectedEntry(null);
    setPreviewContent(null);
  }, []);

  // Navigate up
  const handleNavigateUp = useCallback(() => {
    const parentPath = currentPath.split("/").slice(0, -1).join("/");
    setCurrentPath(parentPath);
    setSelectedEntry(null);
    setPreviewContent(null);
  }, [currentPath]);

  // Select a file for preview
  const handleFileClick = useCallback(async (entry) => {
    setSelectedEntry(entry);
    
    // Try to load text preview
    const ext = entry.name.split(".").pop()?.toLowerCase();
    const textExtensions = [
      "txt", "md", "js", "jsx", "ts", "tsx", "json", "css", "scss", "html",
      "xml", "yaml", "yml", "py", "rb", "php", "java", "c", "cpp", "h", "hpp",
      "cs", "go", "rs", "swift", "kt", "sql", "sh", "bash", "bat", "ps1",
    ];

    if (textExtensions.includes(ext)) {
      try {
        setPreviewLoading(true);
        const response = await fetch(
          `/api/files/archive?path=${encodeURIComponent(tab.path)}&entry=${encodeURIComponent(entry.path)}`
        );
        if (!response.ok) throw new Error("Failed to load file");
        const data = await response.json();
        setPreviewContent({ type: "text", content: data.content });
      } catch (err) {
        setPreviewContent({ type: "error", message: err.message });
      } finally {
        setPreviewLoading(false);
      }
    } else {
      setPreviewContent({ type: "binary", entry });
    }
  }, [tab.path]);

  // Extract/download a file
  const handleExtract = useCallback(async (entry) => {
    try {
      const response = await fetch(
        `/api/files/archive?path=${encodeURIComponent(tab.path)}&entry=${encodeURIComponent(entry.path)}`
      );
      if (!response.ok) throw new Error("Failed to extract file");
      const data = await response.json();

      let blob;
      if (data.encoding === "base64") {
        // Binary file
        const byteCharacters = atob(data.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: data.contentType });
      } else {
        // Text file
        blob = new Blob([data.content], { type: data.contentType });
      }

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = entry.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Extract error:", err);
    }
  }, [tab.path]);

  // Filter entries by current path
  const visibleEntries = entries.filter((entry) => {
    if (!currentPath) {
      // Root level: show entries with no parent or parent is empty
      return !entry.parentPath || entry.parentPath === "";
    }
    // Show direct children of currentPath
    return entry.parentPath === currentPath;
  });

  // Sort: directories first, then files
  const sortedEntries = [...visibleEntries].sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  // Breadcrumb parts
  const breadcrumbParts = currentPath ? currentPath.split("/") : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RiLoaderLine className="w-6 h-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-body-regular text-text-error mb-2">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left panel: Tree view */}
      <div className="w-80 border-e border-border-primary-default flex flex-col">
        {/* Breadcrumb */}
        <div className="px-3 py-2 border-b border-border-primary-default flex items-center gap-2">
          {currentPath && (
            <Button
              variant="ghost"
              size="small"
              leadingIcon={RiArrowLeftLine}
              onClick={handleNavigateUp}
            >
              Up
            </Button>
          )}
          <div className="flex items-center gap-1 text-caption-1-regular text-text-secondary">
            <span>/</span>
            {breadcrumbParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                <span>{part}</span>
                {i < breadcrumbParts.length - 1 && <span>/</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto">
          {sortedEntries.length === 0 ? (
            <div className="px-3 py-4 text-caption-1-regular text-text-tertiary text-center">
              Empty directory
            </div>
          ) : (
            sortedEntries.map((entry, index) => (
              <div
                key={index}
                className={cx(
                  "px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors",
                  "hover:bg-background-secondary-hover",
                  selectedEntry?.path === entry.path && "bg-background-selection"
                )}
                onClick={() => {
                  if (entry.type === "directory") {
                    handleDirectoryClick(entry.path);
                  } else {
                    handleFileClick(entry);
                  }
                }}
              >
                {entry.type === "directory" ? (
                  <RiFolderLine className="w-4 h-4 text-foreground-icon-accent shrink-0" />
                ) : (
                  <RiFileLine className="w-4 h-4 text-foreground-icon-accent shrink-0" />
                )}
                <span className="text-caption-1-regular text-text-primary truncate">
                  {entry.name}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Metadata */}
        <div className="px-3 py-2 border-t border-border-primary-default text-caption-2-regular text-text-tertiary">
          {entries.length} items
        </div>
      </div>

      {/* Right panel: Preview */}
      <div className="flex-1 flex flex-col">
        {selectedEntry ? (
          <>
            {/* Header */}
            <div className="px-4 py-2 border-b border-border-primary-default flex items-center justify-between">
              <div className="text-body-regular text-text-primary">
                {selectedEntry.name}
              </div>
              <Button
                variant="ghost"
                size="small"
                leadingIcon={RiFileDownloadLine}
                onClick={() => handleExtract(selectedEntry)}
              >
                Extract
              </Button>
            </div>

            {/* Preview content */}
            <div className="flex-1 overflow-auto">
              {previewLoading ? (
                <div className="flex items-center justify-center h-full">
                  <RiLoaderLine className="w-6 h-6 animate-spin text-text-secondary" />
                </div>
              ) : previewContent?.type === "text" ? (
                <pre className="p-4 text-caption-1-regular text-text-primary font-mono whitespace-pre-wrap">
                  {previewContent.content}
                </pre>
              ) : previewContent?.type === "binary" ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <RiFileLine className="w-12 h-12 text-text-tertiary mx-auto mb-2" />
                    <div className="text-body-regular text-text-secondary mb-4">
                      Binary file
                    </div>
                    <Button
                      variant="primary"
                      leadingIcon={RiFileDownloadLine}
                      onClick={() => handleExtract(selectedEntry)}
                    >
                      Download File
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-caption-1-regular text-text-tertiary">
                    Select a file to preview
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-caption-1-regular text-text-tertiary">
              Select a file to preview
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
