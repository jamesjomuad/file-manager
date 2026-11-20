"use client";

import { useCallback, useState } from "react";
import { cx } from "@/utils/cx";
import { FileIcon } from "@/components/file-manager/file-icon";
import { ThumbnailImage } from "@/components/file-manager/thumbnail-image";
import { ContextMenuTrigger } from "@/components/base/context-menu/context-menu";
import { RiSortAsc, RiSortDesc, RiStarLine, RiStarFill } from "@remixicon/react";
import { isSupportedImageFormat } from "@/lib/image/image-utils";

/**
 * Format file size to human-readable string
 * @param {number} bytes - Size in bytes
 * @returns {string}
 */
function formatSize(bytes) {
  if (bytes === 0) return "—";
  if (typeof bytes !== "number") return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Format date to relative or short date string
 * @param {string|Date} date - Date to format
 * @returns {string}
 */
function formatDate(date) {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Get file type label from extension
 * @param {string} extension
 * @returns {string}
 */
function getTypeLabel(extension) {
  if (!extension) return "File";
  return extension.toUpperCase();
}

/**
 * Sortable column header component
 * @param {Object} props
 */
function SortableHeader({ field, label, sortBy, sortOrder, onSortChange, align = "start" }) {
  const isActive = sortBy === field;
  const SortIcon = sortOrder === "asc" ? RiSortAsc : RiSortDesc;

  return (
    <th
      className={cx(
        "text-caption-1-semibold text-text-secondary px-4 py-2 font-medium cursor-pointer select-none",
        "hover:bg-background-secondary-hover transition-colors",
        align === "end" ? "text-end" : "text-start"
      )}
      onClick={() => onSortChange(field)}
    >
      <div className={cx("flex items-center gap-1", align === "end" ? "justify-end" : "justify-start")}>
        <span>{label}</span>
        {isActive && (
          <SortIcon className="w-3.5 h-3.5 text-foreground-icon-secondary" />
        )}
      </div>
    </th>
  );
}

/**
 * File list/table view component with multi-select and sorting
 * @param {Object} props
 * @param {Array} props.files - Array of file objects
 * @param {(file: Object) => void} props.onOpen - Callback when a file is opened
 * @param {(file: Object, event: React.MouseEvent) => void} props.onSelect - Callback when a file is selected
 * @param {Set<string>} props.selectedFiles - Set of selected file paths
 * @param {(file: Object) => React.ReactNode} [props.renderContextMenu] - Returns BoardUI ContextMenu JSX for a file
 * @param {string} props.sortBy - Current sort field
 * @param {string} props.sortOrder - Current sort order
 * @param {(sortBy: string) => void} props.onSortChange - Sort change callback
 * @param {(path: string) => boolean} [props.isFavorite] - Check if a path is favorited
 * @param {(path: string) => void} [props.onToggleFavorite] - Toggle favorite for a path
 * @param {(path: string) => boolean} [props.isCut] - Check if a path is marked as cut (pending move)
 * @param {(e: React.DragEvent, file: Object) => void} [props.onItemDragStart] - Drag start handler
 * @param {(e: React.DragEvent, folder: Object) => boolean} [props.onFolderDragOver] - Drag over handler for folders
 * @param {(e: React.DragEvent, folder: Object) => void} [props.onFolderDrop] - Drop handler for folders
 * @param {() => void} [props.onDragEnd] - Drag end handler
 */
export function FileList({
  files = [],
  onOpen,
  onSelect,
  selectedFiles = new Set(),
  renderContextMenu,
  sortBy = "name",
  sortOrder = "asc",
  onSortChange,
  isFavorite,
  onToggleFavorite,
  isCut,
  onItemDragStart,
  onFolderDragOver,
  onFolderDrop,
  onDragEnd,
}) {
  const showFavorites = typeof isFavorite === "function" && typeof onToggleFavorite === "function";
  const supportsDnD = typeof onItemDragStart === "function";
  const [dragOverPath, setDragOverPath] = useState(null);

  const handleRowClick = useCallback(
    (file, event) => {
      event.stopPropagation();
      onSelect?.(file, event);
    },
    [onSelect]
  );

  const handleRowDoubleClick = useCallback(
    (file, event) => {
      event.stopPropagation();
      onOpen?.(file);
    },
    [onOpen]
  );

  /**
   * Handle favorite toggle click — stop propagation so row selection doesn't fire.
   * @param {React.MouseEvent} e
   * @param {Object} file
   */
  const handleFavoriteClick = useCallback(
    (e, file) => {
      e.stopPropagation();
      e.preventDefault();
      onToggleFavorite?.(file.path);
    },
    [onToggleFavorite]
  );

  if (!files || files.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-64"
      >
        <p className="text-body-regular text-text-secondary">
          No files or folders
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border-table">
            <SortableHeader
              field="name"
              label="Name"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
            />
            <SortableHeader
              field="size"
              label="Size"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
              align="end"
            />
            <SortableHeader
              field="modified"
              label="Modified"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
            />
            <SortableHeader
              field="type"
              label="Type"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
            />
            {showFavorites && <th className="w-10" />}
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const isSelected = selectedFiles.has(file.path);
            const favorited = showFavorites && isFavorite(file.path);
            const cutPending = typeof isCut === 'function' && isCut(file.path);
            const isDragOver = dragOverPath === file.path;
            const isFolder = file.type === 'directory';
            const row = (
              <tr
                key={file.path}
                onClick={(e) => handleRowClick(file, e)}
                onDoubleClick={(e) => handleRowDoubleClick(file, e)}
                draggable={supportsDnD}
                onDragStart={(e) => {
                  if (supportsDnD) onItemDragStart(e, file);
                }}
                onDragOver={(e) => {
                  if (isFolder && onFolderDragOver) {
                    const valid = onFolderDragOver(e, file);
                    if (valid) setDragOverPath(file.path);
                  }
                }}
                onDragLeave={() => {
                  if (isFolder) setDragOverPath(null);
                }}
                onDrop={(e) => {
                  if (isFolder && onFolderDrop) {
                    setDragOverPath(null);
                    onFolderDrop(e, file);
                  }
                }}
                onDragEnd={() => {
                  setDragOverPath(null);
                  onDragEnd?.();
                }}
                className={cx(
                  "border-b border-separator-border cursor-pointer transition-colors",
                  "hover:bg-background-secondary-hover",
                  isSelected && "bg-background-selection",
                  cutPending && "opacity-50",
                  isDragOver && "ring-2 ring-inset ring-accent-500 bg-background-selection"
                )}
              >
                {/* Name */}
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {file.type !== 'directory' && isSupportedImageFormat(file.extension) ? (
                      <ThumbnailImage file={file} size="small" />
                    ) : (
                      <FileIcon
                        type={file.type}
                        name={file.name}
                        extension={file.extension}
                        size="sm"
                      />
                    )}
                    <span className="text-body-regular text-text-primary truncate">
                      {file.name}
                    </span>
                  </div>
                </td>

                {/* Size */}
                <td className="px-4 py-2 text-end">
                  <span className="text-body-regular text-text-secondary">
                    {file.type === "directory" ? "—" : formatSize(file.size)}
                  </span>
                </td>

                {/* Modified */}
                <td className="px-4 py-2">
                  <span className="text-body-regular text-text-secondary">
                    {formatDate(file.modifiedAt)}
                  </span>
                </td>

                {/* Type */}
                <td className="px-4 py-2">
                  <span className="text-body-regular text-text-secondary">
                    {file.type === "directory"
                      ? "Folder"
                      : getTypeLabel(file.extension)}
                  </span>
                </td>

                {/* Favorite star */}
                {showFavorites && (
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={(e) => handleFavoriteClick(e, file)}
                      className={cx(
                        "p-1 rounded transition-colors",
                        "hover:bg-background-secondary-hover",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                      )}
                      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
                      aria-pressed={favorited}
                    >
                      {favorited ? (
                        <RiStarFill className="size-4 text-accent-500" />
                      ) : (
                        <RiStarLine className="size-4 text-text-tertiary hover:text-accent-500" />
                      )}
                    </button>
                  </td>
                )}
              </tr>
            );

            // Wrap in ContextMenuTrigger if renderContextMenu is provided
            if (renderContextMenu) {
              return (
                <ContextMenuTrigger key={file.path} asChild>
                  {row}
                  {renderContextMenu(file)}
                </ContextMenuTrigger>
              );
            }

            return row;
          })}
        </tbody>
      </table>
    </div>
  );
}
