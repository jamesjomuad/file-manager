"use client";

import { useState, useId } from "react";
import { cx } from "@/utils/cx";
import { accentPresets } from "@/lib/themes/accent-colors";
import { useTheme } from "@/contexts/theme-context";
import { RiRefreshLine } from "@remixicon/react";

/**
 * Accent color picker with preset swatches and a custom hex input.
 *
 * @param {Object} [props]
 * @param {boolean} [props.compact] - Compact layout (no label)
 */
export function AccentColorPicker({ compact = false }) {
  const { accentColor, setAccentColor, currentTheme } = useTheme();
  const [customHex, setCustomHex] = useState("");
  const [customError, setCustomError] = useState("");
  const hexInputId = useId();

  /**
   * Validate a hex color string.
   * @param {string} hex
   * @returns {boolean}
   */
  function isValidHex(hex) {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
  }

  /**
   * Handle custom hex input change.
   * @param {string} value
   */
  function handleCustomHexChange(value) {
    setCustomHex(value);
    setCustomError("");
  }

  /**
   * Apply custom hex color as accent.
   */
  function applyCustomHex() {
    let hex = customHex.startsWith("#") ? customHex : `#${customHex}`;
    if (!isValidHex(hex)) {
      setCustomError("Enter a valid hex color (e.g. #3b82f6)");
      return;
    }
    // Normalize 3-digit hex to 6-digit
    if (hex.length === 4) {
      hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    setAccentColor(hex.toLowerCase());
    setCustomHex("");
  }

  /**
   * Check if a preset is currently selected.
   * @param {string} color - Preset color hex
   * @returns {boolean}
   */
  function isPresetSelected(color) {
    if (!accentColor) return false;
    return accentColor.toLowerCase() === color.toLowerCase();
  }

  /** Whether a custom (non-preset) accent color is active */
  const hasCustomColor = accentColor && !accentPresets.some(
    p => p.color.toLowerCase() === accentColor.toLowerCase()
  );

  /** Whether there is a valid hex value ready to apply */
  const canApply = !!customHex && isValidHex(customHex.startsWith("#") ? customHex : `#${customHex}`);

  return (
    <div className={cx("flex flex-col gap-3")}>
      {/* Header with label */}
      {!compact && (
        <label className="text-body-medium text-text-primary">
          Accent color
        </label>
      )}

      {/* Preset swatches */}
      <div
        role="radiogroup"
        aria-label="Accent color presets"
        className="flex flex-wrap items-center gap-2"
      >
        {accentPresets.map((preset) => {
          const selected = isPresetSelected(preset.color);
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={preset.name}
              title={preset.name}
              onClick={() => setAccentColor(preset.color)}
              className={cx(
                "size-8 rounded-full transition-all duration-200 outline-none",
                "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2",
                "focus-visible:ring-offset-background-primary-default",
                selected
                  ? "ring-2 ring-offset-2 ring-offset-background-primary-default scale-110"
                  : "hover:scale-110",
              )}
              style={{
                backgroundColor: preset.color,
                ringColor: selected ? preset.color : undefined,
              }}
            />
          );
        })}
        {/* Custom color swatch (if active and not a preset) */}
        {hasCustomColor && (
          <div
            className="size-8 rounded-full ring-2 ring-offset-2 ring-offset-background-primary-default scale-110"
            style={{
              backgroundColor: accentColor,
              ringColor: accentColor,
            }}
            title={`Custom color: ${accentColor}`}
          />
        )}
      </div>

      {/* Custom hex input */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor={hexInputId}
          className="text-caption-1-semibold text-text-secondary"
        >
          Custom color
        </label>
        <input
          id={hexInputId}
          type="text"
          value={customHex}
          onChange={(e) => handleCustomHexChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canApply) {
              e.preventDefault();
              applyCustomHex();
            }
          }}
          placeholder={hasCustomColor ? accentColor : "#3b82f6"}
          aria-invalid={!!customError}
          aria-describedby={customError ? `${hexInputId}-error` : undefined}
          className={cx(
            "w-full h-8 px-2 rounded-lg text-body-medium",
            "bg-background-primary-default border text-text-primary",
            "placeholder:text-text-placeholder",
            "outline-none transition-colors duration-200",
            "focus:ring-2 focus:ring-border-focus-ring",
            customError
              ? "border-border-error-default"
              : "border-border-button-default hover:border-border-button-hover",
          )}
        />
        {customError && (
          <p
            id={`${hexInputId}-error`}
            className="text-caption-1-semibold text-text-error-primary"
            role="alert"
          >
            {customError}
          </p>
        )}
        {hasCustomColor && !customHex && (
          <p className="text-caption-1-regular text-text-tertiary">
            Currently using custom color: <span className="font-mono">{accentColor}</span>
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAccentColor(null)}
          disabled={!accentColor}
          className={cx(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded-md",
            "text-caption-1-semibold text-text-secondary",
            "hover:text-text-primary hover:bg-background-primary-hover",
            "transition-colors duration-200 outline-none",
            "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          <RiRefreshLine className="size-3.5" aria-hidden />
          Reset to theme default
        </button>
        {canApply && (
          <button
            type="button"
            onClick={applyCustomHex}
            className={cx(
              "h-7 px-3 rounded-lg text-caption-1-semibold transition-colors",
              "bg-accent-500 text-text-white hover:bg-accent-600",
              "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            )}
          >
            Apply
          </button>
        )}
      </div>
    </div>
  );
}
