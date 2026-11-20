"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cx } from "@/utils/cx";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Breadcrumb } from "@/components/file-manager/breadcrumb";
import { FileIcon } from "@/components/file-manager/file-icon";
import {
  RiFolderLine,
  RiFolderAddLine,
  RiSearchLine,
  RiCloseLine,
  RiCheckLine,
} from "@remixicon/react";
import { toast } from "@/components/base/toast/toast";

const RECENT_DESTINATIONS_KEY = "file-manager-recent-destinations";
const MAX_RECENT = 5;

/**
 * Load recent destinations from localStorage
 * @returns {string[]}
 */
function loadRecentDestinations() {
  try {
    const stored = localStorage.getItem(RECENT_DESTINATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save a destination to recent destinations
 * @param {string} destPath
 */
function saveRecentDestination(destPath) {
  try {
    const recent = loadRecentDestinations();
    const filtered = recent.filter((p) => p !== destPath);
    const updated = [destPath, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_DESTINATIONS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Move To dialog — browse filesystem to choose a destination folder.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether dialog is visible
 * @param {Object[]} props.items - Items being moved [{path, name, type}]
 * @param {string} props.currentPath - Current explorer path (to prevent drop-in-place)
 * @param {() => void} props.onClose - Close callback
 * @param {(destPath: string) => void} props.onConfirm - Called with chosen destination
 */
export function MoveToDialog({
  open,
  items = [],
  currentPath = "",
  onClose,
  onConfirm,
}) {
  const [destPath, setDestPath] = useState("");
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [recentDestinations, setRecentDestinations] = useState([]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setDestPath(currentPath || "");
      setSearchQuery("");
      setShowNewFolder(false);
      setNewFolderName("");
      setRecentDestinations(loadRecentDestinations());
    }
  }, [open, currentPath]);

  // Fetch folders when destPath changes
  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (destPath) {
        params.set("path", destPath);
      }

      const response = await fetch(`/api/files?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load folders");

      const data = await response.json();
      const allItems = data.data || data.files || [];
      // Filter to directories only
      setFolders(allItems.filter((f) => f.type === "directory"));
    } catch (error) {
      console.error("Error fetching folders:", error);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, [destPath]);

  useEffect(() => {
    if (open) {
      fetchFolders();
    }
  }, [open, fetchFolders]);

  // Filtered folders based on search
  const filteredFolders = useMemo(() => {
    if (!searchQuery) return folders;
    return folders.filter((f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [folders, searchQuery]);

  // Check if a destination is invalid (source dir or descendant)
  const isInvalidDestination = useCallback(
    (targetPath) => {
      for (const item of items) {
        if (item.type !== "directory") continue;
        // Prevent moving a directory into itself or a descendant
        const normalizedItem = item.path.replace(/\\/g, "/");
        const normalizedTarget = targetPath.replace(/\\/g, "/");
        if (
          normalizedTarget === normalizedItem ||
          normalizedTarget.startsWith(normalizedItem + "/")
        ) {
          return true;
        }
      }
      return false;
    },
    [items]
  );

  const invalidDest = isInvalidDestination(destPath);

  // Navigate into a folder
  const handleNavigate = useCallback((path) => {
    setDestPath(path);
  }, []);

  // Navigate up
  const handleNavigateUp = useCallback(() => {
    const parentPath = destPath.split(/[\\/]/).slice(0, -1).join("/");
    setDestPath(parentPath);
  }, [destPath]);

  // Navigate to recent destination
  const handleRecentClick = useCallback((path) => {
    setDestPath(path);
  }, []);

  // Create new folder
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;

    try {
      const folderPath = destPath
        ? `${destPath}/${newFolderName.trim()}`
        : newFolderName.trim();

      const response = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "directory",
          path: folderPath,
        }),
      });

      if (!response.ok) throw new Error("Failed to create folder");

      setNewFolderName("");
      setShowNewFolder(false);
      fetchFolders();
      toast.success("Folder created");
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Failed to create folder");
    }
  }, [destPath, newFolderName, fetchFolders]);

  // Confirm move
  const handleConfirm = useCallback(() => {
    if (invalidDest) return;
    saveRecentDestination(destPath || ".");
    onConfirm(destPath || ".");
  }, [destPath, invalidDest, onConfirm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background-primary-default border border-border-primary-default rounded-xl shadow-lg w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary-default">
          <h2 className="text-title-2-semibold text-text-primary">
            Move {items.length} item{items.length !== 1 ? "s" : ""} to...
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-background-secondary-hover transition-colors"
            aria-label="Close"
          >
            <RiCloseLine className="size-5 text-text-secondary" />
          </button>
        </div>

        {/* Items being moved */}
        <div className="px-6 py-3 border-b border-border-primary-default">
          <div className="flex items-center gap-2 overflow-x-auto">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.path}
                className="flex items-center gap-1 px-2 py-1 rounded bg-background-secondary-default text-caption-1-regular text-text-secondary shrink-0"
              >
                <FileIcon
                  type={item.type}
                  name={item.name}
                  size="xs"
                />
                <span className="truncate max-w-[100px]">{item.name}</span>
              </div>
            ))}
            {items.length > 5 && (
              <span className="text-caption-1-regular text-text-tertiary shrink-0">
                +{items.length - 5} more
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="px-6 py-2 border-b border-border-primary-default">
          <Breadcrumb path={destPath} onNavigate={handleNavigate} />
        </div>

        {/* Search and new folder */}
        <div className="px-6 py-3 flex items-center gap-2 border-b border-border-primary-default">
          <div className="flex-1 relative">
            <RiSearchLine className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-text-tertiary" />
            <Input
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={RiFolderAddLine}
            onClick={() => setShowNewFolder(!showNewFolder)}
          >
            New Folder
          </Button>
        </div>

        {/* New folder input */}
        {showNewFolder && (
          <div className="px-6 py-2 flex items-center gap-2 border-b border-border-primary-default">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }
              }}
              autoFocus
            />
            <Button size="sm" onClick={handleCreateFolder}>
              Create
            </Button>
          </div>
        )}

        {/* Recent destinations */}
        {recentDestinations.length > 0 && !searchQuery && (
          <div className="px-6 py-2 border-b border-border-primary-default">
            <p className="text-caption-1-semibold text-text-tertiary mb-1">
              Recent
            </p>
            <div className="flex flex-wrap gap-1">
              {recentDestinations.map((path) => (
                <button
                  key={path}
                  onClick={() => handleRecentClick(path)}
                  className={cx(
                    "flex items-center gap-1 px-2 py-1 rounded text-caption-1-regular transition-colors",
                    "hover:bg-background-secondary-hover",
                    path === destPath
                      ? "bg-background-selection text-accent-500"
                      : "text-text-secondary"
                  )}
                >
                  <RiFolderLine className="size-3.5" />
                  <span className="truncate max-w-[120px]">
                    {path === "." ? "Root" : path.split(/[\\/]/).pop()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Folder list */}
        <div className="flex-1 overflow-auto px-2 py-2">
          {/* Parent directory button */}
          {destPath && (
            <button
              onClick={handleNavigateUp}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background-secondary-hover transition-colors text-start"
            >
              <RiFolderLine className="size-5 text-text-tertiary" />
              <span className="text-body-regular text-text-secondary">..</span>
            </button>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-body-regular text-text-secondary">
                Loading...
              </span>
            </div>
          ) : filteredFolders.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-body-regular text-text-secondary">
                {searchQuery ? "No folders match search" : "No subfolders"}
              </span>
            </div>
          ) : (
            filteredFolders.map((folder) => {
              const isSourceDir = items.some(
                (item) =>
                  item.type === "directory" &&
                  item.path.replace(/\\/g, "/") === folder.path.replace(/\\/g, "/")
              );

              return (
                <button
                  key={folder.path}
                  onClick={() => !isSourceDir && handleNavigate(folder.path)}
                  disabled={isSourceDir}
                  className={cx(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-start",
                    !isSourceDir && "hover:bg-background-secondary-hover cursor-pointer",
                    isSourceDir && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <FileIcon
                    type="directory"
                    name={folder.name}
                    size="sm"
                  />
                  <span className="text-body-regular text-text-primary truncate">
                    {folder.name}
                  </span>
                  {isSourceDir && (
                    <span className="text-caption-1-regular text-text-tertiary ms-auto">
                      Source
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-primary-default">
          <div className="text-caption-1-regular text-text-secondary">
            Destination:{" "}
            <span className="text-text-primary font-medium">
              {invalidDest
                ? "Invalid (cannot move into source)"
                : destPath || "Root"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={invalidDest}
              leadingIcon={RiCheckLine}
            >
              Move Here
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
