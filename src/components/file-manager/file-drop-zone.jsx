"use client";

import { useState, useCallback } from "react";
import { cx } from "@/utils/cx";
import { RiUploadLine } from "@remixicon/react";

/**
 * Drag & drop zone overlay for file upload
 * Shows visual feedback when files are dragged over the file explorer
 * @param {Object} props
 * @param {boolean} props.visible - Whether the drop zone is active/visible
 * @param {(files: File[]) => void} props.onDrop - Called with dropped files
 * @param {boolean} props.uploading - Whether files are currently being uploaded
 */
export function FileDropZone({ visible = false, onDrop, uploading = false }) {
  const [isDragOver, setIsDragOver] = useState(false);

  /**
   * Handle drag enter
   * @param {React.DragEvent} e
   */
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only track drags that contain files
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  /**
   * Handle drag over
   * @param {React.DragEvent} e
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * Handle drag leave
   * @param {React.DragEvent} e
   */
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if we're leaving the zone itself (not a child)
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  }, []);

  /**
   * Handle drop
   * @param {React.DragEvent} e
   */
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onDrop(files);
      }
    },
    [onDrop]
  );

  // Determine visibility
  const showOverlay = visible || isDragOver;

  return (
    <div
      className={cx(
        "absolute inset-0 z-30 flex items-center justify-center transition-all duration-200",
        showOverlay
          ? "visible opacity-100"
          : "invisible opacity-0 pointer-events-none"
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background-primary-default/80 backdrop-blur-sm" />

      {/* Upload indicator card */}
      <div
        className={cx(
          "relative flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed transition-colors",
          isDragOver
            ? "border-accent-500 bg-accent-500/10"
            : "border-border-button-default bg-background-primary-default"
        )}
      >
        {uploading ? (
          <>
            <div className="w-10 h-10 rounded-full border-2 border-accent-500 border-t-transparent animate-spin" />
            <p className="text-body-regular text-text-primary font-medium">
              Uploading...
            </p>
          </>
        ) : (
          <>
            <RiUploadLine
              className={cx(
                "w-10 h-10",
                isDragOver ? "text-accent-500" : "text-foreground-icon-secondary"
              )}
            />
            <p className="text-body-regular text-text-primary font-medium">
              Drop files to upload
            </p>
            <p className="text-caption-1-regular text-text-secondary">
              or use the Upload button in the toolbar
            </p>
          </>
        )}
      </div>
    </div>
  );
}
