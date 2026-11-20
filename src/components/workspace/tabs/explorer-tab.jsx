"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { cx } from "@/utils/cx";
import { FileToolbar } from "@/components/file-manager/file-toolbar";
import { FileList } from "@/components/file-manager/file-list";
import { FileGrid } from "@/components/file-manager/file-grid";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/base/context-menu/context-menu";
import { FileDropZone } from "@/components/file-manager/file-drop-zone";
import { ConfirmDialog } from "@/components/file-manager/confirm-dialog";
import { FilePreviewModal } from "@/components/file-manager/file-preview-modal";
import { CompressDialog } from "@/components/archive/compress-dialog";
import { ExtractDialog } from "@/components/archive/extract-dialog";
import { Breadcrumb } from "@/components/file-manager/breadcrumb";
import { useFavorites } from "@/hooks/use-favorites";
import { useRecentFiles } from "@/hooks/use-recent-files";
import { useWorkspace } from "@/contexts/workspace-context";
import { useTrashStore } from "@/stores/trash-store";
import { useClipboardStore } from "@/stores/clipboard-store";
import { canPreview, isImage, isPDF, isText } from "@/lib/file-type";
import { isSupportedImageFormat } from "@/lib/image/image-utils";
import {
  RiEyeLine,
  RiEditLine,
  RiDeleteBinLine,
  RiCodeBoxLine,
  RiImageLine,
  RiArchiveLine,
  RiFolderDownloadLine,
  RiFolderZipLine,
  RiFileCopyLine,
  RiLink,
  RiFileTextLine,
  RiScissorsLine,
  RiClipboardLine,
  RiFolderTransferLine,
  RiArrowGoForwardLine,
} from "@remixicon/react";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "@/components/base/toast/toast";
import { useUploadStore } from "@/stores/upload-store";
import { ConflictDialog } from "@/components/upload/conflict-dialog";
import { UploadQueue } from "@/components/upload/upload-queue";
import { MoveToDialog } from "@/components/file-manager/move-to-dialog";
import { formatFileSize } from "@/components/upload/upload-zone";
import { useFileDragAndDrop } from "@/hooks/use-file-drag-and-drop";

/**
 * Join rootPath and relative path using the separator detected from rootPath.
 * Both come from the server and use OS-native separators.
 * @param {string} rootPath
 * @param {string} relativePath
 * @returns {string}
 */
function toAbsolutePath(rootPath, relativePath) {
  if (!rootPath) return relativePath;
  const sep = rootPath.includes("\\") ? "\\" : "/";
  const cleanRoot = rootPath.endsWith(sep) || rootPath.endsWith("/")
    ? rootPath.slice(0, -1)
    : rootPath;
  return `${cleanRoot}${sep}${relativePath}`;
}

/**
 * Normalize a server-returned relative path to use forward slashes.
 * @param {string} relativePath
 * @returns {string}
 */
function normalizeRelativePath(relativePath) {
  return relativePath.replace(/\\/g, "/");
}

/**
 * Decode a splat path from React Router into a folder path.
 * Each segment is URL-decoded.
 * @param {string} splat
 * @returns {string}
 */
function decodeSplatPath(splat) {
  if (!splat) return "";
  return splat.split("/").map(decodeURIComponent).join("/");
}

/**
 * Explorer tab content component.
 * Renders the file explorer within the workspace tab system.
 * Folder navigation is synced with the React Router hash route.
 *
 * @param {Object} props
 * @param {Object} props.tab - The workspace tab object
 */
