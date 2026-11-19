"use client";

import { cx } from "@/utils/cx";
import { RiComputerLine, RiSunLine, RiMoonLine } from "@remixicon/react";

/**
 * Three-option segmented control for the display mode: System, Light, Dark.
 *
 * @param {Object} props
 * @param {'system'|'light'|'dark'} props.value - Current mode
 * @param {(mode: 'system'|'light'|'dark') => void} props.onChange - Mode change callback
 */

/** @type {Array<{ id: 'system'|'light'|'dark', label: string, icon: import('react').ComponentType<{className?: string}> }>} */
const MODES = [
  { id: "system", label: "System", icon: RiComputerLine },
  { id: "light", label: "Light", icon: RiSunLine },
  { id: "dark", label: "Dark", icon: RiMoonLine },
];

export function ThemeModeSelector({ value, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme mode"
      className="inline-flex items-center gap-0.5 p-1 rounded-lg bg-segmented-control-background"
    >
      {MODES.map(({ id, label, icon: Icon }) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(id)}
            className={cx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-body-medium transition-all duration-200",
              "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
              selected
                ? "bg-segmented-control-selected-background text-text-primary shadow-card"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
