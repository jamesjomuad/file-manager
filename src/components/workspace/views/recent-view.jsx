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
import { RiTimeLine, RiDeleteBinLine, RiRefreshLine } from "@remixicon/react";

/**
 * Recent files view rendered within the workspace.
 */
export function RecentView() {
  const { openTab } = useWorkspace();
  const navigate = useNavigate();
  const { recentFiles, clearRecent } = useRecentFiles();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { viewMode, setViewMode } = useExplorerStore();

  const [fileMetadata, setFileMetadata] = useState([]);
  const [loading, setLoading] = useState(true);

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
          const res = await fetch(`/api/files/${encodeURIComponent(p)}`);
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

  const handleOpen = useCallback(
    (file) => {
      if (file.type === "directory") {
        const encodedPath = file.path
          .split(/[\\/]/)
          .map(encodeURIComponent)
          .join("/");
        navigate(`/explorer/${encodedPath}`);
      } else {
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
    [openTab, navigate]
  );

  const handleSelect = useCallback(() => {}, []);
  const emptySet = useMemo(() => new Set(), []);
  const showEmpty = !loading && fileMetadata.length === 0;

  return (
    <div className="flex flex-col h-full">
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
    </div>
  );
}
