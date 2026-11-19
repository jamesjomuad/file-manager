"use client";

import { cx } from "@/utils/cx";
import { Button } from "@/components/base/buttons/button";
import { Breadcrumb } from "@/components/file-manager/breadcrumb";
import { RiGridLine, RiListUnordered } from "@remixicon/react";

/**
 * Header component with breadcrumb and view toggles
 * @param {Object} props
 * @param {string} props.path - Current path for breadcrumb
 * @param {(path: string) => void} props.onNavigate - Navigation callback
 * @param {'grid'|'list'} props.viewMode - Current view mode
 * @param {(mode: 'grid'|'list') => void} props.onViewModeChange - View mode change callback
 */
export function Header({ path, onNavigate, viewMode, onViewModeChange }) {
  return (
    <header className="h-12 px-4 flex items-center justify-between bg-background-primary-default border-b border-separator-border shrink-0">
      {/* Left: Breadcrumb */}
      <Breadcrumb path={path} onNavigate={onNavigate} />

      {/* Right: View mode toggles */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiGridLine}
          aria-label="Grid view"
          onClick={() => onViewModeChange("grid")}
          className={cx(
            viewMode === "grid" && "bg-background-secondary-hover text-text-primary"
          )}
        />
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiListUnordered}
          aria-label="List view"
          onClick={() => onViewModeChange("list")}
          className={cx(
            viewMode === "list" && "bg-background-secondary-hover text-text-primary"
          )}
        />
      </div>
    </header>
  );
}
