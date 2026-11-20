import { useCallback, useRef } from "react";

/**
 * @typedef {Object} DragItem
 * @property {string} path - Relative path
 * @property {string} name - File/folder name
 * @property {'file'|'directory'} type - Item type
 */

/**
 * Custom hook for file-to-folder drag-and-drop within the explorer.
 * Uses HTML5 Drag and Drop API.
 *
 * @param {Object} options
 * @param {(sources: string[], dest: string) => Promise<void>} options.onMove - Called when items are dropped on a folder
 * @param {Set<string>} options.selectedFiles - Currently selected file paths
 * @param {Object[]} options.files - All files in current directory
 */
export function useFileDragAndDrop({ onMove, selectedFiles, files }) {
  const dragDataRef = useRef(null);
  const dragCountRef = useRef(0);

  /**
   * Get the items to drag. If the dragged item is in the selection,
   * drag all selected items. Otherwise, drag just that item.
   * @param {Object} file - The file being dragged
   * @returns {DragItem[]}
   */
  const getDragItems = useCallback(
    (file) => {
      if (selectedFiles.size > 1 && selectedFiles.has(file.path)) {
        return files
          .filter((f) => selectedFiles.has(f.path))
          .map((f) => ({ path: f.path, name: f.name, type: f.type }));
      }
      return [{ path: file.path, name: file.name, type: file.type }];
    },
    [selectedFiles, files]
  );

  /**
   * Handle drag start on a file/folder item
   * @param {React.DragEvent} e
   * @param {Object} file
   */
  const handleItemDragStart = useCallback(
    (e, file) => {
      const items = getDragItems(file);
      dragDataRef.current = items;

      // Set data for HTML5 DnD
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData(
        "application/x-file-paths",
        JSON.stringify(items.map((i) => i.path))
      );

      // Custom drag preview
      if (items.length > 1) {
        const preview = document.createElement("div");
        preview.style.cssText =
          "position:fixed;top:-9999px;left:-9999px;padding:8px 12px;background:#1e293b;color:white;border-radius:8px;font-size:12px;display:flex;align-items:center;gap:4px;pointer-events:none;z-index:99999;";
        preview.textContent = `${items.length} items`;
        document.body.appendChild(preview);
        e.dataTransfer.setDragImage(preview, 0, 0);
        // Remove after browser captures the image
        requestAnimationFrame(() => {
          document.body.removeChild(preview);
        });
      }
    },
    [getDragItems]
  );

  /**
   * Handle drag over a folder (potential drop target)
   * @param {React.DragEvent} e
   * @param {Object} folder - The folder being hovered
   * @returns {boolean} Whether the drop is allowed
   */
  const handleFolderDragOver = useCallback((e, folder) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if we're dragging file paths
    const hasPaths = e.dataTransfer.types.includes("application/x-file-paths");
    if (!hasPaths) return false;

    e.dataTransfer.dropEffect = "move";
    return true;
  }, []);

  /**
   * Check if a drop is valid (not onto itself or a descendant)
   * @param {Object} folder - The target folder
   * @returns {boolean}
   */
  const isDropValid = useCallback(
    (folder) => {
      const items = dragDataRef.current;
      if (!items || items.length === 0) return false;

      for (const item of items) {
        // Can't drop onto the same item
        if (item.path === folder.path) return false;

        // Can't drop a directory into itself or a descendant
        if (item.type === "directory") {
          const normalizedItem = item.path.replace(/\\/g, "/");
          const normalizedFolder = folder.path.replace(/\\/g, "/");
          if (
            normalizedFolder === normalizedItem ||
            normalizedFolder.startsWith(normalizedItem + "/")
          ) {
            return false;
          }
        }
      }

      return true;
    },
    []
  );

  /**
   * Handle drop on a folder
   * @param {React.DragEvent} e
   * @param {Object} folder - The destination folder
   */
  const handleDrop = useCallback(
    async (e, folder) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isDropValid(folder)) return;

      const items = dragDataRef.current;
      if (!items || items.length === 0) return;

      const sourcePaths = items.map((i) => i.path);
      dragDataRef.current = null;

      try {
        await onMove(sourcePaths, folder.path);
      } catch (error) {
        console.error("Drag-and-drop move failed:", error);
      }
    },
    [isDropValid, onMove]
  );

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback(() => {
    dragDataRef.current = null;
    dragCountRef.current = 0;
  }, []);

  return {
    handleItemDragStart,
    handleFolderDragOver,
    handleDrop,
    handleDragEnd,
    isDropValid,
  };
}
