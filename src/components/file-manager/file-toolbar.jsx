"use client";

import { cx } from "@/utils/cx";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import {
  RiFolderAddLine,
  RiFileAddLine,
  RiRefreshLine,
  RiSearchLine,
  RiSortAsc,
  RiSortDesc,
  RiDeleteBinLine,
  RiCheckboxBlankLine,
  RiCheckboxFill,
} from "@remixicon/react";

/**
 * File toolbar with action buttons, search, sorting, and bulk operations
 * @param {Object} props
 * @param {string} props.currentPath - Current directory path
 * @param {() => void} props.onCreateFolder - Create folder callback
 * @param {() => void} props.onCreateFile - Create file callback
 * @param {() => void} props.onRefresh - Refresh callback
 * @param {string} props.searchQuery - Current search query
 * @param {(query: string) => void} props.onSearchChange - Search query change callback
 * @param {number} props.selectedCount - Number of selected files
 * @param {number} props.totalCount - Total number of files
 * @param {() => void} props.onSelectAll - Select all callback
 * @param {() => void} props.onBulkDelete - Bulk delete callback
 * @param {string} props.sortBy - Current sort field
 * @param {string} props.sortOrder - Current sort order
 * @param {(sortBy: string) => void} props.onSortChange - Sort change callback
 */
export function FileToolbar({
  currentPath,
  onCreateFolder,
  onCreateFile,
  onRefresh,
  searchQuery,
  onSearchChange,
  selectedCount = 0,
  totalCount = 0,
  onSelectAll,
  onBulkDelete,
  sortBy = "name",
  sortOrder = "asc",
  onSortChange,
}) {
  const hasSelection = selectedCount > 0;
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-background-primary-default border-b border-separator-border shrink-0">
      {/* Left side: action buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="small"
          leadingIcon={RiFolderAddLine}
          onClick={onCreateFolder}
        >
          New Folder
        </Button>
        <Button
          variant="secondary"
          size="small"
          leadingIcon={RiFileAddLine}
          onClick={onCreateFile}
        >
          New File
        </Button>

        {/* Bulk actions when files are selected */}
        {hasSelection && (
          <>
            <div className="w-px h-6 bg-separator-border mx-2" />
            <Button
              variant="ghost"
              size="small"
              leadingIcon={allSelected ? RiCheckboxFill : RiCheckboxBlankLine}
              onClick={onSelectAll}
            >
              {allSelected ? "Deselect All" : "Select All"}
            </Button>
            <Button
              variant="danger"
              size="small"
              leadingIcon={RiDeleteBinLine}
              onClick={onBulkDelete}
            >
              Delete ({selectedCount})
            </Button>
          </>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side: sorting + search + refresh */}
      <div className="flex items-center gap-2">
        {/* Sorting controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="small"
            onClick={() => onSortChange("name")}
            className={cx(
              sortBy === "name" && "bg-background-secondary-hover"
            )}
          >
            Name
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={() => onSortChange("size")}
            className={cx(
              sortBy === "size" && "bg-background-secondary-hover"
            )}
          >
            Size
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={() => onSortChange("modified")}
            className={cx(
              sortBy === "modified" && "bg-background-secondary-hover"
            )}
          >
            Modified
          </Button>
          <Button
            variant="ghost"
            size="small"
            iconOnly
            leadingIcon={sortOrder === "asc" ? RiSortAsc : RiSortDesc}
            onClick={() => onSortChange(sortBy)}
            aria-label={sortOrder === "asc" ? "Sort ascending" : "Sort descending"}
          />
        </div>

        <div className="w-px h-6 bg-separator-border" />

        <Input
          size="small"
          leadingIcon={RiSearchLine}
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-56"
          aria-label="Search files"
        />
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiRefreshLine}
          aria-label="Refresh"
          onClick={onRefresh}
        />
      </div>
    </div>
  );
}
