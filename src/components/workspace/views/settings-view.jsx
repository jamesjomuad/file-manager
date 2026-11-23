"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/theme-context";
import { ThemeSelector } from "@/components/settings/theme-selector";
import { ThemeModeSelector } from "@/components/settings/theme-mode-selector";
import { AccentColorPicker } from "@/components/settings/accent-color-picker";
import { InsightsExclusionsSettings } from "@/components/settings/insights-exclusions-settings";
import { cx } from "@/utils/cx";
import {
  RiPaletteLine,
  RiInformationLine,
  RiSearchLine,
  RiRefreshLine,
} from "@remixicon/react";

// =============================================================================
// Navigation categories
// =============================================================================

/** @type {Array<{ id: string, label: string, icon: import('react').ComponentType<{className?: string}> }>} */
const CATEGORIES = [
  { id: "appearance", label: "Appearance", icon: RiPaletteLine },
  { id: "insights", label: "Insights", icon: RiSearchLine },
  { id: "about", label: "About", icon: RiInformationLine },
];

// =============================================================================
// Settings Row — consistent label + control pattern
// =============================================================================

/**
 * A settings row with a label, description, and control slot.
 * @param {Object} props
 * @param {string} props.label
 * @param {string} [props.description]
 * @param {import('react').ReactNode} props.children - Control element
 */
function SettingsRow({ label, description, children }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-separator-border last:border-b-0">
      <div className="flex flex-col gap-0.5 min-w-0 pt-0.5">
        <span className="text-body-medium text-text-primary">{label}</span>
        {description && (
          <span className="text-body-2-regular text-text-secondary">{description}</span>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/**
 * A full-width settings row (label + description above, content below).
 * @param {Object} props
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {import('react').ReactNode} props.children
 */
function SettingsBlock({ title, description, children }) {
  return (
    <div className="flex flex-col gap-3 py-4 border-b border-separator-border last:border-b-0">
      {(title || description) && (
        <div className="flex flex-col gap-0.5">
          {title && <span className="text-body-medium text-text-primary">{title}</span>}
          {description && (
            <span className="text-body-2-regular text-text-secondary">{description}</span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// =============================================================================
// Section panels
// =============================================================================

/**
 * Appearance settings panel.
 */
function AppearancePanel() {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <div className="flex flex-col">
      {/* Display mode */}
      <SettingsRow
        label="Display mode"
        description={
          themeMode === "system"
            ? "Following your operating system's appearance."
            : undefined
        }
      >
        <ThemeModeSelector value={themeMode} onChange={setThemeMode} />
      </SettingsRow>

      {/* Theme selection */}
      <SettingsBlock
        title="Theme"
        description="Choose a visual theme for the application."
      >
        <ThemeSelector />
      </SettingsBlock>

      {/* Accent color */}
      <SettingsBlock description="Pick an accent color for interactive elements.">
        <AccentColorPicker compact={false} />
      </SettingsBlock>
    </div>
  );
}

/**
 * Insights settings panel.
 */
function InsightsPanel() {
  return (
    <div className="flex flex-col">
      <SettingsBlock
        title="Scan exclusions"
        description="Configure which directories are excluded from Insights filesystem scans."
      >
        <InsightsExclusionsSettings />
      </SettingsBlock>
    </div>
  );
}

/**
 * About panel — static app info.
 */
function AboutPanel() {
  const rows = [
    { label: "Application", value: "File Manager" },
    { label: "Version", value: "1.0.0" },
    { label: "Framework", value: "Next.js + BoardUI" },
  ];

  return (
    <div className="flex flex-col">
      <div className="py-1">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={cx(
              "flex items-center justify-between py-3",
              i < rows.length - 1 && "border-b border-separator-border",
            )}
          >
            <span className="text-body-regular text-text-secondary">{row.label}</span>
            <span className="text-body-medium text-text-primary">{row.value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between py-3 border-t border-separator-border">
          <span className="text-body-regular text-text-secondary">Developer</span>
          <a
            href="https://jamesjomuad.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-body-medium text-accent-500 hover:text-accent-600 hover:underline"
          >
            James Jomuad
          </a>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Settings View
// =============================================================================

/**
 * Settings view with two-column layout: nav rail + content panel.
 * @param {Object} [props]
 * @param {string} [props.initialSection] - Category to select on mount
 */
export function SettingsView({ initialSection } = {}) {
  const { resetToDefaults, previewTheme, applyPreview, resetPreview } = useTheme();
  const [activeCategory, setActiveCategory] = useState(initialSection || "appearance");
  const contentRef = useRef(null);

  const isPreviewing = previewTheme !== null;

  // Scroll content to top when category changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [activeCategory]);

  const handleCategoryChange = useCallback((id) => {
    setActiveCategory(id);
  }, []);

  const activeLabel = CATEGORIES.find((c) => c.id === activeCategory)?.label || "Settings";

  return (
    <div className="flex h-full overflow-hidden">
      {/* Nav rail */}
      <nav
        className="w-[200px] shrink-0 flex flex-col border-e border-separator-border bg-background-secondary-default"
        aria-label="Settings categories"
      >
        <div className="p-3 pb-0">
          <h2 className="text-caption-1-semibold uppercase tracking-wider text-text-tertiary px-3 mb-2">
            Settings
          </h2>
        </div>
        <div className="flex flex-col gap-0.5 p-2">
          {CATEGORIES.map(({ id, label, icon: Icon }) => {
            const isActive = activeCategory === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleCategoryChange(id)}
                aria-current={isActive ? "page" : undefined}
                className={cx(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-start w-full",
                  "text-body-medium transition-colors duration-150 outline-none",
                  "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                  isActive
                    ? "bg-background-selection text-text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-secondary-hover",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content panel */}
      <div
        ref={contentRef}
        className="flex-1 min-w-0 overflow-auto"
      >
        {/* Sticky header with action buttons */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-background-primary-default border-b border-separator-border">
          <h1 className="text-title-2-semibold text-text-primary">{activeLabel}</h1>
          <div className="flex items-center gap-2">
            {activeCategory === "appearance" && (
              <button
                type="button"
                onClick={resetToDefaults}
                className={cx(
                  "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg",
                  "text-caption-1-semibold text-text-secondary",
                  "border border-border-button-default",
                  "hover:text-text-primary hover:border-border-button-hover hover:bg-background-primary-hover",
                  "transition-colors duration-200 outline-none",
                  "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                )}
              >
                <RiRefreshLine className="size-3.5" aria-hidden />
                Reset to defaults
              </button>
            )}
            {isPreviewing && (
              <>
                <button
                  type="button"
                  onClick={resetPreview}
                  className={cx(
                    "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg",
                    "text-caption-1-semibold text-text-secondary",
                    "hover:text-text-primary hover:bg-background-primary-hover",
                    "transition-colors duration-200 outline-none",
                    "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                  )}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyPreview}
                  className={cx(
                    "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg",
                    "text-caption-1-semibold text-text-white",
                    "bg-accent-500 hover:bg-accent-600",
                    "transition-colors duration-200 outline-none",
                    "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                  )}
                >
                  Apply
                </button>
              </>
            )}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-8 py-6">
          {/* Section content */}
          {activeCategory === "appearance" && <AppearancePanel />}
          {activeCategory === "insights" && <InsightsPanel />}
          {activeCategory === "about" && <AboutPanel />}
        </div>
      </div>
    </div>
  );
}
