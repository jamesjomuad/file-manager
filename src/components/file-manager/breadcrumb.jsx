"use client";

import { useState } from "react";
import { cx } from "@/utils/cx";
import { RiArrowRightSLine } from "@remixicon/react";

/**
 * Breadcrumb navigation component with drag-and-drop support.
 * Each segment acts as a drop target for moving files to that directory.
 * @param {Object} props
 * @param {string} props.path - Current path (slash-separated segments)
 * @param {(path: string) => void} props.onNavigate - Callback when a segment is clicked
 * @param {(path: string) => boolean} [props.onDragOverItem] - Called on dragover; return true if drop is valid
 * @param {(path: string, event: DragEvent) => void} [props.onDropItem] - Called when files are dropped on a segment
 * @param {() => void} [props.onDragLeaveItem] - Called when drag leaves a segment
 */
export function Breadcrumb({ path = "", onNavigate, onDragOverItem, onDropItem, onDragLeaveItem }) {
  const segments = path ? path.split(/[\\/]/).filter(Boolean) : [];
  const [dragOverIndex, setDragOverIndex] = useState(null);

  /**
   * Build the accumulated path up to and including the given index
   * @param {number} index
   * @returns {string}
   */
  const getPathUpTo = (index) => {
    return segments.slice(0, index + 1).join("\\");
  };

  const handleSegmentDragOver = (e, targetPath, index) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDragOverItem) {
      const isValid = onDragOverItem(targetPath);
      if (isValid) {
        e.dataTransfer.dropEffect = "move";
        setDragOverIndex(index);
      }
    }
  };

  const handleSegmentDrop = (e, targetPath) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
    if (onDropItem) {
      onDropItem(targetPath, e);
    }
  };

  const handleSegmentDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
    if (onDragLeaveItem) {
      onDragLeaveItem();
    }
  };

  const handleRootDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDragOverItem) {
      const isValid = onDragOverItem("");
      if (isValid) {
        e.dataTransfer.dropEffect = "move";
        setDragOverIndex("root");
      }
    }
  };

  const handleRootDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
    if (onDropItem) {
      onDropItem("", e);
    }
  };

  const handleRootDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
  };

  return (
    <nav className="flex items-center gap-1 min-w-0" aria-label="Breadcrumb">
      {/* Root segment */}
      {segments.length > 0 ? (
        <button
          type="button"
          onClick={() => onNavigate("")}
          onDragOver={handleRootDragOver}
          onDrop={handleRootDrop}
          onDragLeave={handleRootDragLeave}
          className={cx(
            "text-body-medium hover:underline cursor-pointer shrink-0 transition-all rounded px-1 py-0.5 -mx-1",
            dragOverIndex === "root"
              ? "text-accent-500 bg-accent-500/10 ring-1 ring-inset ring-accent-500/30"
              : "text-text-secondary hover:text-accent-500"
          )}
        >
          Root
        </button>
      ) : (
        <span className="text-body-medium text-text-primary font-medium shrink-0">
          Root
        </span>
      )}

      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const isDragOver = dragOverIndex === index;

        return (
          <div key={index} className="flex items-center gap-1 min-w-0">
            <RiArrowRightSLine
              className="size-3.5 text-foreground-icon-quaternary shrink-0"
              aria-hidden
            />

            <button
              type="button"
              onClick={() => onNavigate(getPathUpTo(index))}
              onDragOver={(e) => handleSegmentDragOver(e, getPathUpTo(index), index)}
              onDrop={(e) => handleSegmentDrop(e, getPathUpTo(index))}
              onDragLeave={handleSegmentDragLeave}
              className={cx(
                "text-body-medium truncate transition-all rounded px-1 py-0.5",
                isDragOver
                  ? "text-accent-500 bg-accent-500/10 ring-1 ring-inset ring-accent-500/30"
                  : isLast
                    ? "text-text-primary font-medium hover:text-accent-500 hover:underline cursor-pointer"
                    : "text-text-secondary hover:text-accent-500 hover:underline cursor-pointer"
              )}
            >
              {segment}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
