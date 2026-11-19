"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { FileToolbar } from "@/components/file-manager/file-toolbar";
import { ConfirmDialog } from "@/components/file-manager/confirm-dialog";
import { FileIcon } from "@/components/file-manager/file-icon";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import {
  RiArrowGoBackLine,
  RiDeleteBinLine,
} from "@remixicon/react";

/**
 * Format date to relative time string
 * @param {string|Date} date - Date to format
 * @returns {string}
 */
function formatRelativeTime(date) {
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
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}mo ago`;
  return `${Math.floor(diffDay / 365)}y ago`;
}

/**
 * Format file size to human-readable string
 * @param {number} bytes - Size in bytes
 * @returns {string}
 */
function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  if (typeof bytes !== "number") return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Trash page - displays all deleted items
 */
export default function TrashPage() {
  const [trashItems, setTrashItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list");
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [confirmDialog, setConfirmDialog] = useState(null);

  /**
   * Fetch trash items
   */
  const fetchTrash = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/trash");
      if (!response.ok) {
        throw new Error("Failed to fetch trash");
      }

      const data = await response.json();
      setTrashItems(data.data || []);
    } catch (error) {
      console.error("Error fetching trash:", error);
      setTrashItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch trash on mount
  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  /**
   * Handle item selection
   * @param {Object} item - Trash item being selected
   * @param {React.MouseEvent} event - Click event
   */
  const handleSelect = useCallback((item, event) => {
    const isCtrlOrMeta = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;

    setSelectedItems((prev) => {
      const newSelection = new Set(prev);

      if (isShift || isCtrlOrMeta) {
        if (newSelection.has(item.trashName)) {
          newSelection.delete(item.trashName);
        } else {
          newSelection.add(item.trashName);
        }
      } else {
        newSelection.clear();
        newSelection.add(item.trashName);
      }

      return newSelection;
    });
  }, []);

  /**
   * Handle restore action
   * @param {Object} item - Trash item to restore
   */
  const handleRestore = useCallback(
    async (item) => {
      try {
        const response = await fetch("/api/trash/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trashName: item.trashName }),
        });

        if (!response.ok) {
          throw new Error("Failed to restore item");
        }

        const data = await response.json();
        alert(`Restored to: ${data.data.restoredPath}`);
        
        fetchTrash();
        setSelectedItems(new Set());
      } catch (error) {
        console.error("Error restoring:", error);
        alert("Failed to restore item");
      }
    },
    [fetchTrash]
  );

  /**
   * Handle permanent delete action
   * @param {Object} item - Trash item to delete
   */
  const handlePermanentDelete = useCallback((item) => {
    setConfirmDialog({
      item,
      title: "Permanently Delete",
      message: `Are you sure you want to permanently delete "${item.name}"? This action cannot be undone.`,
      confirmLabel: "Delete Forever",
      isBulk: false,
    });
  }, []);

  /**
   * Confirm permanent delete
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDialog?.item) return;

    try {
      setConfirmDialog((prev) => ({ ...prev, loading: true }));

      const response = await fetch(`/api/trash/${confirmDialog.item.trashName}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      setConfirmDialog(null);
      fetchTrash();
      setSelectedItems(new Set());
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Failed to delete item");
      setConfirmDialog((prev) => ({ ...prev, loading: false }));
    }
  }, [confirmDialog, fetchTrash]);

  /**
   * Handle bulk permanent delete
   */
  const handleBulkDelete = useCallback(() => {
    if (selectedItems.size === 0) return;

    setConfirmDialog({
      item: { name: `${selectedItems.size} items` },
      title: "Permanently Delete",
      message: `Are you sure you want to permanently delete ${selectedItems.size} selected items? This action cannot be undone.`,
      confirmLabel: "Delete Forever",
      isBulk: true,
    });
  }, [selectedItems]);

  /**
   * Confirm bulk permanent delete
   */
  const handleConfirmBulkDelete = useCallback(async () => {
    try {
      setConfirmDialog((prev) => ({ ...prev, loading: true }));

      const trashNames = Array.from(selectedItems);

      await Promise.all(
        trashNames.map((trashName) =>
          fetch(`/api/trash/${trashName}`, {
            method: "DELETE",
          })
        )
      );

      setConfirmDialog(null);
      setSelectedItems(new Set());
      fetchTrash();
    } catch (error) {
      console.error("Error bulk deleting:", error);
      alert("Failed to delete some items");
      setConfirmDialog((prev) => ({ ...prev, loading: false }));
    }
  }, [selectedItems, fetchTrash]);

  /**
   * Handle empty trash
   */
  const handleEmptyTrash = useCallback(() => {
    if (trashItems.length === 0) return;

    setConfirmDialog({
      item: { name: "all items" },
      title: "Empty Trash",
      message: `Are you sure you want to permanently delete all ${trashItems.length} items in trash? This action cannot be undone.`,
      confirmLabel: "Empty Trash",
      isBulk: true,
      isEmptyTrash: true,
    });
  }, [trashItems]);

  /**
   * Confirm empty trash
   */
  const handleConfirmEmptyTrash = useCallback(async () => {
    try {
      setConfirmDialog((prev) => ({ ...prev, loading: true }));

      const response = await fetch("/api/trash/empty", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to empty trash");
      }

      setConfirmDialog(null);
      setSelectedItems(new Set());
      fetchTrash();
    } catch (error) {
      console.error("Error emptying trash:", error);
      alert("Failed to empty trash");
      setConfirmDialog((prev) => ({ ...prev, loading: false }));
    }
  }, [fetchTrash]);

  /**
   * Handle confirm dialog action
   */
  const handleConfirm = useCallback(() => {
    if (confirmDialog?.isEmptyTrash) {
      handleConfirmEmptyTrash();
    } else if (confirmDialog?.isBulk) {
      handleConfirmBulkDelete();
    } else {
      handleConfirmDelete();
    }
  }, [
    confirmDialog,
    handleConfirmEmptyTrash,
    handleConfirmBulkDelete,
    handleConfirmDelete,
  ]);

  return (
    <AppShell currentPath="/trash" path="Trash" viewMode={viewMode} onViewModeChange={setViewMode}>
      {/* Trash Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-separator-border">
        <div className="flex items-center gap-3">
          <RiDeleteBinLine className="size-5 text-text-secondary" aria-hidden />
          <h1 className="text-title-3-semibold text-text-primary">
            Trash
          </h1>
          {trashItems.length > 0 && (
            <span className="text-caption-1-medium text-text-secondary">
              ({trashItems.length} {trashItems.length === 1 ? "item" : "items"})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedItems.size > 0 && (
            <Button
              variant="danger"
              size="small"
              leadingIcon={RiDeleteBinLine}
              onClick={handleBulkDelete}
            >
              Delete Selected ({selectedItems.size})
            </Button>
          )}

          {trashItems.length > 0 && (
            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiDeleteBinLine}
              onClick={handleEmptyTrash}
            >
              Empty Trash
            </Button>
          )}
        </div>
      </div>

      {/* Trash Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-body-regular text-text-secondary">Loading...</p>
          </div>
        ) : trashItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <RiDeleteBinLine className="size-12 text-text-tertiary" aria-hidden />
            <p className="text-body-regular text-text-secondary">
              Trash is empty
            </p>
          </div>
        ) : viewMode === "list" ? (
          <div className="overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border-table">
                  <th className="text-caption-1-semibold text-text-secondary px-4 py-2 text-start">
                    Name
                  </th>
                  <th className="text-caption-1-semibold text-text-secondary px-4 py-2 text-start">
                    Original Location
                  </th>
                  <th className="text-caption-1-semibold text-text-secondary px-4 py-2 text-start">
                    Deleted
                  </th>
                  <th className="text-caption-1-semibold text-text-secondary px-4 py-2 text-end">
                    Size
                  </th>
                  <th className="text-caption-1-semibold text-text-secondary px-4 py-2 text-end">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {trashItems.map((item) => {
                  const isSelected = selectedItems.has(item.trashName);

                  return (
                    <tr
                      key={item.trashName}
                      onClick={(e) => handleSelect(item, e)}
                      className={cx(
                        "border-b border-separator-border cursor-pointer transition-colors",
                        "hover:bg-background-secondary-hover",
                        isSelected && "bg-background-selection"
                      )}
                    >
                      {/* Name */}
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <FileIcon
                            type={item.type}
                            size="sm"
                          />
                          <span className="text-body-regular text-text-primary truncate">
                            {item.name}
                          </span>
                        </div>
                      </td>

                      {/* Original Location */}
                      <td className="px-4 py-2">
                        <span className="text-body-regular text-text-secondary truncate block max-w-xs">
                          {item.originalPath}
                        </span>
                      </td>

                      {/* Deleted */}
                      <td className="px-4 py-2">
                        <span className="text-body-regular text-text-secondary">
                          {formatRelativeTime(item.deletedAt)}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="px-4 py-2 text-end">
                        <span className="text-body-regular text-text-secondary">
                          {item.type === "directory" ? "—" : formatSize(item.size)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2 text-end">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="xs"
                            leadingIcon={RiArrowGoBackLine}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(item);
                            }}
                          >
                            Restore
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            leadingIcon={RiDeleteBinLine}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePermanentDelete(item);
                            }}
                            className="text-text-error-primary hover:bg-background-secondary-hover"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 min-h-full">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
              {trashItems.map((item) => {
                const isSelected = selectedItems.has(item.trashName);

                return (
                  <div
                    key={item.trashName}
                    onClick={(e) => handleSelect(item, e)}
                    className={cx(
                      "rounded-xl p-3 flex flex-col items-center gap-2 cursor-pointer transition-colors",
                      "hover:bg-background-secondary-hover",
                      isSelected && "ring-2 ring-accent-500 bg-background-selection"
                    )}
                  >
                    <FileIcon
                      type={item.type}
                      size="lg"
                    />
                    <div className="text-center w-full">
                      <span className="text-caption-1-medium text-text-primary truncate block w-full">
                        {item.name}
                      </span>
                      <span className="text-caption-2-medium text-text-secondary truncate block w-full">
                        {formatRelativeTime(item.deletedAt)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 w-full">
                      <Button
                        variant="ghost"
                        size="xs"
                        iconOnly
                        leadingIcon={RiArrowGoBackLine}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(item);
                        }}
                        aria-label="Restore"
                      />
                      <Button
                        variant="ghost"
                        size="xs"
                        iconOnly
                        leadingIcon={RiDeleteBinLine}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePermanentDelete(item);
                        }}
                        aria-label="Delete permanently"
                        className="text-text-error-primary hover:bg-background-secondary-hover"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title || ""}
        message={confirmDialog?.message || ""}
        confirmLabel={confirmDialog?.confirmLabel || "Delete"}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmDialog(null)}
        loading={confirmDialog?.loading || false}
      />
    </AppShell>
  );
}
