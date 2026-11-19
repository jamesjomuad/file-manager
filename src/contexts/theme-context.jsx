'use client';

/**
 * Theme Context - Backward compatibility layer.
 *
 * This file re-exports from the Zustand settings store.
 * Components using `useTheme()` or `ThemeProvider` will continue to work.
 *
 * @deprecated Import from `@/stores/settings-store` directly for new code.
 */

export {
  useTheme,
  useThemeOptional,
  useSettingsStore,
  useResolvedMode,
  useEffectiveTheme,
  useThemeObject,
  themes,
  getThemeById,
  getDefaultThemeId,
  generateAccentCSS,
  accentPresets,
  validateAccentColor,
} from '@/stores/settings-store';

/**
 * ThemeProvider - No-op component for backward compatibility.
 *
 * The settings store is now global and doesn't need a provider.
 * This component simply renders children without any wrapping.
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.children
 */
export function ThemeProvider({ children }) {
  return <>{children}</>;
}
