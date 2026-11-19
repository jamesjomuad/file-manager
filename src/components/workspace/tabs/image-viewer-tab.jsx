"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { ImageViewer } from "@/components/image-viewer/image-viewer";

/**
 * Image Viewer tab content component.
 * Renders the premium image viewer within the workspace tab system.
 *
 * @param {Object} props
 * @param {Object} props.tab - The workspace tab object
 */
export function ImageViewerTabContent({ tab }) {
  const { closeTab } = useWorkspace();
  const [galleryFiles, setGalleryFiles] = useState(
    tab.state?.galleryFiles || []
  );
  const [currentIndex, setCurrentIndex] = useState(
    tab.state?.currentIndex || 0
  );
  const [error, setError] = useState(null);

  const currentFile = galleryFiles[currentIndex];

  /**
   * Handle close
   */
  const handleClose = useCallback(() => {
    closeTab(tab.id);
  }, [tab.id, closeTab]);

  /**
   * Handle image navigation — update tab state for persistence
   */
  const handleNavigate = useCallback(
    (index) => {
      setCurrentIndex(index);
    },
    []
  );

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-body-medium text-text-error">{error}</p>
        <button
          onClick={handleClose}
          className="px-3 py-1.5 text-sm text-text-primary bg-background-secondary-default hover:bg-background-secondary-hover rounded-lg transition-colors"
        >
          Close Tab
        </button>
      </div>
    );
  }

  if (!currentFile) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-body-medium text-text-secondary">
          No image to display
        </p>
        <button
          onClick={handleClose}
          className="px-3 py-1.5 text-sm text-text-primary bg-background-secondary-default hover:bg-background-secondary-hover rounded-lg transition-colors"
        >
          Close Tab
        </button>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ImageViewer
        file={currentFile}
        galleryFiles={galleryFiles}
        initialIndex={currentIndex}
        onClose={handleClose}
        onNavigate={handleNavigate}
        embedded={true}
      />
    </div>
  );
}
