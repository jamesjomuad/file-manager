"use client";

import { cx } from "@/utils/cx";
import { RiCheckLine } from "@remixicon/react";

/**
 * Visual representation of a theme for the theme selector grid.
 *
 * Shows the theme name, a Dark/Light badge, a row of color swatches, and
 * an active-state indicator. Clickable and keyboard-focusable.
 *
 * @param {Object} props
 * @param {string} props.id - Theme id
 * @param {string} props.name - Display name
 * @param {'dark'|'light'} props.type - Theme type
 * @param {string[]} props.colors - Preview swatch hex colors
 * @param {boolean} props.active - Whether this is the currently active theme
 * @param {boolean} props.previewing - Whether this is the theme currently being previewed
 * @param {() => void} props.onClick - Click handler
 */
export function ThemeCard({
  id,
  name,
  type,
  colors,
  active,
  previewing,
  onClick,
}) {
  const isActive = active && !previewing;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      aria-label={`${name} theme${type === "dark" ? " (dark)" : " (light)"}${isActive ? ", active" : ""}`}
      onClick={onClick}
      className={cx(
        "group relative flex flex-col rounded-xl border p-3 gap-2.5 text-start",
        "transition-all duration-200 outline-none",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2",
        "focus-visible:ring-offset-background-primary-default",
        isActive || previewing
          ? "border-accent-500 ring-1 ring-accent-500 bg-background-primary-hover"
          : "border-border-button-default hover:border-border-button-hover hover:bg-background-primary-hover",
      )}
    >
      {/* Active checkmark */}
      {(isActive || previewing) && (
        <span
          className="absolute top-2 end-2 flex items-center justify-center size-5 rounded-full bg-accent-500 text-text-white"
          aria-hidden
        >
          <RiCheckLine className="size-3.5" />
        </span>
      )}

      {/* Color swatches */}
      <div
        className="flex items-center gap-1 h-10"
        aria-hidden
      >
        {colors.slice(0, 6).map((color, i) => (
          <span
            key={i}
            className="flex-1 h-full rounded-sm first:rounded-s-md last:rounded-e-md"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Name + type badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-medium text-text-primary truncate">
          {name}
        </span>
        <span
          className={cx(
            "shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-caption-1-semibold",
            type === "dark"
              ? "bg-background-tertiary-default text-text-secondary"
              : "bg-background-secondary-hover text-text-secondary",
          )}
        >
          {type === "dark" ? "Dark" : "Light"}
        </span>
      </div>

      {/* Previewing label */}
      {previewing && !isActive && (
        <span className="text-caption-1-semibold text-accent-500">
          Previewing…
        </span>
      )}
    </button>
  );
}
