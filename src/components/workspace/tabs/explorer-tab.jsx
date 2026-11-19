"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FileToolbar } from "@/components/file-manager/file-toolbar";
import { FileList } from "@/components/file-manager/file-list";
import { FileGrid } from "@/components/file-manager/file-grid";
import { FileContextMenu } from "@/components/file-manager/file-context-menu";
import { FileDropZone } from "@/components/file-manager/file-drop-zone";
import { ConfirmDialog } from "@/components/file-manager/confirm-dialog";
import { FilePreviewModal } from "@/components/file-manager/file-preview-modal";
import { Breadcrumb } from "@/components/file-manager/breadcrumb";
import { useFavorites } from "@/hooks/use-favorites";
import { useRecentFiles } from "@/hooks/use-recent-files";
import { useWorkspace } from "@/contexts/workspace-context";
import { useHashRouterContext } from "@/contexts/hash-router-context";
import { canPreview, isImage } from "@/lib/file-type";
import { isSupportedImageFormat } from "@/lib/image/image-utils";

/**
 * Explorer tab content component.
 * Renders the file explorer within the workspace tab system.
 * Folder navigation is synced with the hash route.
 *
 * @param {Object} props
 * @param {Object} props.tab - The workspace tab object
 */
export function ExplorerTabContent({ tab }) {
  const { route, navigateToExplorer } = useHashRouterContext();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addRecent } = useRecentFiles();
  const { openTab, updateTabState } = useWorkspace();

  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
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

  // Track whether a navigation is from user action vs hash sync
  const isUserNavigation = useRef(false);

  // Initialize path from hash route or tab state
  useEffect(() => {
    const hashPath = route.name === "explorer" ? (route.path || "") : "";
    const initialPath = hashPath || tab.state?.currentPath || "";
    setCurrentPath(initialPath);
  }, []);

  // Sync hash route when path changes
  useEffect(() => {
    // Only update hash if it differs from current path
    const hashPath = route.path || "";
    if (hashPath !== currentPath && route.name === "explorer") {
      navigateToExplorer(currentPath || null);
    }

    // Update tab state
    updateTabState(tab.id, { currentPath });
  }, [currentPath]);

  // Listen for hash changes (back/forward navigation)
  useEffect(() => {
    if (route.name === "explorer") {
      const hashPath = route.path || "";
      if (hashPath !== currentPath) {
        setCurrentPath(hashPath);
      }
    }
  }, [route]);

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
        // If path doesn't exist, reset to root
        if (response.status === 404 && currentPath) {
          setCurrentPath("");
          return;
        }
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
          comparison =
            new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
          break;
        case "type":
          comparison = (a.extension || "").localeCompare(b.extension || "");
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    // Apply search filter
    if (searchQuery) {
      return sorted.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return sorted;
  }, [files, sortBy, sortOrder, searchQuery]);

  /**
   * Handle file open (double-click or Enter)
   */
  const handleOpen = useCallback(
    (file) => {
      if (file.type === "directory") {
        setCurrentPath(file.path);
        setSelectedFiles(new Set());
      } else {
        // Add to recent files
        addRecent({
          path: file.path,
          name: file.name,
          type: file.type,
          extension: file.extension,
        });

        // Open in appropriate tab based on file type
        if (isSupportedImageFormat(file.extension)) {
          // Open in image viewer tab
          const galleryFiles = sortedFiles().filter(
            (f) =>
              f.type !== "directory" && isSupportedImageFormat(f.extension)
          );
          openTab("image-viewer", {
            path: file.path,
            title: file.name,
            state: { galleryFiles, currentIndex: galleryFiles.findIndex(f => f.path === file.path) },
          });
        } else {
          // Open in editor tab
          openTab("editor", {
            path: file.path,
            title: file.name,
          });
        }
      }
    },
    [addRecent, openTab, sortedFiles]
  );

  /**
   * Handle file selection
   */
  const handleSelect = useCallback(
    (file, event) => {
      const newSelected = new Set(selectedFiles);

      if (event?.ctrlKey || event?.metaKey) {
        // Toggle selection
        if (newSelected.has(file.path)) {
          newSelected.delete(file.path);
        } else {
          newSelected.add(file.path);
        }
      } else if (event?.shiftKey && lastSelectedFile) {
        // Range selection
        const sorted = sortedFiles();
        const lastIndex = sorted.findIndex((f) => f.path === lastSelectedFile);
        const currentIndex = sorted.findIndex((f) => f.path === file.path);
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);

        for (let i = start; i <= end; i++) {
          newSelected.add(sorted[i].path);
        }
      } else {
        // Single selection
        newSelected.clear();
        newSelected.add(file.path);
      }

      setSelectedFiles(newSelected);
      setLastSelectedFile(file.path);
    },
    [selectedFiles, lastSelectedFile, sortedFiles]
  );

  /**
   * Handle context menu
   */
  const handleContextMenu = useCallback((file, event) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      file,
    });
  }, []);

  /**
   * Close context menu
   */
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  /**
   * Handle preview
   */
  const handlePreview = useCallback(
    (file) => {
      if (isImage(file)) {
        // Open in image viewer
        const galleryFiles = sortedFiles().filter(
          (f) => f.type !== "directory" && isSupportedImageFormat(f.extension)
        );
        openTab("image-viewer", {
          path: file.path,
          title: file.name,
          state: { galleryFiles, currentIndex: galleryFiles.findIndex(f => f.path === file.path) },
        });
      } else if (canPreview(file)) {
        setPreviewFile(file);
      }
    },
    [openTab, sortedFiles]
  );

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    fetchFiles();
  }, [fetchFiles]);

  /**
   * Handle navigate to path
   */
  const handleNavigate = useCallback((path) => {
    setCurrentPath(path);
    setSelectedFiles(new Set());
  }, []);

  /**
   * Handle navigate to parent directory
   */
  const handleNavigateUp = useCallback(() => {
    const parentPath = currentPath.split(/[\\/]/).slice(0, -1).join("\\");
    setCurrentPath(parentPath);
    setSelectedFiles(new Set());
  }, [currentPath]);

  /**
   * Handle search
   */
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

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
   * Handle file upload
   */
  const handleUpload = useCallback(async (files) => {
    if (files.length === 0) return;

    try {
      setUploading(true);
      setUploadError(null);

      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      if (currentPath) {
        formData.append("path", currentPath);
      }

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      // Refresh the file list
      fetchFiles();
      setDragActive(false);
    } catch (error) {
      console.error("Error uploading files:", error);
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  }, [currentPath, fetchFiles]);

  /**
   * Handle select all files
   */
  const handleSelectAll = useCallback(() => {
    const allPaths = files.map((f) => f.path);
    setSelectedFiles(new Set(allPaths));
  }, [files]);

  /**
   * Handle bulk delete
   */
  const handleBulkDelete = useCallback(async () => {
    if (selectedFiles.size === 0) return;

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedFiles.size} item(s)?`
    );
    if (!confirmed) return;

    try {
      const paths = Array.from(selectedFiles);

      for (const path of paths) {
        const response = await fetch(`/api/files/${encodeURIComponent(path)}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`Failed to delete ${path}`);
        }
      }

      // Clear selection and refresh
      setSelectedFiles(new Set());
      fetchFiles();
    } catch (error) {
      console.error("Error deleting files:", error);
      alert("Failed to delete some files");
    }
  }, [selectedFiles, fetchFiles]);

  return (
    <FileDropZone
      visible={dragActive}
      onDrop={handleUpload}
      uploading={uploading}
    >
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <FileToolbar
          currentPath={currentPath}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNavigate={handleNavigate}
          onNavigateUp={handleNavigateUp}
          onCreateFolder={handleCreateFolder}
          onCreateFile={handleCreateFile}
          onUpload={handleUpload}
          uploading={uploading}
          searchQuery={searchQuery}
          onSearch={handleSearch}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(by, order) => {
            setSortBy(by);
            setSortOrder(order);
          }}
          selectedCount={selectedFiles.size}
          totalCount={files.length}
          onSelectAll={handleSelectAll}
          onBulkDelete={handleBulkDelete}
          onRefresh={handleRefresh}
        />

        {/* Breadcrumb navigation */}
        <div className="px-4 py-2 border-b border-border-primary-default bg-background-primary-default">
          <Breadcrumb path={currentPath} onNavigate={handleNavigate} />
        </div>

        {/* File listing */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-text-secondary">
              Loading...
            </div>
          ) : sortedFiles().length === 0 ? (
            <div className="flex items-center justify-center h-full text-text-secondary">
              {searchQuery ? "No files match your search" : "This folder is empty"}
            </div>
          ) : viewMode === "grid" ? (
            <FileGrid
              files={sortedFiles()}
              onOpen={handleOpen}
              onSelect={handleSelect}
              selectedFiles={selectedFiles}
              onContextMenu={handleContextMenu}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          ) : (
            <FileList
              files={sortedFiles()}
              onOpen={handleOpen}
              onSelect={handleSelect}
              selectedFiles={selectedFiles}
              onContextMenu={handleContextMenu}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={(by, order) => {
                setSortBy(by);
                setSortOrder(order);
              }}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          )}
        </div>

        {/* Context menu */}
        {contextMenu && (
          <FileContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            file={contextMenu.file}
            currentPath={currentPath}
            selectedFiles={selectedFiles}
            onClose={closeContextMenu}
            onRefresh={handleRefresh}
            onPreview={handlePreview}
            onNavigate={handleNavigate}
            onOpenInEditor={(file) => {
              openTab("editor", {
                path: file.path,
                title: file.name,
              });
            }}
            onOpenImageViewer={(file) => {
              const galleryFiles = sortedFiles().filter(
                (f) => f.type !== "directory" && isSupportedImageFormat(f.extension)
              );
              openTab("image-viewer", {
                path: file.path,
                title: file.name,
                state: { galleryFiles, currentIndex: galleryFiles.findIndex(f => f.path === file.path) },
              });
            }}
            onConfirmDialog={setConfirmDialog}
          />
        )}

        {/* Confirmation dialog */}
        {confirmDialog && (
          <ConfirmDialog
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmLabel={confirmDialog.confirmLabel || "Confirm"}
            onConfirm={async () => {
              await confirmDialog.onConfirm();
              setConfirmDialog(null);
              handleRefresh();
            }}
            onCancel={() => setConfirmDialog(null)}
          />
        )}

        {/* File preview modal */}
        {previewFile && (
          <FilePreviewModal
            file={previewFile}
            onClose={() => setPreviewFile(null)}
          />
        )}
      </div>
    </FileDropZone>
  );
}