export function ExplorerTabContent({ tab }) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addRecent } = useRecentFiles();
  const { openTab, updateTabState } = useWorkspace();
  const { items: clipboardItems, mode: clipboardMode, cut: clipboardCut, copy: clipboardCopy, clear: clipboardClear, isCut: isClipboardCut } = useClipboardStore();

  const [files, setFiles] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [lastSelectedFile, setLastSelectedFile] = useState(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Archive dialogs state
  const [compressDialog, setCompressDialog] = useState(null);
  const [extractDialog, setExtractDialog] = useState(null);
  const [moveToDialog, setMoveToDialog] = useState(null);

  // Upload state
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  
  // Conflict dialog state
  const [conflictDialog, setConflictDialog] = useState({
    open: false,
    conflicts: [],
    pendingFiles: [],
    resolutions: new Map(),
  });

  // Preview modal state
  const [previewFile, setPreviewFile] = useState(null);

  // Root path from server (for absolute path copy)
  const rootPathRef = useRef("");

  // Get the folder path from the URL splat parameter
  const routePath = decodeSplatPath(params["*"] || "");

  // Track whether a navigation is from user action vs route sync
  const isUserNavigation = useRef(false);

  // Initialize path from route or tab state (one-time)
  const [currentPath, setCurrentPath] = useState(() => {
    return routePath || tab.state?.currentPath || "";
  });

  // Sync URL route when path changes (user navigates in explorer)
  // This synchronizes with an external system (the URL), which is the
  // intended use of effects per the React documentation.
  useEffect(() => {
    const encodedPath = currentPath
      ? currentPath.split(/[\\/]/).map(encodeURIComponent).join("/")
      : "";
    const targetRoute = encodedPath ? `/explorer/${encodedPath}` : "/explorer";

    // Only update URL if it differs from current location
    if (location.pathname !== targetRoute) {
      isUserNavigation.current = true;
      navigate(targetRoute, { replace: !isUserNavigation.current });
    }

    // Update tab state
    updateTabState(tab.id, { currentPath });
  }, [currentPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for route changes (back/forward navigation)
  // Syncing from external system (URL) — legitimate effect usage
  useEffect(() => {
    if (routePath !== currentPath) {
      isUserNavigation.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentPath(routePath);
    }
  }, [routePath]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (data.rootPath) {
        rootPathRef.current = data.rootPath;
      }
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
        const ext = file.extension?.toLowerCase();
        
        if (isSupportedImageFormat(file.extension)) {
          // Open in image viewer tab — pass only the single file, not the entire directory
          // Gallery metadata will be loaded on-demand when user navigates
          openTab("image-viewer", {
            path: file.path,
            title: file.name,
            state: { 
              directoryPath: currentPath, // Pass directory path for on-demand gallery loading
            },
          });
        } else if (isPDF(file.extension)) {
          openTab("pdf-viewer", {
            path: file.path,
            title: file.name,
          });
        } else if ([".md", ".markdown"].includes(ext)) {
          openTab("markdown-viewer", {
            path: file.path,
            title: file.name,
          });
        } else if (isText(file.extension) || !ext) {
          // Plain text, logs, csv, or no extension → editor
          openTab("editor", {
            path: file.path,
            title: file.name,
          });
        } else {
          // Code files → editor
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
   * Handle preview
   */
  const handlePreview = useCallback(
    (file) => {
      if (isImage(file.extension)) {
        // Open in image viewer — pass only directory path for on-demand gallery loading
        openTab("image-viewer", {
          path: file.path,
          title: file.name,
          state: { directoryPath: currentPath },
        });
      } else if (canPreview(file.extension)) {
        setPreviewFile(file);
      }
    },
    [openTab, currentPath]
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
   * Perform the actual upload after conflict resolution
   * @param {File[]} files - Files to upload
   * @param {Map<string, string>} resolutions - Conflict resolutions (skip/replace/rename)
   */
  const performUpload = useCallback(async (files, resolutions) => {
    const uploadItems = [];
    let itemId = 0;

    // Build upload items array
    for (const file of files) {
      const action = resolutions.get(file.name);
      
      if (action === 'skip') {
        // Skip this file
        continue;
      }

      let uploadName = file.name;
      if (action === 'rename') {
        const timestamp = Date.now();
        const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
        const baseName = file.name.includes('.') ? file.name.slice(0, file.name.lastIndexOf('.')) : file.name;
        uploadName = `${baseName}_${timestamp}${ext}`;
      }

      uploadItems.push({
        id: `upload-${Date.now()}-${itemId++}`,
        filename: uploadName,
        size: file.size,
        progress: 0,
        status: 'pending',
        file,
      });
    }

    if (uploadItems.length === 0) {
      toast.info('No files to upload');
      return;
    }

    // Add to store
    useUploadStore.getState().addFiles(uploadItems.map(item => ({
      id: item.id,
      filename: item.filename,
      size: item.size,
      progress: 0,
      status: 'pending',
    })));

    // Upload each file sequentially
    for (const item of uploadItems) {
      try {
        useUploadStore.getState().setStatus(item.id, 'uploading');

        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('path', currentPath || '');
        if (item.filename !== item.file.name) {
          formData.append('overrideName', item.filename);
        }

        // Use XHR for progress tracking
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              useUploadStore.getState().updateProgress(item.id, percent);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              useUploadStore.getState().setStatus(item.id, 'complete');
              resolve();
            } else {
              let errorMsg = 'Upload failed';
              try {
                const response = JSON.parse(xhr.responseText);
                errorMsg = response.error || errorMsg;
              } catch (e) {}
              useUploadStore.getState().setStatus(item.id, 'error', errorMsg);
              reject(new Error(errorMsg));
            }
          });

          xhr.addEventListener('error', () => {
            useUploadStore.getState().setStatus(item.id, 'error', 'Network error');
            reject(new Error('Network error'));
          });

          xhr.open('POST', '/api/files/upload');
          xhr.send(formData);
        });
      } catch (error) {
        // Error already set in store - show toast notification
        const errorMessage = error.message || 'Upload failed';
        toast.error(`Failed to upload ${item.filename}: ${errorMessage}`);
      }
    }

    // Refresh file list
    fetchFiles();
    setDragActive(false);
    
    // Show completion toast
    const stats = useUploadStore.getState().getStats();
    if (stats.complete > 0) {
      toast.success(`Uploaded ${stats.complete} file${stats.complete !== 1 ? 's' : ''} successfully`);
    }
  }, [currentPath, fetchFiles]);

  /**
   * Handle file upload with conflict detection
   * @param {File[]} files - Files to upload
   */
  const handleUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    try {
      setUploadError(null);
      
      // Check for conflicts
      const conflicts = [];
      const clearFiles = [];

      for (const file of files) {
        const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
        try {
          const response = await fetch(`/api/files/${encodeURIComponent(filePath)}`);
          if (response.ok) {
            conflicts.push({ name: file.name, size: file.size, file });
          } else {
            clearFiles.push(file);
          }
        } catch (err) {
          // If check fails, assume no conflict
          clearFiles.push(file);
        }
      }

      if (conflicts.length > 0) {
        // Show conflict dialog
        setConflictDialog({
          open: true,
          conflicts,
          pendingFiles: clearFiles,
          resolutions: new Map(),
        });
      } else {
        // No conflicts, upload directly
        await performUpload(files, new Map());
      }
    } catch (error) {
      console.error("Error preparing upload:", error);
      setUploadError(error.message);
      toast.error(`Upload failed: ${error.message}`);
    }
  }, [currentPath, performUpload]);

  /**
   * Handle conflict resolution
   * @param {Map<string, string>} resolutions - User's conflict resolutions
   */
  const handleConflictResolution = useCallback((resolutions) => {
    const { conflicts, pendingFiles } = conflictDialog;
    
    // Combine conflict files with their resolutions and clear files
    const allFiles = [
      ...conflicts.map(c => c.file),
      ...pendingFiles,
    ];

    // Perform upload with resolutions
    performUpload(allFiles, resolutions);
    
    // Close dialog
    setConflictDialog({
      open: false,
      conflicts: [],
      pendingFiles: [],
      resolutions: new Map(),
    });
  }, [conflictDialog, performUpload]);

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

      // Clear selection, refresh file list, and update trash count
      setSelectedFiles(new Set());
      fetchFiles();
      useTrashStore.getState().refresh();
    } catch (error) {
      console.error("Error deleting files:", error);
      alert("Failed to delete some files");
    }
  }, [selectedFiles, fetchFiles]);

  /**
   * Handle bulk compress — open compress dialog with selected files
   */
  const handleBulkCompress = useCallback(() => {
    if (selectedFiles.size === 0) return;
    const items = Array.from(selectedFiles).map(p => {
      const f = files.find(ff => ff.path === p);
      return { path: p, name: f?.name || p.split('/').pop() || p };
    });
    setCompressDialog({ items });
  }, [selectedFiles, files]);

  /**
   * Get target files for clipboard operations (respects multi-select)
   * @param {Object} file - The file that triggered the action
   * @returns {Object[]}
   */
  const getClipboardTargets = useCallback(
    (file) => {
      if (selectedFiles.size > 1 && selectedFiles.has(file.path)) {
        return files.filter((f) => selectedFiles.has(f.path));
      }
      return [file];
    },
    [selectedFiles, files],
  );

  /**
   * Handle cut (prepare for move)
   */
  const handleCut = useCallback(
    (file) => {
      const targets = getClipboardTargets(file);
      clipboardCut(targets.map(f => ({ path: f.path, name: f.name, type: f.type })));
      toast.success(`${targets.length} item${targets.length !== 1 ? 's' : ''} cut`);
    },
    [getClipboardTargets, clipboardCut],
  );

  /**
   * Handle copy to clipboard
   */
  const handleCopyToClipboard = useCallback(
    (file) => {
      const targets = getClipboardTargets(file);
      clipboardCopy(targets.map(f => ({ path: f.path, name: f.name, type: f.type })));
      toast.success(`${targets.length} item${targets.length !== 1 ? 's' : ''} copied`);
    },
    [getClipboardTargets, clipboardCopy],
  );

  /**
   * Handle paste from clipboard into current directory
   */
  const handlePaste = useCallback(async () => {
    if (!clipboardItems || clipboardItems.length === 0) {
      toast.error("Clipboard is empty");
      return;
    }

    try {
      const action = clipboardMode === 'cut' ? 'move' : 'copy';
      const sources = clipboardItems.map(item => item.path);

      const response = await fetch('/api/files/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          sources,
          destination: currentPath || '.',
          conflict: 'rename',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `${action} failed`);
      }

      const data = await response.json();
      const resultItems = action === 'move' ? data.moved : data.copied;
      const skipped = data.skipped || [];
      const errors = data.errors || [];

      // Clear clipboard if cut operation
      if (clipboardMode === 'cut') {
        clipboardClear();
      }

      // Refresh file list
      fetchFiles();

      // Show results
      if (errors.length > 0) {
        toast.error(`${errors.length} item${errors.length !== 1 ? 's' : ''} failed`);
      } else if (resultItems.length > 0) {
        toast.success(`${resultItems.length} item${resultItems.length !== 1 ? 's' : ''} ${action === 'move' ? 'moved' : 'copied'}`);
      }
    } catch (error) {
      console.error('Paste error:', error);
      toast.error(error.message || 'Paste failed');
    }
  }, [clipboardItems, clipboardMode, currentPath, clipboardClear, fetchFiles]);

  /**
   * Handle "Move To" — open dialog with selected files
   */
  const handleMoveTo = useCallback(
    (file) => {
      const targets = getClipboardTargets(file);
      setMoveToDialog({
        items: targets.map((f) => ({ path: f.path, name: f.name, type: f.type })),
      });
    },
    [getClipboardTargets],
  );

  /**
   * Handle Move To confirmation — perform the move
   * @param {string} destPath - Destination directory relative path
   */
  const handleMoveToConfirm = useCallback(async (destPath) => {
    if (!moveToDialog) return;

    try {
      const sources = moveToDialog.items.map((item) => item.path);

      const response = await fetch("/api/files/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move",
          sources,
          destination: destPath,
          conflict: "rename",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Move failed");
      }

      const data = await response.json();
      const moved = data.moved || [];
      const errors = data.errors || [];

      // Clear clipboard if these items were cut
      clipboardClear();

      // Refresh file list
      fetchFiles();

      // Show results
      if (errors.length > 0) {
        toast.error(`${errors.length} item${errors.length !== 1 ? "s" : ""} failed to move`);
      }
      if (moved.length > 0) {
        toast.success(
          `${moved.length} item${moved.length !== 1 ? "s" : ""} moved`
        );
      }

      setMoveToDialog(null);
    } catch (error) {
      console.error("Move To error:", error);
      toast.error(error.message || "Move failed");
    }
  }, [moveToDialog, clipboardClear, fetchFiles]);

  /**
   * Handle drag-and-drop move operation
   * @param {string[]} sourcePaths - Relative paths to move
   * @param {string} destPath - Destination directory relative path
   */
  const handleDnDMove = useCallback(async (sourcePaths, destPath) => {
    try {
      const response = await fetch("/api/files/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move",
          sources: sourcePaths,
          destination: destPath,
          conflict: "rename",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Move failed");
      }

      const data = await response.json();
      const moved = data.moved || [];
      const errors = data.errors || [];

      // Clear clipboard if these items were cut
      clipboardClear();

      // Refresh file list
      fetchFiles();

      // Show results
      if (errors.length > 0) {
        toast.error(`${errors.length} item${errors.length !== 1 ? "s" : ""} failed to move`);
      }
      if (moved.length > 0) {
        toast.success(
          `Moved ${moved.length} item${moved.length !== 1 ? "s" : ""}`
        );
      }
    } catch (error) {
      console.error("DnD move error:", error);
      toast.error(error.message || "Move failed");
    }
  }, [clipboardClear, fetchFiles]);

  // Set up drag-and-drop
  const {
    handleItemDragStart,
    handleFolderDragOver,
    handleDrop,
    handleDragEnd,
    isDropValid: isDnDValid,
  } = useFileDragAndDrop({
    onMove: handleDnDMove,
    selectedFiles,
    files,
  });

  /**
   * Check if dropping on a breadcrumb segment is valid
   * @param {string} targetPath - The path represented by the breadcrumb segment
   * @returns {boolean}
   */
  const handleBreadcrumbDragOver = useCallback(
    (targetPath) => {
      // Create a pseudo-folder object for the validation check
      const pseudoFolder = { path: targetPath, type: "directory" };
      return isDnDValid(pseudoFolder);
    },
    [isDnDValid]
  );

  /**
   * Handle drop on a breadcrumb segment
   * @param {string} targetPath - Destination path
   * @param {DragEvent} e - The drop event
   */
  const handleBreadcrumbDrop = useCallback(
    (targetPath, e) => {
      try {
        const pathsJson = e.dataTransfer.getData("application/x-file-paths");
        if (!pathsJson) return;

        const sourcePaths = JSON.parse(pathsJson);
        if (!Array.isArray(sourcePaths) || sourcePaths.length === 0) return;

        // Validate: prevent dropping into self or descendants
        for (const srcPath of sourcePaths) {
          const normalized = srcPath.replace(/\\/g, "/");
          const normalizedTarget = targetPath.replace(/\\/g, "/");
          if (
            normalizedTarget === normalized ||
            normalizedTarget.startsWith(normalized + "/")
          ) {
            return; // Invalid drop
          }
        }

        handleDnDMove(sourcePaths, targetPath);
      } catch (error) {
        console.error("Breadcrumb drop error:", error);
      }
    },
    [handleDnDMove]
  );

  /**
   * Handle rename file/folder
   */
  const handleRename = useCallback(async (file) => {
    const newName = prompt("Enter new name:", file.name);
    if (!newName || newName.trim() === file.name) return;

    try {
      const parentPath = file.path.includes("/")
        ? file.path.substring(0, file.path.lastIndexOf("/"))
        : file.path.includes("\\")
        ? file.path.substring(0, file.path.lastIndexOf("\\"))
        : "";

      const newPath = parentPath ? `${parentPath}/${newName.trim()}` : newName.trim();

      const response = await fetch(`/api/files/${encodeURIComponent(file.path)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPath }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename");
      }

      // Clear selection and refresh
      setSelectedFiles(new Set());
      fetchFiles();
    } catch (error) {
      console.error("Error renaming:", error);
      alert("Failed to rename");
    }
  }, [fetchFiles]);

  /**
   * Get the list of files to act on: when multiple files are selected,
   * return all selected files (preserving order); otherwise return [file].
   * @param {Object} file - The file that was right-clicked
   * @returns {Object[]}
   */
  const getTargetFiles = useCallback(
    (file) => {
      if (selectedFiles.size > 1) {
        // Return selected files in their display order
        return files.filter((f) => selectedFiles.has(f.path));
      }
      return [file];
    },
    [selectedFiles, files],
  );

  /**
   * Copy absolute filesystem path(s) to clipboard
   */
  const handleCopyPath = useCallback(
    async (file) => {
      const targets = getTargetFiles(file);
      const root = rootPathRef.current;
      const lines = targets.map((f) => toAbsolutePath(root, f.path));
      const text = lines.join("\n");
      const ok = await copyToClipboard(text);
      if (ok) {
        toast.success(targets.length === 1 ? "Path copied" : `${targets.length} paths copied`);
      } else {
        toast.error("Failed to copy to clipboard");
      }
    },
    [getTargetFiles],
  );

  /**
   * Copy relative path(s) to clipboard (relative to filesystem root)
   */
  const handleCopyRelativePath = useCallback(
    async (file) => {
      const targets = getTargetFiles(file);
      const lines = targets.map((f) => normalizeRelativePath(f.path));
      const text = lines.join("\n");
      const ok = await copyToClipboard(text);
      if (ok) {
        toast.success(targets.length === 1 ? "Relative path copied" : `${targets.length} relative paths copied`);
      } else {
        toast.error("Failed to copy to clipboard");
      }
    },
    [getTargetFiles],
  );

  /**
   * Copy filename(s) to clipboard
   */
  const handleCopyFilename = useCallback(
    async (file) => {
      const targets = getTargetFiles(file);
      const lines = targets.map((f) => f.name);
      const text = lines.join("\n");
      const ok = await copyToClipboard(text);
      if (ok) {
        toast.success(targets.length === 1 ? "Filename copied" : `${targets.length} filenames copied`);
      } else {
        toast.error("Failed to copy to clipboard");
      }
    },
    [getTargetFiles],
  );

  /**
   * Handle context menu action from BoardUI ContextMenu
   * @param {string|symbol} key - The action id
   * @param {Object} file - The file being acted on
   */
  const handleContextAction = useCallback((key, file) => {
    switch (key) {
      case "preview":
        handlePreview(file);
        break;
      case "open-in-editor":
        openTab("editor", {
          path: file.path,
          title: file.name,
        });
        break;
      case "open-in-image-viewer":
        openTab("image-viewer", {
          path: file.path,
          title: file.name,
          state: { directoryPath: currentPath },
        });
        break;
      case "open-archive":
        openTab("archive", {
          path: file.path,
          title: file.name,
        });
        break;
      case "rename":
        handleRename(file);
        break;
      case "compress":
        setCompressDialog({
          items: [{ path: file.path, name: file.name }],
        });
        break;
      case "extract-here":
        // Extract directly to current directory
        fetch("/api/files/archive/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            archivePath: file.path,
            destPath: currentPath || ".",
            conflictStrategy: "skip",
          }),
        }).then(() => handleRefresh());
        break;
      case "extract-to":
        setExtractDialog({
          archivePath: file.path,
          archiveName: file.name,
        });
        break;
      case "delete":
        setConfirmDialog({
          title: "Delete Item",
          message: `Are you sure you want to delete "${file.name}"?`,
          confirmLabel: "Delete",
          onConfirm: async () => {
            try {
              const response = await fetch(
                `/api/files/${encodeURIComponent(file.path)}`,
                { method: "DELETE" }
              );
              if (!response.ok) throw new Error("Failed to delete");
              useTrashStore.getState().refresh();
            } catch (error) {
              console.error("Error deleting file:", error);
              alert("Failed to delete file");
            }
          },
        });
        break;
      case "copy-path":
        handleCopyPath(file);
        break;
      case "copy-relative-path":
        handleCopyRelativePath(file);
        break;
      case "copy-filename":
        handleCopyFilename(file);
        break;
      case "cut":
        handleCut(file);
        break;
      case "copy-to-clipboard":
        handleCopyToClipboard(file);
        break;
      case "paste":
        handlePaste();
        break;
      case "move-to":
        handleMoveTo(file);
        break;
    }
  }, [handlePreview, handleRename, openTab, currentPath, handleRefresh, handleCopyPath, handleCopyRelativePath, handleCopyFilename, handleCut, handleCopyToClipboard, handlePaste, handleMoveTo]);

  /**
   * Render context menu for a file (used by FileList/FileGrid)
   * @param {Object} file
   * @returns {React.ReactNode}
   */
  const renderContextMenu = useCallback((file) => {
    const isImageFile = isImage(file.extension);
    const isImageFormat = isSupportedImageFormat(file.extension);
    const isCodeFile = canPreview(file.extension) && !isImageFile;
    const isZip = file.extension?.toLowerCase() === '.zip';
    const isArchive = isZip;

    return (
      <ContextMenu
        aria-label="File actions"
        onAction={(key) => handleContextAction(key, file)}
      >
        {/* Open actions based on file type */}
        {isImageFormat && (
          <ContextMenuItem id="open-in-image-viewer" icon={RiImageLine}>
            Open in Image Viewer
          </ContextMenuItem>
        )}
        {isCodeFile && (
          <ContextMenuItem id="open-in-editor" icon={RiCodeBoxLine}>
            Open in Editor
          </ContextMenuItem>
        )}
        {isArchive && (
          <ContextMenuItem id="open-archive" icon={RiArchiveLine}>
            Open Archive
          </ContextMenuItem>
        )}
        {canPreview(file.extension) && !isImageFormat && !isCodeFile && !isArchive && (
          <ContextMenuItem id="preview" icon={RiEyeLine}>
            Preview
          </ContextMenuItem>
        )}
        <ContextMenuItem id="rename" icon={RiEditLine}>
          Rename
        </ContextMenuItem>
        <ContextMenuSeparator />
        {/* Clipboard operations */}
        <ContextMenuItem id="cut" icon={RiScissorsLine}>
          Cut
        </ContextMenuItem>
        <ContextMenuItem id="copy-to-clipboard" icon={RiFileCopyLine}>
          Copy
        </ContextMenuItem>
        {clipboardItems.length > 0 && (
          <ContextMenuItem id="paste" icon={RiClipboardLine}>
            Paste {clipboardMode === 'cut' ? '(move)' : '(copy)'}
          </ContextMenuItem>
        )}
        <ContextMenuItem id="move-to" icon={RiFolderTransferLine}>
          Move To...
        </ContextMenuItem>
        <ContextMenuSeparator />
        {/* Archive actions */}
        {!isArchive && (
          <ContextMenuItem id="compress" icon={RiFolderZipLine}>
            Compress to ZIP
          </ContextMenuItem>
        )}
        {isArchive && (
          <>
            <ContextMenuItem id="extract-here" icon={RiFolderDownloadLine}>
              Extract Here
            </ContextMenuItem>
            <ContextMenuItem id="extract-to" icon={RiFolderDownloadLine}>
              Extract To...
            </ContextMenuItem>
          </>
        )}
        <ContextMenuSeparator />
        {/* Copy section */}
        <ContextMenuItem id="copy-path" icon={RiLink}>
          Copy Path
        </ContextMenuItem>
        <ContextMenuItem id="copy-relative-path" icon={RiFileCopyLine}>
          Copy Relative Path
        </ContextMenuItem>
        <ContextMenuItem id="copy-filename" icon={RiFileTextLine}>
          Copy Filename
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem id="delete" icon={RiDeleteBinLine} variant="danger">
          Delete
        </ContextMenuItem>
      </ContextMenu>
    );
  }, [handleContextAction, clipboardItems, clipboardMode]);

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip when typing in inputs
      const isInput =
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable;

      if (isInput) return;

      const isMod = e.ctrlKey || e.metaKey;

      // Delete - delete selected files
      if (e.key === "Delete" && selectedFiles.size > 0) {
        e.preventDefault();
        handleBulkDelete();
        return;
      }

      // F2 - rename selected file
      if (e.key === "F2" && selectedFiles.size === 1) {
        e.preventDefault();
        const selectedPath = Array.from(selectedFiles)[0];
        const file = files.find((f) => f.path === selectedPath);
        if (file) handleRename(file);
        return;
      }

      // Ctrl+A - select all
      if (isMod && e.key === "a") {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      // Ctrl+X - cut selected files
      if (isMod && e.key === "x" && selectedFiles.size > 0) {
        e.preventDefault();
        const targets = files.filter(f => selectedFiles.has(f.path));
        if (targets.length > 0) {
          handleCut(targets[0]);
        }
        return;
      }

      // Ctrl+C - copy selected files
      if (isMod && e.key === "c" && selectedFiles.size > 0) {
        e.preventDefault();
        const targets = files.filter(f => selectedFiles.has(f.path));
        if (targets.length > 0) {
          handleCopyToClipboard(targets[0]);
        }
        return;
      }

      // Ctrl+V - paste from clipboard
      if (isMod && e.key === "v") {
        e.preventDefault();
        handlePaste();
        return;
      }

      // Escape - clear selection and clipboard
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedFiles(new Set());
        if (clipboardMode === 'cut') {
          clipboardClear();
        }
        return;
      }

      // Enter - open selected file/folder
      if (e.key === "Enter" && selectedFiles.size === 1) {
        e.preventDefault();
        const selectedPath = Array.from(selectedFiles)[0];
        const file = files.find((f) => f.path === selectedPath);
        if (file) handleOpen(file);
        return;
      }

      // Backspace - navigate up
      if (e.key === "Backspace" && !isMod) {
        e.preventDefault();
        if (currentPath) handleNavigateUp();
        return;
      }

      // Arrow keys - navigate selection
      if (e.key.startsWith("Arrow") && files.length > 0) {
        e.preventDefault();
        const sorted = sortedFiles();
        const currentIndex = selectedFiles.size === 1
          ? sorted.findIndex((f) => f.path === Array.from(selectedFiles)[0])
          : -1;

        let newIndex = currentIndex;

        switch (e.key) {
          case "ArrowUp":
            newIndex = currentIndex > 0 ? currentIndex - 1 : 0;
            break;
          case "ArrowDown":
            newIndex = currentIndex < sorted.length - 1 ? currentIndex + 1 : sorted.length - 1;
            break;
          case "ArrowLeft":
            newIndex = currentIndex > 0 ? currentIndex - 1 : 0;
            break;
          case "ArrowRight":
            newIndex = currentIndex < sorted.length - 1 ? currentIndex + 1 : sorted.length - 1;
            break;
        }

        if (newIndex >= 0 && newIndex < sorted.length) {
          setSelectedFiles(new Set([sorted[newIndex].path]));
          setLastSelectedFile(sorted[newIndex].path);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFiles, files, currentPath, viewMode, sortedFiles, handleBulkDelete, handleRename, handleSelectAll, handleOpen, handleNavigateUp, handleCut, handleCopyToClipboard, handlePaste, clipboardMode, clipboardClear]);

  return (
    <FileDropZone
      visible={dragActive}
      onDrop={handleUpload}
      uploading={false}
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
          uploading={false}
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
          onBulkCompress={handleBulkCompress}
          onRefresh={handleRefresh}
        />

        {/* Breadcrumb navigation */}
        <div className="px-4 py-2 border-b border-border-primary-default bg-background-primary-default">
          <Breadcrumb
            path={currentPath}
            onNavigate={handleNavigate}
            onDragOverItem={handleBreadcrumbDragOver}
            onDropItem={handleBreadcrumbDrop}
          />
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
              renderContextMenu={renderContextMenu}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              isCut={isClipboardCut}
              onItemDragStart={handleItemDragStart}
              onFolderDragOver={handleFolderDragOver}
              onFolderDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ) : (
            <FileList
              files={sortedFiles()}
              onOpen={handleOpen}
              onSelect={handleSelect}
              selectedFiles={selectedFiles}
              renderContextMenu={renderContextMenu}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={(by, order) => {
                setSortBy(by);
                setSortOrder(order);
              }}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              isCut={isClipboardCut}
              onItemDragStart={handleItemDragStart}
              onFolderDragOver={handleFolderDragOver}
              onFolderDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          )}
        </div>

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

        {/* Compress dialog */}
        <CompressDialog
          open={!!compressDialog}
          items={compressDialog?.items || []}
          currentPath={currentPath}
          onClose={() => setCompressDialog(null)}
          onComplete={() => {
            handleRefresh();
          }}
        />

        {/* Extract dialog */}
        <ExtractDialog
          open={!!extractDialog}
          archivePath={extractDialog?.archivePath || ''}
          archiveName={extractDialog?.archiveName || ''}
          selectedEntries={extractDialog?.selectedEntries}
          currentPath={currentPath}
          onClose={() => setExtractDialog(null)}
          onComplete={() => {
            handleRefresh();
          }}
        />

        {/* Conflict dialog */}
        <ConflictDialog
          open={conflictDialog.open}
          conflicts={conflictDialog.conflicts}
          onResolve={handleConflictResolution}
          onCancel={() => setConflictDialog({ open: false, conflicts: [], pendingFiles: [], resolutions: new Map() })}
        />

        {/* Move To dialog */}
        <MoveToDialog
          open={!!moveToDialog}
          items={moveToDialog?.items || []}
          currentPath={currentPath}
          onClose={() => setMoveToDialog(null)}
          onConfirm={handleMoveToConfirm}
        />

        {/* Upload queue */}
        <UploadQueue />
      </div>
    </FileDropZone>
  );
}
