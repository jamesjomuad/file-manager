"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cx } from "@/utils/cx";
import {
  RiFileLine,
  RiFileDownloadLine,
  RiFolderDownloadLine,
  RiArrowLeftLine,
  RiLoaderLine,
  RiCheckboxBlankLine,
  RiCheckboxFill,
  RiSearchLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { ExtractDialog } from "@/components/archive/extract-dialog";
import { FileIcon } from "@/components/file-manager/file-icon";

/**
 * Format bytes to human-readable string
 * @param {number} bytes
 * @returns {string}
 */
function formatSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Text file extensions for preview
 */
const TEXT_EXTENSIONS = new Set([
  "txt", "md", "js", "jsx", "ts", "tsx", "json", "css", "scss", "less", "html",
  "xml", "yaml", "yml", "py", "rb", "php", "java", "c", "cpp", "h", "hpp",
  "cs", "go", "rs", "swift", "kt", "sql", "sh", "bash", "bat", "ps1",
  "toml", "ini", "cfg", "conf", "env", "log", "csv", "svg",
]);

/**
 * Check if a file extension is text
 * @param {string} filename
 * @returns {boolean}
 */
function isTextFile(filename) {
  const ext = filename?.split(".").pop()?.toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

/**
 * Archive browser tab component
 * 
 * Displays the contents of a ZIP archive in a two-panel layout:
 * - Left: Tree view with multi-select, search
 * - Right: Preview of selected file (text shown inline, binary shows download)
 * - Extract selected entries to filesystem via ExtractDialog
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
  const [selectedEntries, setSelectedEntries] = useState(new Set());
  const [previewContent, setPreviewContent] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [extractDialog, setExtractDialog] = useState(null);

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
    setSelectedEntries(new Set());
  }, []);

  // Navigate up
  const handleNavigateUp = useCallback(() => {
    const parentPath = currentPath.split("/").slice(0, -1).join("/");
    setCurrentPath(parentPath);
    setSelectedEntry(null);
    setPreviewContent(null);
    setSelectedEntries(new Set());
  }, [currentPath]);

  // Select a file for preview
  const handleFileClick = useCallback(async (entry, event) => {
    // Multi-select with Ctrl/Shift
    if (event?.ctrlKey || event?.metaKey) {
      setSelectedEntries(prev => {
        const next = new Set(prev);
        if (next.has(entry.path)) next.delete(entry.path);
        else next.add(entry.path);
        return next;
      });
      return;
    }

    setSelectedEntry(entry);
    setSelectedEntries(new Set([entry.path]));
    
    if (isTextFile(entry.name)) {
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
      // Check if it's an image
      const ext = entry.name.split(".").pop()?.toLowerCase();
      const imageExts = ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"];
      if (imageExts.includes(ext)) {
        try {
          setPreviewLoading(true);
          const response = await fetch(
            `/api/files/archive?path=${encodeURIComponent(tab.path)}&entry=${encodeURIComponent(entry.path)}`
          );
          if (!response.ok) throw new Error("Failed to load image");
          const data = await response.json();
          let dataUrl;
          if (data.encoding === "base64") {
            dataUrl = `data:${data.contentType};base64,${data.content}`;
          } else {
            dataUrl = `data:${data.contentType},${encodeURIComponent(data.content)}`;
          }
          setPreviewContent({ type: "image", src: dataUrl, name: entry.name });
        } catch (err) {
          setPreviewContent({ type: "error", message: err.message });
        } finally {
          setPreviewLoading(false);
        }
      } else {
        setPreviewContent({ type: "binary", entry });
      }
    }
  }, [tab.path]);

  // Toggle selection for an entry
  const handleToggleSelect = useCallback((entry) => {
    setSelectedEntries(prev => {
      const next = new Set(prev);
      if (next.has(entry.path)) next.delete(entry.path);
      else next.add(entry.path);
      return next;
    });
  }, []);

  // Select all visible entries
  const handleSelectAll = useCallback(() => {
    const visiblePaths = sortedEntries
      .filter(e => e.type === "file")
      .map(e => e.path);
    setSelectedEntries(new Set(visiblePaths));
  }, []);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedEntries(new Set());
    setSelectedEntry(null);
    setPreviewContent(null);
  }, []);

  // Extract/download a single file as browser download
  const handleDownload = useCallback(async (entry) => {
    try {
      const response = await fetch(
        `/api/files/archive?path=${encodeURIComponent(tab.path)}&entry=${encodeURIComponent(entry.path)}`
      );
      if (!response.ok) throw new Error("Failed to extract file");
      const data = await response.json();

      let blob;
      if (data.encoding === "base64") {
        const byteCharacters = atob(data.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: data.contentType });
      } else {
        blob = new Blob([data.content], { type: data.contentType });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = entry.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    }
  }, [tab.path]);

  // Extract selected entries to filesystem
  const handleExtractTo = useCallback(() => {
    const archiveName = tab.path?.split("/").pop() || tab.title || "archive.zip";
    const entryList = selectedEntries.size > 0
      ? Array.from(selectedEntries).map(p => {
          const entry = entries.find(e => e.path === p);
          return entry ? entry.path : p;
        })
      : undefined; // undefined = extract all

    setExtractDialog({
      archivePath: tab.path,
      archiveName,
      selectedEntries: entryList,
    });
  }, [tab.path, tab.title, selectedEntries, entries]);

  // Filter entries by current path
  const visibleEntries = useMemo(() => {
    let filtered = entries.filter((entry) => {
      if (!currentPath) {
        return !entry.parentPath || entry.parentPath === "";
      }
      return entry.parentPath === currentPath;
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = entries.filter(entry =>
        entry.name.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [entries, currentPath, searchQuery]);

  // Sort: directories first, then files
  const sortedEntries = useMemo(() => {
    return [...visibleEntries].sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [visibleEntries]);

  // Compute stats
  const stats = useMemo(() => {
    const files = entries.filter(e => e.type === "file");
    const folders = entries.filter(e => e.type === "directory");
    const totalSize = files.reduce((sum, e) => sum + (e.size || 0), 0);
    const totalCompressed = files.reduce((sum, e) => sum + (e.compressedSize || 0), 0);
    return { files: files.length, folders: folders.length, totalSize, totalCompressed };
  }, [entries]);

  // Breadcrumb parts
  const breadcrumbParts = currentPath ? currentPath.split("/") : [];

  // Selected entries that are files
  const selectedFileCount = useMemo(() => {
    return Array.from(selectedEntries).filter(p => {
      const entry = entries.find(e => e.path === p);
      return entry?.type === "file";
    }).length;
  }, [selectedEntries, entries]);

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
        {/* Toolbar */}
        <div className="px-3 py-2 border-b border-border-primary-default flex flex-col gap-2">
          {/* Breadcrumb row */}
          <div className="flex items-center gap-2">
            {currentPath && (
              <Button
                variant="ghost"
                size="small"
                iconOnly
                leadingIcon={RiArrowLeftLine}
                onClick={handleNavigateUp}
                aria-label="Go up"
              />
            )}
            <div className="flex items-center gap-1 text-caption-1-regular text-text-secondary min-w-0">
              <span>/</span>
              {breadcrumbParts.map((part, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="truncate">{part}</span>
                  {i < breadcrumbParts.length - 1 && <span>/</span>}
                </span>
              ))}
            </div>
          </div>

          {/* Search + selection actions */}
          <div className="flex items-center gap-2">
            <Input
              size="small"
              leadingIcon={RiSearchLine}
              placeholder="Search in archive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              aria-label="Search archive"
            />
          </div>

          {/* Selection actions */}
          {selectedEntries.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-caption-2-regular text-text-secondary">
                {selectedEntries.size} selected
              </span>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="small"
                iconOnly
                leadingIcon={RiCheckboxFill}
                onClick={handleClearSelection}
                aria-label="Clear selection"
              />
              <Button
                variant="secondary"
                size="small"
                leadingIcon={RiFolderDownloadLine}
                onClick={handleExtractTo}
              >
                Extract
              </Button>
            </div>
          )}
        </div>

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto">
          {sortedEntries.length === 0 ? (
            <div className="px-3 py-4 text-caption-1-regular text-text-tertiary text-center">
              {searchQuery ? "No matches" : "Empty directory"}
            </div>
          ) : (
            sortedEntries.map((entry, index) => {
              const isSelected = selectedEntries.has(entry.path);
              const isActive = selectedEntry?.path === entry.path;

              return (
                <div
                  key={index}
                  className={cx(
                    "px-3 py-1.5 flex items-center gap-2 cursor-pointer transition-colors group",
                    "hover:bg-background-secondary-hover",
                    isActive && "bg-background-selection"
                  )}
                  onClick={(e) => {
                    if (entry.type === "directory") {
                      handleDirectoryClick(entry.path);
                    } else {
                      handleFileClick(entry, e);
                    }
                  }}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={isSelected ? { opacity: 1 } : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(entry);
                    }}
                    aria-label={isSelected ? "Deselect" : "Select"}
                  >
                    {isSelected ? (
                      <RiCheckboxFill className="w-4 h-4 text-accent-500" />
                    ) : (
                      <RiCheckboxBlankLine className="w-4 h-4 text-text-tertiary" />
                    )}
                  </button>

                  <FileIcon type={entry.type} name={entry.name} size="sm" className="shrink-0" />
                  <span className="text-caption-1-regular text-text-primary truncate flex-1">
                    {entry.name}
                  </span>
                  {entry.type === "file" && entry.size != null && (
                    <span className="text-caption-2-regular text-text-tertiary shrink-0">
                      {formatSize(entry.size)}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Metadata footer */}
        <div className="px-3 py-2 border-t border-border-primary-default flex items-center justify-between text-caption-2-regular text-text-tertiary">
          <span>{stats.files} files, {stats.folders} folders</span>
          <span>{formatSize(stats.totalSize)}</span>
        </div>

        {/* Extract all button */}
        <div className="px-3 py-2 border-t border-border-primary-default">
          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiFolderDownloadLine}
            onClick={handleExtractTo}
            className="w-full"
          >
            Extract All to Filesystem
          </Button>
        </div>
      </div>

      {/* Right panel: Preview */}
      <div className="flex-1 flex flex-col">
        {selectedEntry ? (
          <>
            {/* Header */}
            <div className="px-4 py-2 border-b border-border-primary-default flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-body-regular text-text-primary truncate">
                  {selectedEntry.name}
                </span>
                {selectedEntry.size != null && (
                  <span className="text-caption-2-regular text-text-tertiary shrink-0">
                    {formatSize(selectedEntry.size)}
                    {selectedEntry.compressedSize != null && (
                      <span className="ms-1">
                        ({formatSize(selectedEntry.compressedSize)} compressed)
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="small"
                  leadingIcon={RiFileDownloadLine}
                  onClick={() => handleDownload(selectedEntry)}
                >
                  Download
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  leadingIcon={RiFolderDownloadLine}
                  onClick={handleExtractTo}
                >
                  Extract to...
                </Button>
              </div>
            </div>

            {/* Preview content */}
            <div className="flex-1 overflow-auto">
              {previewLoading ? (
                <div className="flex items-center justify-center h-full">
                  <RiLoaderLine className="w-6 h-6 animate-spin text-text-secondary" />
                </div>
              ) : previewContent?.type === "text" ? (
                <div className="h-full flex">
                  {/* Line numbers */}
                  <div className="select-none py-4 px-2 text-end text-caption-2-regular text-text-tertiary bg-background-secondary-default border-e border-border-primary-default font-mono leading-5">
                    {previewContent.content.split("\n").map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <pre className="flex-1 p-4 text-caption-1-regular text-text-primary font-mono whitespace-pre-wrap leading-5 overflow-auto">
                    {previewContent.content}
                  </pre>
                </div>
              ) : previewContent?.type === "image" ? (
                <div className="flex items-center justify-center h-full p-4">
                  <img
                    src={previewContent.src}
                    alt={previewContent.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : previewContent?.type === "binary" ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <RiFileLine className="w-12 h-12 text-text-tertiary mx-auto mb-2" />
                    <div className="text-body-regular text-text-secondary mb-1">
                      {previewContent.entry.name}
                    </div>
                    <div className="text-caption-1-regular text-text-tertiary mb-4">
                      {formatSize(previewContent.entry.size)} — Binary file
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        leadingIcon={RiFileDownloadLine}
                        onClick={() => handleDownload(previewContent.entry)}
                      >
                        Download
                      </Button>
                      <Button
                        variant="primary"
                        leadingIcon={RiFolderDownloadLine}
                        onClick={handleExtractTo}
                      >
                        Extract to Filesystem
                      </Button>
                    </div>
                  </div>
                </div>
              ) : previewContent?.type === "error" ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-body-regular text-text-error mb-2">
                      {previewContent.message}
                    </div>
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
            <div className="text-center">
              <RiFileLine className="w-12 h-12 text-text-tertiary mx-auto mb-2" />
              <div className="text-caption-1-regular text-text-tertiary">
                Select a file to preview
              </div>
              {stats.files > 0 && (
                <div className="text-caption-2-regular text-text-tertiary mt-2">
                  {stats.files} files ({formatSize(stats.totalSize)})
                  {stats.totalCompressed > 0 && (
                    <span> — {formatSize(stats.totalCompressed)} compressed</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Extract dialog */}
      <ExtractDialog
        open={!!extractDialog}
        archivePath={extractDialog?.archivePath || ""}
        archiveName={extractDialog?.archiveName || ""}
        selectedEntries={extractDialog?.selectedEntries}
        currentPath=""
        onClose={() => setExtractDialog(null)}
        onComplete={() => {
          // No-op here — archive tab doesn't auto-refresh parent explorer
        }}
      />
    </div>
  );
}
