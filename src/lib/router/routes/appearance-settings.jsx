"use client";

import { SettingsView } from "@/components/workspace/views/settings-view";

/**
 * Appearance settings route.
 * Renders the settings view scrolled to the appearance section.
 */
export function AppearanceSettings() {
  return <SettingsView initialSection="appearance" />;
}
