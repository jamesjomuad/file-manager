"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { FileToolbar } from "@/components/file-manager/file-toolbar";
import { FileList } from "@/components/file-manager/file-list";
import { FileGrid } from "@/components/file-manager/file-grid";
import { FileContextMenu } from "@/components/file-manager/file-context-menu";
import { FileDropZone } from "@/components/file-manager/file-drop-zone";
import { ConfirmDialog } from "@/components/file-manager/confirm-dialog";
import { FilePreviewModal } from "@/components/file-manager/file-preview-modal";
import { useFavorites } from "@/hooks/use-favorites";
import { useRecentFiles } from "@/hooks/use-recent-files";
import { canPreview } from "@/lib/file-type";

/**
 * Main file explorer page
 */
export default function FilesPage() {
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addRecent } = useRecentFiles();
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("name"); // name, size, modified, type
  const [sortOrder, setSortOrder] = useState("asc"); // asc, desc
  const [lastSelectedFile, setLastSelectedFile] = useState(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Preview modal state
  const [previewFile, setPreviewFile] = useState(null);

  /**
   * Fetch files for the current path
   */
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (currentPath) {
        params.set("path", currentPath);
      }
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const response = await fetch(`/api/files?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }

      const data = await response.json();
      setFiles(data.data || data.files || []);
    } catch (error) {
      console.error("Error fetching files:", error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [currentPath, searchQuery]);

  // Fetch files on mount and when path/search changes
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  /**
   * Sort files based on current sort criteria
   */
  const sortedFiles = useCallback(() => {
    const sorted = [...files].sort((a, b) => {
      let comparison = 0;
      
      // Directories always come first
      if (a.type === "directory" && b.type !== "directory") return -1;
      if (a.type !== "directory" && b.type === "directory") return 1;
      
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "size":
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case "modified":
          comparison = new Date(a.modifiedAt) - new Date(b.modifiedAt);
          break;
        case "type":
          const extA = a.extension || "";
          const extB = b.extension || "";
          comparison = extA.localeCompare(extB);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return sorted;
  }, [files, sortBy, sortOrder]);

  /**
   * Handle sort change
   */
  const handleSortChange = useCallback((newSortBy) => {
    if (sortBy === newSortBy) {
      // Toggle order if same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // New column, default to ascending
      setSortBy(newSortBy);
      setSortOrder("asc");
    }
  }, [sortBy, sortOrder]);

  /**
   * Handle file selection with multi-select support
   * @param {Object} file - File being selected
   * @param {React.MouseEvent} event - Click event
   */
  const handleSelectFile = useCallback(
    (file, event) => {
      const newSelection = new Set(selectedFiles);
      const isCtrlOrMeta = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;

      if (isShift && lastSelectedFile) {
        // Shift+Click: Select range
        const sortedFilesList = sortedFiles();
        const lastIdx = sortedFilesList.findIndex((f) => f.path === lastSelectedFile.path);
        const currentIdx = sortedFilesList.findIndex((f) => f.path === file.path);
        
        if (lastIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(lastIdx, currentIdx);
          const end = Math.max(lastIdx, currentIdx);
          
          if (!isCtrlOrMeta) {
            newSelection.clear();
          }
          
          for (let i = start; i <= end; i++) {
            newSelection.add(sortedFilesList[i].path);
          }
        }
      } else if (isCtrlOrMeta) {
        // Ctrl/Cmd+Click: Toggle selection
        if (newSelection.has(file.path)) {
          newSelection.delete(file.path);
        } else {
          newSelection.add(file.path);
        }
      } else {
        // Normal click: Single selection
        newSelection.clear();
        newSelection.add(file.path);
      }

      setSelectedFiles(newSelection);
      setLastSelectedFile(file);
    },
    [selectedFiles, lastSelectedFile, sortedFiles]
  );

  /**
   * Handle clear selection
   */
  const handleClearSelection = useCallback(() => {
    setSelectedFiles(new Set());
    setLastSelectedFile(null);
  }, []);

  /**
   * Handle opening a file or directory
   * @param {Object} file
   */
  const handleOpen = useCallback(
    (file) => {
      if (file.type === "directory") {
        setCurrentPath(file.path);
        setSelectedFiles(new Set());
      } else {
        // Track this file as recently opened
        addRecent(file.path);
        // Navigate to editor for files
        router.push(`/editor?path=${encodeURIComponent(file.path)}`);
      }
    },
    [router, addRecent]
  );

  /**
   * Handle creating a new folder
   */
  const handleCreateFolder = useCallback(async () => {
    const name = prompt("Enter folder name:");
    if (!name || !name.trim()) return;

    try {
      const folderPath = currentPath
        ? `${currentPath}/${name.trim()}`
        : name.trim();

      const response = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "directory",
          path: folderPath,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create folder");
      }

      // Refresh the file list
      fetchFiles();
    } catch (error) {
      console.error("Error creating folder:", error);
      alert("Failed to create folder");
    }
  }, [currentPath, fetchFiles]);

  /**
   * Handle creating a new file
   */
  const handleCreateFile = useCallback(async () => {
    const name = prompt("Enter file name:");
    if (!name || !name.trim()) return;

    try {
      const filePath = currentPath
        ? `${currentPath}/${name.trim()}`
        : name.trim();

      const response = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "file",
          path: filePath,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create file");
      }

      // Refresh the file list
      fetchFiles();
    } catch (error) {
      console.error("Error creating file:", error);
      alert("Failed to create file");
    }
  }, [currentPath, fetchFiles]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    fetchFiles();
  }, [fetchFiles]);

  /**
   * Handle select all files
   */
  const handleSelectAll = useCallback(() => {
    if (selectedFiles.size === sortedFiles().length) {
      // Deselect all if all are selected
      setSelectedFiles(new Set());
    } else {
      // Select all
      const allPaths = new Set(sortedFiles().map((f) => f.path));
      setSelectedFiles(allPaths);
    }
  }, [selectedFiles, sortedFiles]);

  /**
   * Handle bulk delete
   */
  const handleBulkDelete = useCallback(() => {
    if (selectedFiles.size === 0) return;
    
    setConfirmDialog({
      file: { name: `${selectedFiles.size} items`, type: "directory" },
      title: `Move to Trash`,
      message: `Are you sure you want to move ${selectedFiles.size} selected items to trash? You can restore them later from the Trash section.`,
      confirmLabel: "Move to Trash",
      isBulk: true,
    });
  }, [selectedFiles]);

  /**
   * Confirm bulk delete
   */
  const handleConfirmBulkDelete = useCallback(async () => {
    try {
      setConfirmDialog((prev) => ({ ...prev, loading: true }));
      
      const pathsToDelete = Array.from(selectedFiles);
      
      // Delete all selected files
      await Promise.all(
        pathsToDelete.map((path) =>
          fetch(`/api/files/${path}`, {
            method: "DELETE",
          })
        )
      );
      
      setConfirmDialog(null);
      setSelectedFiles(new Set());
      fetchFiles();
    } catch (error) {
      console.error("Error bulk deleting:", error);
      alert("Failed to delete some items");
      setConfirmDialog((prev) => ({ ...prev, loading: false }));
    }
  }, [selectedFiles, fetchFiles]);

  /**
   * Handle navigation
   * @param {string} path
   */
  const handleNavigate = useCallback((path) => {
    setCurrentPath(path);
    setSelectedFiles(new Set());
  }, []);

  /**
   * Handle context menu
   * @param {Object} file - File being acted on
   * @param {{ x: number, y: number }} position - Menu position
   */
  const handleContextMenu = useCallback((file, position) => {
    setContextMenu({ file, position });
  }, []);

  /**
   * Handle close context menu
   */
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  /**
   * Handle rename
   * @param {Object} file - File to rename
   */
  const handleRename = useCallback(
    async (file) => {
      const newName = prompt("Enter new name:", file.name);
      if (!newName || newName === file.name) return;

      try {
        const parentPath = file.path.includes("/")
          ? file.path.substring(0, file.path.lastIndexOf("/"))
          : "";
        const newPath = parentPath ? `${parentPath}/${newName}` : newName;

        const response = await fetch(`/api/files/${file.path}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "rename",
            newPath,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to rename");
        }

        fetchFiles();
      } catch (error) {
        console.error("Error renaming:", error);
        alert("Failed to rename");
      }
    },
    [fetchFiles]
  );

  /**
   * Handle delete
   * @param {Object} file - File to delete
   */
  const handleDelete = useCallback((file) => {
    setConfirmDialog({
      file,
      title: `Move to Trash`,
      message: `Are you sure you want to move "${file.name}" to trash? You can restore it later from the Trash section.`,
      confirmLabel: "Move to Trash",
    });
  }, []);

  /**
   * Confirm delete
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDialog?.file) return;

    try {
      setConfirmDialog((prev) => ({ ...prev, loading: true }));

      const response = await fetch(`/api/files/${confirmDialog.file.path}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      setConfirmDialog(null);
      fetchFiles();
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Failed to delete");
      setConfirmDialog((prev) => ({ ...prev, loading: false }));
    }
  }, [confirmDialog, fetchFiles]);

  /**
   * Handle copy
   * @param {Object} file - File to copy
   */
  const handleCopy = useCallback(
    async (file) => {
      const destPath = prompt(
        "Enter destination path:",
        `${file.path}_copy`
      );
      if (!destPath) return;

      try {
        const response = await fetch(`/api/files/${file.path}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "copy",
            newPath: destPath,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to copy");
        }

        fetchFiles();
      } catch (error) {
        console.error("Error copying:", error);
        alert("Failed to copy");
      }
    },
    [fetchFiles]
  );

  /**
   * Handle move
   * @param {Object} file - File to move
   */
  const handleMove = useCallback(
    async (file) => {
      const destPath = prompt("Enter destination path:", file.path);
      if (!destPath || destPath === file.path) return;

      try {
        const response = await fetch(`/api/files/${file.path}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "rename",
            newPath: destPath,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to move");
        }

        fetchFiles();
      } catch (error) {
        console.error("Error moving:", error);
        alert("Failed to move");
      }
    },
    [fetchFiles]
  );

  /**
   * Handle file upload (from button or drag & drop)
   * @param {File[]} files - Files to upload
   */
  const handleUpload = useCallback(
    async (files) => {
      if (!files || files.length === 0) return;

      setUploading(true);
      setUploadError(null);

      try {
        const formData = new FormData();
        for (const file of files) {
          formData.append("file", file);
        }
        // Add destination path
        formData.append("path", currentPath);

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Upload failed");
        }

        // Refresh the file list
        fetchFiles();
      } catch (error) {
        console.error("Error uploading:", error);
        setUploadError(error.message);
      } finally {
        setUploading(false);
      }
    },
    [currentPath, fetchFiles]
  );

  /**
   * Handle file download
   * @param {Object} file - File to download
   */
  const handleDownload = useCallback((file) => {
    // Create a temporary link element and trigger download
    const url = `/api/files/${file.path}?action=download`;
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  /**
   * Handle file preview
   * @param {Object} file - File to preview
   */
  const handlePreview = useCallback((file) => {
    if (file.type === 'directory') return;
    
    // Check if file can be previewed
    if (!canPreview(file.extension)) {
      // Fall back to opening in editor for unsupported types
      router.push(`/editor?path=${encodeURIComponent(file.path)}`);
      return;
    }
    
    setPreviewFile(file);
  }, [router]);

  /**
   * Handle close preview
   */
  const handleClosePreview = useCallback(() => {
    setPreviewFile(null);
  }, []);

  /**
   * Handle drag enter on file listing area
   * @param {React.DragEvent} e
   */
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setDragActive(true);
    }
  }, []);

  /**
   * Handle drag leave on file listing area
   * @param {React.DragEvent} e
   */
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setDragActive(false);
    }
  }, []);

  /**
   * Handle drop on file listing area
   * @param {React.DragEvent} e
   */
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleUpload(files);
      }
    },
    [handleUpload]
  );

  return (
    <AppShell
      currentPath="/files"
      path={currentPath}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onNavigate={handleNavigate}
    >
      {/* Toolbar */}
      <FileToolbar
        currentPath={currentPath}
        onCreateFolder={handleCreateFolder}
        onCreateFile={handleCreateFile}
        onUpload={handleUpload}
        uploading={uploading}
        onRefresh={handleRefresh}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCount={selectedFiles.size}
        totalCount={sortedFiles().length}
        onSelectAll={handleSelectAll}
        onBulkDelete={handleBulkDelete}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />

      {/* File listing area with drag & drop support */}
      <div
        className="flex-1 min-h-0 overflow-auto relative"
        onClick={handleClearSelection}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Drag & drop overlay */}
        <FileDropZone
          visible={dragActive}
          onDrop={handleUpload}
          uploading={uploading}
        />

        {uploadError && (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-error-50 border border-error-200 dark:bg-error-950 dark:border-error-800">
            <p className="text-body-regular text-error-600 dark:text-error-400">
              {uploadError}
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-body-regular text-text-secondary">Loading...</p>
          </div>
        ) : viewMode === "list" ? (
          <FileList
            files={sortedFiles()}
            onOpen={handleOpen}
            onSelect={handleSelectFile}
            selectedFiles={selectedFiles}
            onContextMenu={handleContextMenu}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <FileGrid
            files={sortedFiles()}
            onOpen={handleOpen}
            onSelect={handleSelectFile}
            selectedFiles={selectedFiles}
            onContextMenu={handleContextMenu}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <FileContextMenu
          file={contextMenu.file}
          position={contextMenu.position}
          onClose={handleCloseContextMenu}
          onPreview={handlePreview}
          onRename={handleRename}
          onDelete={handleDelete}
          onCopy={handleCopy}
          onMove={handleMove}
          onDownload={handleDownload}
        />
      )}

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title || ""}
        message={confirmDialog?.message || ""}
        confirmLabel={confirmDialog?.confirmLabel || "Delete"}
        onConfirm={confirmDialog?.isBulk ? handleConfirmBulkDelete : handleConfirmDelete}
        onCancel={() => setConfirmDialog(null)}
        loading={confirmDialog?.loading || false}
      />

      {/* File preview modal */}
      <FilePreviewModal
        open={!!previewFile}
        file={previewFile}
        onClose={handleClosePreview}
      />
    </AppShell>
  );
}
