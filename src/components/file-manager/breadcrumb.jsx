"use client";

import { cx } from "@/utils/cx";
import { RiArrowRightSLine } from "@remixicon/react";

/**
 * Breadcrumb navigation component
 * @param {Object} props
 * @param {string} props.path - Current path (slash-separated segments)
 * @param {(path: string) => void} props.onNavigate - Callback when a segment is clicked
 */
export function Breadcrumb({ path = "", onNavigate }) {
  const segments = path ? path.split("/").filter(Boolean) : [];

  /**
   * Build the accumulated path up to and including the given index
   * @param {number} index
   * @returns {string}
   */
  const getPathUpTo = (index) => {
    return segments.slice(0, index + 1).join("/");
  };

  return (
    <nav className="flex items-center gap-1 min-w-0" aria-label="Breadcrumb">
      {/* Root segment */}
      {segments.length > 0 ? (
        <button
          type="button"
          onClick={() => onNavigate("")}
          className="text-body-medium text-text-secondary hover:text-text-primary cursor-pointer shrink-0"
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

        return (
          <div key={index} className="flex items-center gap-1 min-w-0">
            <RiArrowRightSLine
              className="size-3.5 text-foreground-icon-quaternary shrink-0"
              aria-hidden
            />

            {isLast ? (
              <span className="text-body-medium text-text-primary font-medium truncate">
                {segment}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(getPathUpTo(index))}
                className="text-body-medium text-text-secondary hover:text-text-primary cursor-pointer truncate"
              >
                {segment}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
