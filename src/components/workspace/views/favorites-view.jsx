"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FileList } from "@/components/file-manager/file-list";
import { FileGrid } from "@/components/file-manager/file-grid";
import { Button } from "@/components/base/buttons/button";
import { useFavorites } from "@/hooks/use-favorites";
import { useRecentFiles } from "@/hooks/use-recent-files";
import { useWorkspace } from "@/contexts/workspace-context";
import { useExplorerStore } from "@/stores/explorer-store";
import { isSupportedImageFormat } from "@/lib/image/image-utils";
import { RiStarLine, RiDeleteBinLine, RiRefreshLine } from "@remixicon/react";

/**
 * Favorites view rendered within the workspace.
 */
export function FavoritesView() {
  const { openTab } = useWorkspace();
  const navigate = useNavigate();
  const { favorites, removeFavorite, toggleFavorite, clearFavorites } = useFavorites();
  const { addRecent } = useRecentFiles();
  const { viewMode, setViewMode } = useExplorerStore();

  const [fileMetadata, setFileMetadata] = useState([]);
  const [missingPaths, setMissingPaths] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const loadMetadata = useCallback(async () => {
    if (favorites.length === 0) {
      setFileMetadata([]);
      setMissingPaths(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);
    const missing = new Set();
    const results = await Promise.all(
      favorites.map(async (p) => {
        try {
          const res = await fetch(`/api/files/${encodeURIComponent(p)}`);
          if (!res.ok) {
            missing.add(p);
            return null;
          }
          const data = await res.json();
          return data.data || data;
        } catch {
          missing.add(p);
          return null;
        }
      })
    );

    setFileMetadata(results.filter(Boolean));
    setMissingPaths(missing);
    setLoading(false);
  }, [favorites]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  const handleOpen = useCallback(
    (file) => {
      if (file.type === "directory") {
        const encodedPath = file.path
          .split(/[\\/]/)
          .map(encodeURIComponent)
          .join("/");
        navigate(`/explorer/${encodedPath}`);
      } else {
        addRecent(file.path);
        const ext = file.extension?.toLowerCase();
        if (isSupportedImageFormat(ext)) {
          openTab('image-viewer', {
            path: file.path,
            title: file.name,
          });
        } else if (ext === '.pdf') {
          openTab('pdf-viewer', { path: file.path, title: file.name });
        } else if (['.md', '.markdown'].includes(ext)) {
          openTab('markdown-viewer', { path: file.path, title: file.name });
        } else if (['.txt', '.log', '.csv'].includes(ext)) {
          openTab('text-viewer', { path: file.path, title: file.name });
        } else {
          openTab('editor', { path: file.path, title: file.name });
        }
      }
    },
    [openTab, navigate, addRecent]
  );

  const handleSelect = useCallback(() => {}, []);
  const emptySet = useMemo(() => new Set(), []);
  const hasMissing = missingPaths.size > 0;
  const showEmpty = !loading && fileMetadata.length === 0 && !hasMissing;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-background-primary-default border-b border-separator-border shrink-0">
        <div className="flex items-center gap-2">
          <RiStarLine className="size-5 text-accent-500" aria-hidden />
          <span className="text-title-3-semibold text-text-primary">
            Favorites
          </span>
          <span className="text-caption-1-semibold text-text-tertiary ms-1">
            {favorites.length} {favorites.length === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="flex-1" />

        {hasMissing && (
          <span className="text-caption-1-medium text-text-warning-secondary">
            {missingPaths.size} missing file{missingPaths.size === 1 ? "" : "s"}
          </span>
        )}

        {favorites.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="small"
              iconOnly
              leadingIcon={RiRefreshLine}
              aria-label="Refresh"
              onClick={loadMetadata}
            />
            <Button
              variant="danger"
              size="small"
              leadingIcon={RiDeleteBinLine}
              onClick={() => {
                if (confirm("Clear all favorites?")) clearFavorites();
              }}
            >
              Clear All
            </Button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-body-regular text-text-secondary">Loading favorites...</p>
          </div>
        ) : showEmpty ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <RiStarLine className="size-10 text-text-tertiary" aria-hidden />
            <p className="text-body-regular text-text-secondary">
              No favorites yet
            </p>
            <p className="text-caption-1-regular text-text-tertiary max-w-xs text-center">
              Click the star icon next to any file to add it to your favorites.
            </p>
          </div>
        ) : (
          <>
            {/* Missing paths warning */}
            {hasMissing && (
              <div className="mx-4 mt-4 p-3 rounded-lg bg-background-warning-subtle border border-border-warning-subtle">
                <p className="text-body-regular text-text-warning-secondary mb-2">
                  {missingPaths.size} favorited file{missingPaths.size === 1 ? " no longer exists" : "s no longer exist"} and will be removed:
                </p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(missingPaths).map((p) => (
                    <Button
                      key={p}
                      variant="ghost"
                      size="xs"
                      onClick={() => removeFavorite(p)}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* File listing */}
            {viewMode === "list" ? (
              <FileList
                files={fileMetadata}
                onOpen={handleOpen}
                onSelect={handleSelect}
                selectedFiles={emptySet}
                isFavorite={(p) => favorites.includes(p)}
                onToggleFavorite={toggleFavorite}
              />
            ) : (
              <FileGrid
                files={fileMetadata}
                onOpen={handleOpen}
                onSelect={handleSelect}
                selectedFiles={emptySet}
                isFavorite={(p) => favorites.includes(p)}
                onToggleFavorite={toggleFavorite}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
