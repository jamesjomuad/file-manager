"use client";

import { useTheme } from "@/contexts/theme-context";
import { ThemeSelector } from "@/components/settings/theme-selector";
import { ThemeModeSelector } from "@/components/settings/theme-mode-selector";
import { AccentColorPicker } from "@/components/settings/accent-color-picker";
import { cx } from "@/utils/cx";
import {
  RiPaletteLine,
  RiSettings3Line,
  RiFolderLine,
  RiInformationLine,
} from "@remixicon/react";

/**
 * Section wrapper with a title, description and optional icon.
 */
function SettingsSection({ title, description, icon: Icon, children, className }) {
  return (
    <section
      className={cx(
        "flex flex-col gap-4 p-5 rounded-xl",
        "bg-background-primary-default border border-border-button-default",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <span
            className="flex items-center justify-center size-8 rounded-lg bg-background-secondary-default text-accent-500 shrink-0 mt-0.5"
            aria-hidden
          >
            <Icon className="size-4" />
          </span>
        )}
        <div className="flex flex-col gap-0.5">
          <h2 className="text-title-3-semibold text-text-primary">{title}</h2>
          {description && (
            <p className="text-body-regular text-text-secondary">{description}</p>
          )}
        </div>
      </div>
      <div className="ps-11">{children}</div>
    </section>
  );
}

/**
 * Settings view rendered within the workspace.
 */
export function SettingsView() {
  const { currentTheme, themeMode, accentColor, setThemeMode, previewTheme } = useTheme();

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">
        {/* Page heading */}
        <header className="flex flex-col gap-1">
          <h1 className="text-title-1-semibold text-text-primary">Settings</h1>
          <p className="text-body-regular text-text-secondary">
            Customize the appearance and behavior of your File Manager.
          </p>
        </header>

        {/* Appearance section */}
        <SettingsSection
          title="Appearance"
          description="Choose a theme, adjust the display mode, and pick an accent color."
          icon={RiPaletteLine}
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-body-medium text-text-primary">Display mode</label>
              <ThemeModeSelector value={themeMode} onChange={setThemeMode} />
              {themeMode === "system" && (
                <p className="text-caption-1-regular text-text-tertiary">
                  Following your operating system&apos;s appearance preference.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-body-medium text-text-primary">Theme</label>
              <ThemeSelector />
            </div>

            <div className="flex flex-col gap-2">
              <AccentColorPicker compact={false} />
            </div>
          </div>
        </SettingsSection>

        {/* Editor section (placeholder) */}
        <SettingsSection
          title="Editor"
          description="Configure the code editor appearance and behavior."
          icon={RiSettings3Line}
        >
          <div className="py-4 text-center text-body-regular text-text-tertiary">
            Editor settings are coming soon.
          </div>
        </SettingsSection>

        {/* File Manager section (placeholder) */}
        <SettingsSection
          title="File Manager"
          description="Set default view mode, sort order, and other file browsing preferences."
          icon={RiFolderLine}
        >
          <div className="py-4 text-center text-body-regular text-text-tertiary">
            File manager settings are coming soon.
          </div>
        </SettingsSection>

        {/* About section */}
        <SettingsSection
          title="About"
          description="Application information and version."
          icon={RiInformationLine}
        >
          <div className="flex flex-col gap-2 py-1">
            <div className="flex items-center justify-between">
              <span className="text-body-medium text-text-secondary">Application</span>
              <span className="text-body-medium text-text-primary">File Manager</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body-medium text-text-secondary">Version</span>
              <span className="text-body-medium text-text-primary">1.0.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body-medium text-text-secondary">Framework</span>
              <span className="text-body-medium text-text-primary">Next.js + BoardUI</span>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
