"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { FileList } from "@/components/file-manager/file-list";
import { FileGrid } from "@/components/file-manager/file-grid";
import { Button } from "@/components/base/buttons/button";
import { useFavorites } from "@/hooks/use-favorites";
import { useRecentFiles } from "@/hooks/use-recent-files";
import { RiTimeLine, RiDeleteBinLine, RiRefreshLine } from "@remixicon/react";

/**
 * Recent files page — displays the most recently opened files.
 *
 * Fetches metadata for each tracked path from the API. Paths that no longer
 * exist are silently filtered out so the list stays accurate.
 */
export default function RecentPage() {
  const router = useRouter();
  const { recentFiles, clearRecent } = useRecentFiles();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [viewMode, setViewMode] = useState("grid");
  const [fileMetadata, setFileMetadata] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * Load metadata for each recent path, preserving the recency order.
   * Paths that fail to load (e.g. deleted files) are silently skipped.
   */
  const loadMetadata = useCallback(async () => {
    if (recentFiles.length === 0) {
      setFileMetadata([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const results = await Promise.all(
      recentFiles.map(async (p) => {
        try {
          const res = await fetch(`/api/files/${p}`);
          if (!res.ok) return null;
          const data = await res.json();
          return data.data || data;
        } catch {
          return null;
        }
      })
    );

    setFileMetadata(results.filter(Boolean));
    setLoading(false);
  }, [recentFiles]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  /**
   * Open a file (only files, not directories, are tracked in recents).
   * @param {Object} file
   */
  const handleOpen = useCallback(
    (file) => {
      if (file.type === "directory") {
        router.push(`/files?path=${encodeURIComponent(file.path)}`);
      } else {
        // Re-add to move it to the top of the list
        // (addRecent is called here but it was already called from files page
        // when the user last opened it, so this just bumps it to the front)
        router.push(`/editor?path=${encodeURIComponent(file.path)}`);
      }
    },
    [router]
  );

  /**
   * Select handler — no-op (these pages don't support multi-select).
   */
  const handleSelect = useCallback(() => {}, []);

  /** Memoized empty set — these pages don't support multi-select */
  const emptySet = useMemo(() => new Set(), []);

  const showEmpty = !loading && fileMetadata.length === 0;

  return (
    <AppShell
      currentPath="/recent"
      path=""
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-background-primary-default border-b border-separator-border shrink-0">
        <div className="flex items-center gap-2">
          <RiTimeLine className="size-5 text-accent-500" aria-hidden />
          <span className="text-title-3-semibold text-text-primary">
            Recent Files
          </span>
          <span className="text-caption-1-semibold text-text-tertiary ms-1">
            {fileMetadata.length} {fileMetadata.length === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="flex-1" />

        {recentFiles.length > 0 && (
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
                if (confirm("Clear recent files history?")) clearRecent();
              }}
            >
              Clear History
            </Button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-body-regular text-text-secondary">Loading recent files...</p>
          </div>
        ) : showEmpty ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <RiTimeLine className="size-10 text-text-tertiary" aria-hidden />
            <p className="text-body-regular text-text-secondary">
              No recent files
            </p>
            <p className="text-caption-1-regular text-text-tertiary max-w-xs text-center">
              Files you open will appear here, most recent first.
            </p>
            <Button
              variant="secondary"
              size="small"
              onClick={() => router.push("/files")}
            >
              Browse Files
            </Button>
          </div>
        ) : viewMode === "list" ? (
          <FileList
            files={fileMetadata}
            onOpen={handleOpen}
            onSelect={handleSelect}
            selectedFiles={emptySet}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <FileGrid
            files={fileMetadata}
            onOpen={handleOpen}
            onSelect={handleSelect}
            selectedFiles={emptySet}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </div>
    </AppShell>
  );
}
