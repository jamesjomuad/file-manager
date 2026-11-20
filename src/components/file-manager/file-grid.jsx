"use client";

import { useCallback } from "react";
import { cx } from "@/utils/cx";
import { FileIcon } from "@/components/file-manager/file-icon";
import { ThumbnailImage } from "@/components/file-manager/thumbnail-image";
import { ContextMenuTrigger } from "@/components/base/context-menu/context-menu";
import { RiStarLine, RiStarFill } from "@remixicon/react";
import { isSupportedImageFormat } from "@/lib/image/image-utils";

/**
 * File grid/icon view component with multi-select
 * @param {Object} props
 * @param {Array} props.files - Array of file objects
 * @param {(file: Object) => void} props.onOpen - Callback when a file is opened
 * @param {(file: Object, event: React.MouseEvent) => void} props.onSelect - Callback when a file is selected
 * @param {Set<string>} props.selectedFiles - Set of selected file paths
 * @param {(file: Object) => React.ReactNode} [props.renderContextMenu] - Returns BoardUI ContextMenu JSX for a file
 * @param {(path: string) => boolean} [props.isFavorite] - Check if a path is favorited
 * @param {(path: string) => void} [props.onToggleFavorite] - Toggle favorite for a path
 */
export function FileGrid({
  files = [],
  onOpen,
  onSelect,
  selectedFiles = new Set(),
  renderContextMenu,
  isFavorite,
  onToggleFavorite,
}) {
  const showFavorites = typeof isFavorite === "function" && typeof onToggleFavorite === "function";

  const handleClick = useCallback(
    (file, event) => {
      event.stopPropagation();
      onSelect?.(file, event);
    },
    [onSelect]
  );

  const handleDoubleClick = useCallback(
    (file, event) => {
      event.stopPropagation();
      onOpen?.(file);
    },
    [onOpen]
  );

  /**
   * Handle favorite toggle click — stop propagation so card selection doesn't fire.
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
    <div className="p-4 min-h-full">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4">
        {files.map((file) => {
          const isSelected = selectedFiles.has(file.path);
          const favorited = showFavorites && isFavorite(file.path);

          const card = (
            <div
              key={file.path}
              onClick={(e) => handleClick(file, e)}
              onDoubleClick={(e) => handleDoubleClick(file, e)}
              className={cx(
                "relative rounded-xl p-3 pt-6 flex flex-col items-center gap-2 cursor-pointer transition-colors",
                "hover:bg-background-secondary-hover",
                isSelected && "ring-2 ring-accent-500 bg-background-selection"
              )}
            >
              {/* Favorite star overlay (top-right corner) */}
              {showFavorites && (
                <button
                  type="button"
                  onClick={(e) => handleFavoriteClick(e, file)}
                  className={cx(
                    "absolute top-1 end-1 p-1 rounded transition-colors",
                    "hover:bg-background-secondary-hover",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                  )}
                  aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
                  aria-pressed={favorited}
                >
                  {favorited ? (
                    <RiStarFill className="size-4 text-accent-500" />
                  ) : (
                    <RiStarLine className="size-4 text-text-tertiary hover:text-accent-500 transition-colors" />
                  )}
                </button>
              )}

              {/* Thumbnail for image files */}
              {file.type !== 'directory' && isSupportedImageFormat(file.extension) ? (
                <ThumbnailImage file={file} size="medium" />
              ) : (
                <FileIcon
                  type={file.type}
                  name={file.name}
                  extension={file.extension}
                  size="lg"
                />
              )}
              <span className="text-caption-1-medium text-text-primary text-center truncate w-full">
                {file.name}
              </span>
            </div>
          );

          // Wrap in ContextMenuTrigger if renderContextMenu is provided
          if (renderContextMenu) {
            return (
              <ContextMenuTrigger key={file.path}>
                {card}
                {renderContextMenu(file)}
              </ContextMenuTrigger>
            );
          }

          return card;
        })}
      </div>
    </div>
  );
}
