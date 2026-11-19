"use client";

import { useCallback } from "react";
import { cx } from "@/utils/cx";
import { FileIcon } from "@/components/file-manager/file-icon";

/**
 * File grid/icon view component with multi-select
 * @param {Object} props
 * @param {Array} props.files - Array of file objects
 * @param {(file: Object) => void} props.onOpen - Callback when a file is opened
 * @param {(file: Object, event: React.MouseEvent) => void} props.onSelect - Callback when a file is selected
 * @param {Set<string>} props.selectedFiles - Set of selected file paths
 * @param {(file: Object, position: { x: number, y: number }) => void} props.onContextMenu - Context menu callback
 */
export function FileGrid({
  files = [],
  onOpen,
  onSelect,
  selectedFiles = new Set(),
  onContextMenu,
}) {
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

  const handleContextMenu = useCallback(
    (e, file) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(file, { x: e.clientX, y: e.clientY });
    },
    [onContextMenu]
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

          return (
            <div
              key={file.path}
              onClick={(e) => handleClick(file, e)}
              onDoubleClick={(e) => handleDoubleClick(file, e)}
              onContextMenu={(e) => handleContextMenu(e, file)}
              className={cx(
                "rounded-xl p-3 flex flex-col items-center gap-2 cursor-pointer transition-colors",
                "hover:bg-background-secondary-hover",
                isSelected && "ring-2 ring-accent-500 bg-accent-50 dark:bg-accent-950"
              )}
            >
              <FileIcon
                type={file.type}
                extension={file.extension}
                size="lg"
              />
              <span className="text-caption-1-medium text-text-primary text-center truncate w-full">
                {file.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
