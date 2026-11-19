"use client";

import { useRef } from "react";
import { Button } from "@/components/base/buttons/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/buttons/button-group";
import { Input } from "@/components/base/input/input";
import {
  RiFolderAddLine,
  RiFileAddLine,
  RiUploadLine,
  RiRefreshLine,
  RiSearchLine,
  RiSortAsc,
  RiSortDesc,
  RiDeleteBinLine,
  RiCheckboxBlankLine,
  RiCheckboxFill,
  RiArrowUpLine,
  RiFolderZipLine,
  RiGridLine,
  RiListUnordered,
} from "@remixicon/react";

/**
 * File toolbar with action buttons, search, sorting, and bulk operations
 * @param {Object} props
 * @param {string} props.currentPath - Current directory path
 * @param {(path: string) => void} props.onNavigate - Navigate to path
 * @param {() => void} props.onCreateFolder - Create folder callback
 * @param {() => void} props.onCreateFile - Create file callback
 * @param {(files: File[]) => void} props.onUpload - Upload callback
 * @param {boolean} props.uploading - Whether upload is in progress
 * @param {() => void} props.onRefresh - Refresh callback
 * @param {string} props.searchQuery - Current search query
 * @param {(query: string) => void} props.onSearchChange - Search query change callback
 * @param {number} props.selectedCount - Number of selected files
 * @param {number} props.totalCount - Total number of files
 * @param {() => void} props.onSelectAll - Select all callback
 * @param {() => void} props.onBulkDelete - Bulk delete callback
 * @param {() => void} [props.onBulkCompress] - Bulk compress callback
 * @param {string} props.sortBy - Current sort field
 * @param {string} props.sortOrder - Current sort order
 * @param {(sortBy: string) => void} props.onSortChange - Sort change callback
 * @param {'grid'|'list'} props.viewMode - Current view mode
 * @param {(mode: 'grid'|'list') => void} props.onViewModeChange - View mode change callback
 */
export function FileToolbar({
  currentPath,
  onNavigate,
  onNavigateUp,
  onCreateFolder,
  onCreateFile,
  onUpload,
  uploading = false,
  onRefresh,
  searchQuery,
  onSearchChange,
  selectedCount = 0,
  totalCount = 0,
  onSelectAll,
  onBulkDelete,
  onBulkCompress,
  sortBy = "name",
  sortOrder = "asc",
  onSortChange,
  viewMode = "grid",
  onViewModeChange,
}) {
  const fileInputRef = useRef(null);
  const hasSelection = selectedCount > 0;
  const allSelected = selectedCount === totalCount && totalCount > 0;

  /**
   * Trigger the file picker dialog
   */
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Handle file selection from the file picker
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && onUpload) {
      onUpload(files);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-background-primary-default border-b border-separator-border shrink-0">
      {/* Left side: navigation + action buttons */}
      <div className="flex items-center gap-2">
        {/* Back to parent directory */}
        {currentPath && (
          <Button
            variant="ghost"
            size="small"
            iconOnly
            leadingIcon={RiArrowUpLine}
            aria-label="Go to parent directory"
            onClick={onNavigateUp}
          />
        )}
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
        <Button
          variant="secondary"
          size="small"
          leadingIcon={RiUploadLine}
          onClick={handleUploadClick}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload"}
        </Button>
        {/* Hidden file input for upload */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          aria-label="Upload files"
        />

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
              variant="secondary"
              size="small"
              leadingIcon={RiFolderZipLine}
              onClick={onBulkCompress}
            >
              Compress ({selectedCount})
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

      {/* Right side: view toggle + sorting + search + refresh */}
      <div className="flex items-center gap-2">
        {/* View mode toggle */}
        <ButtonGroup size="small" aria-label="View mode">
          <ButtonGroupItem
            iconOnly
            leadingIcon={RiGridLine}
            selected={viewMode === "grid"}
            onClick={() => onViewModeChange?.("grid")}
            aria-label="Grid view"
          />
          <ButtonGroupItem
            iconOnly
            leadingIcon={RiListUnordered}
            selected={viewMode === "list"}
            onClick={() => onViewModeChange?.("list")}
            aria-label="List view"
          />
        </ButtonGroup>

        <div className="w-px h-6 bg-separator-border" />

        {/* Sorting controls */}
        <ButtonGroup size="small" aria-label="Sort by">
          <ButtonGroupItem
            selected={sortBy === "name"}
            onClick={() => onSortChange("name")}
          >
            Name
          </ButtonGroupItem>
          <ButtonGroupItem
            selected={sortBy === "size"}
            onClick={() => onSortChange("size")}
          >
            Size
          </ButtonGroupItem>
          <ButtonGroupItem
            selected={sortBy === "modified"}
            onClick={() => onSortChange("modified")}
          >
            Modified
          </ButtonGroupItem>
        </ButtonGroup>
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={sortOrder === "asc" ? RiSortAsc : RiSortDesc}
          onClick={() => onSortChange(sortBy)}
          aria-label={sortOrder === "asc" ? "Sort ascending" : "Sort descending"}
        />

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
