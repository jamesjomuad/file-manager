"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { cx } from "@/utils/cx";
import { themes, getThemeSwatches } from "@/lib/themes/theme-definitions";
import { useTheme } from "@/contexts/theme-context";
import { ThemeCard } from "@/components/settings/theme-card";
import { RiSearchLine, RiCloseLine } from "@remixicon/react";

/**
 * Theme selector grid with search, live preview, apply and reset actions.
 *
 * Clicking a card starts a preview (applies the theme live without persisting).
 * The "Apply" button confirms the choice; "Cancel" cancels the preview and
 * reverts to the previously-committed theme.
 */
export function ThemeSelector() {
  const { currentTheme, previewTheme, setPreviewTheme, applyPreview, resetPreview } = useTheme();
  const [search, setSearch] = useState("");
  const gridRef = useRef(null);

  const isPreviewing = previewTheme !== null;

  /** Filter themes by name search. */
  const filteredThemes = useMemo(() => {
    if (!search.trim()) return themes;
    const q = search.toLowerCase();
    return themes.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q)
    );
  }, [search]);

  /**
   * Handle keyboard navigation in the grid.
   * Arrow keys move focus between cards; Enter/Space selects.
   */
  const handleGridKeyDown = useCallback(
    (e) => {
      const cards = gridRef.current?.querySelectorAll('[role="radio"]');
      if (!cards?.length) return;

      const focused = document.activeElement;
      const idx = Array.from(cards).indexOf(focused);
      if (idx === -1) return;

      /** @type {number|null} */
      let next = null;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          next = (idx + 1) % cards.length;
          e.preventDefault();
          break;
        case "ArrowLeft":
        case "ArrowUp":
          next = (idx - 1 + cards.length) % cards.length;
          e.preventDefault();
          break;
        case "Home":
          next = 0;
          e.preventDefault();
          break;
        case "End":
          next = cards.length - 1;
          e.preventDefault();
          break;
        default:
          break;
      }

      if (next !== null) {
        /** @type {HTMLElement} */ (cards[next]).focus();
      }
    },
    []
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Search + action bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <RiSearchLine
            className="absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-text-tertiary pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search themes…"
            aria-label="Search themes"
            className={cx(
              "w-full h-8 ps-8 pe-8 rounded-lg text-body-medium",
              "bg-background-primary-default border border-border-button-default",
              "text-text-primary placeholder:text-text-placeholder",
              "outline-none transition-colors duration-200",
              "hover:border-border-button-hover",
              "focus:ring-2 focus:ring-border-focus-ring",
            )}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute end-2 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded text-text-tertiary hover:text-text-primary transition-colors"
            >
              <RiCloseLine className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* Preview banner */}
      {isPreviewing && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-accent-950 border border-accent-800"
        >
          <p className="text-caption-1-semibold text-accent-300">
            Previewing theme — changes are not yet saved
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetPreview}
              className={cx(
                "h-7 px-2.5 rounded-md text-caption-1-semibold",
                "text-text-secondary hover:text-text-primary",
                "hover:bg-background-primary-hover transition-colors",
                "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyPreview}
              className={cx(
                "h-7 px-2.5 rounded-md text-caption-1-semibold",
                "bg-accent-500 text-text-white hover:bg-accent-600 transition-colors",
                "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
              )}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Theme grid */}
      <div
        ref={gridRef}
        role="radiogroup"
        aria-label="Theme selection"
        onKeyDown={handleGridKeyDown}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {filteredThemes.length === 0 ? (
          <div className="col-span-full py-8 text-center text-body-regular text-text-tertiary">
            No themes match &quot;{search}&quot;
          </div>
        ) : (
          filteredThemes.map((theme) => (
            <ThemeCard
              key={theme.id}
              id={theme.id}
              name={theme.name}
              type={theme.type}
              colors={Object.values(getThemeSwatches(theme))}
              active={currentTheme === theme.id}
              previewing={previewTheme === theme.id}
              onClick={() => setPreviewTheme(theme.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
