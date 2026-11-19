"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { ImageViewer } from "@/components/image-viewer/image-viewer";
import { isSupportedImageFormat } from "@/lib/image/image-utils";

/**
 * Maximum number of gallery entries loaded in a single fetch.
 * Used as a safety cap when the directory listing returns many files.
 */
const MAX_GALLERY_FETCH = 5000;

/**
 * Extract the parent directory from a file path.
 * @param {string} filePath
 * @returns {string}
 */
function getParentDirectory(filePath) {
  if (!filePath) return "";
  const normalized = filePath.replace(/\\/g, "/");
  const lastSep = normalized.lastIndexOf("/");
  return lastSep > 0 ? normalized.substring(0, lastSep) : "";
}

/**
 * Image Viewer tab content component.
 *
 * Loads ONLY the currently selected image. Gallery metadata is fetched
 * on-demand (once) to support Previous/Next navigation, but no other
 * images are pre-loaded. The filmstrip renders only a small window of
 * thumbnails around the current index.
 *
 * @param {Object} props
 * @param {Object} props.tab - The workspace tab object
 */
export function ImageViewerTabContent({ tab }) {
  const { closeTab, updateTabState } = useWorkspace();
  const [error, setError] = useState(null);

  // Tab state
  const filePath = tab.path;
  const directoryPath = tab.state?.directoryPath ?? getParentDirectory(filePath);

  // Backward compatibility: if old tab state has galleryFiles, use it directly
  const legacyGallery = tab.state?.galleryFiles || null;

  // Current file — loaded on demand
  const [currentFile, setCurrentFile] = useState(() => {
    if (legacyGallery && tab.state?.currentIndex != null) {
      return legacyGallery[tab.state.currentIndex] || null;
    }
    // Construct a minimal file object from the tab path
    if (filePath) {
      const name = filePath.replace(/\\/g, "/").split("/").pop() || filePath;
      const ext = name.includes(".") ? "." + name.split(".").pop().toLowerCase() : "";
      return { path: filePath, name, type: "file", extension: ext };
    }
    return null;
  });

  // Gallery state — only image files, loaded lazily
  const [galleryFiles, setGalleryFiles] = useState(() => {
    if (legacyGallery) return legacyGallery;
    return null; // null = not yet loaded
  });
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (legacyGallery && tab.state?.currentIndex != null) {
      return tab.state.currentIndex;
    }
    return 0;
  });

  // Track whether gallery fetch is in progress
  const galleryFetchRef = useRef(null);

  // Load gallery in background on mount (metadata only, no image data)
  useEffect(() => {
    if (galleryFiles === null && !legacyGallery) {
      ensureGalleryLoaded();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load current file metadata from API on mount (only if we only have a minimal file object)
  useEffect(() => {
    if (!filePath) return;
    if (legacyGallery) return; // Already have full metadata

    let cancelled = false;
    const loadFile = async () => {
      try {
        const res = await fetch(`/api/files/${encodeURIComponent(filePath)}`);
        if (!res.ok) {
          if (!cancelled) setError(`Failed to load file: ${res.statusText}`);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          const fileData = data.data || data;
          setCurrentFile(fileData);
        }
      } catch (err) {
        if (!cancelled) setError(`Failed to load file: ${err.message}`);
      }
    };

    loadFile();
    return () => { cancelled = true; };
  }, [filePath, legacyGallery]);

  // Load gallery on-demand (only once, when needed)
  const ensureGalleryLoaded = useCallback(async () => {
    // Already loaded or fetch in progress
    if (galleryFiles !== null) return;
    if (galleryFetchRef.current) {
      await galleryFetchRef.current;
      return;
    }

    if (!directoryPath && directoryPath !== "") return;

    const fetchPromise = (async () => {
      try {
        const params = new URLSearchParams();
        if (directoryPath) params.set("path", directoryPath);

        const res = await fetch(`/api/files?${params.toString()}`);
        if (!res.ok) {
          console.warn("Failed to load directory for gallery navigation");
          return;
        }
        const data = await res.json();
        const items = (data.data || data.files || []).slice(0, MAX_GALLERY_FETCH);

        // Filter to only image files, sorted
        const imageFiles = items
          .filter((f) => f.type !== "directory" && isSupportedImageFormat(f.extension))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        setGalleryFiles(imageFiles);

        // Update current index based on current file path
        if (currentFile) {
          const idx = imageFiles.findIndex((f) => f.path === currentFile.path);
          if (idx >= 0) {
            setCurrentIndex(idx);
          }
        }
      } catch (err) {
        console.warn("Failed to load gallery:", err);
      } finally {
        galleryFetchRef.current = null;
      }
    })();

    galleryFetchRef.current = fetchPromise;
    await fetchPromise;
  }, [galleryFiles, directoryPath, currentFile]);

  /**
   * Handle close
   */
  const handleClose = useCallback(() => {
    closeTab(tab.id);
  }, [tab.id, closeTab]);

  /**
   * Handle image navigation — update tab state for persistence
   * Also triggers gallery loading if not already loaded
   */
  const handleNavigate = useCallback(
    async (index) => {
      setCurrentIndex(index);

      // Ensure gallery is loaded so we can resolve the new file
      if (galleryFiles === null) {
        await ensureGalleryLoaded();
      }
    },
    [galleryFiles, ensureGalleryLoaded]
  );

  // After gallery loads, sync currentIndex and currentFile
  useEffect(() => {
    if (galleryFiles === null || galleryFiles.length === 0) return;
    if (currentFile && currentIndex < galleryFiles.length) {
      const galleryFile = galleryFiles[currentIndex];
      if (galleryFile && galleryFile.path !== currentFile.path) {
        setCurrentFile(galleryFile);
      }
    }
  }, [galleryFiles, currentIndex, currentFile]);

  /**
   * Compute the window of gallery files visible to the filmstrip.
   * Only renders ±20 entries around the current index to avoid DOM bloat.
   */
  const filmstripWindow = useMemo(() => {
    if (!galleryFiles || galleryFiles.length === 0) return { files: [], offset: 0 };

    const WINDOW = 20;
    const start = Math.max(0, currentIndex - WINDOW);
    const end = Math.min(galleryFiles.length, currentIndex + WINDOW + 1);
    return {
      files: galleryFiles.slice(start, end),
      offset: start,
    };
  }, [galleryFiles, currentIndex]);

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
        galleryFiles={galleryFiles || []}
        initialIndex={currentIndex}
        onClose={handleClose}
        onNavigate={handleNavigate}
        embedded={true}
      />
    </div>
  );
}
