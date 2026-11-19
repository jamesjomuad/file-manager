import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  themes,
  getThemeById,
  getDefaultThemeId,
} from '@/lib/themes/theme-definitions';
import {
  generateAccentCSS,
} from '@/lib/themes/accent-colors';

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY_THEME = 'theme-id';
const STORAGE_KEY_MODE = 'theme-mode';
const STORAGE_KEY_ACCENT = 'accent-color';

/** @type {'system'|'light'|'dark'} */
const DEFAULT_MODE = 'system';

// =============================================================================
// System Preference Detection
// =============================================================================

/** @type {'light'|'dark'} */
let systemPreference = 'dark';

if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
  systemPreference = mediaQuery?.matches ? 'dark' : 'light';
}

// =============================================================================
// DOM Application Helpers
// =============================================================================

/**
 * Apply theme to the document
 * @param {string} themeId
 * @param {'light'|'dark'} resolvedMode
 */
function applyThemeToDOM(themeId, resolvedMode) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.setAttribute('data-theme', themeId);
  html.setAttribute('data-theme-mode', resolvedMode);
  if (resolvedMode === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}

/**
 * Apply accent color override to the document
 * @param {string|null} accentColor
 */
function applyAccentToDOM(accentColor) {
  if (typeof document === 'undefined') return;
  const styleId = 'theme-accent-override';
  let style = document.getElementById(styleId);

  if (!accentColor) {
    if (style) style.remove();
    return;
  }

  const css = generateAccentCSS(accentColor);
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    style.setAttribute('data-theme-accent', 'true');
    document.head.appendChild(style);
  }
  style.textContent = css;
}

// =============================================================================
// Store Definition
// =============================================================================

/**
 * @typedef {Object} SettingsState
 * @property {string} currentTheme - Current theme ID
 * @property {'system'|'light'|'dark'} themeMode - Theme mode setting
 * @property {string|null} accentColor - Custom accent color or null
 * @property {string|null} previewTheme - Theme ID being previewed (not persisted)
 * @property {string} systemPreference - Current system color preference
 */

/**
 * @typedef {Object} SettingsActions
 * @property {(themeId: string) => void} setTheme - Set active theme
 * @property {(mode: 'system'|'light'|'dark') => void} setThemeMode - Set theme mode
 * @property {(color: string|null) => void} setAccentColor - Set custom accent color
 * @property {(themeId: string|null) => void} setPreviewTheme - Start/stop theme preview
 * @property {() => void} applyPreview - Apply previewed theme as active
 * @property {() => void} resetPreview - Cancel theme preview
 * @property {() => void} resetToDefaults - Reset all theme settings
 * @property {() => void} _syncSystemPreference - Update system preference (internal)
 */

/**
 * Settings store - manages theme, appearance, and application preferences.
 *
 * Persisted state: currentTheme, themeMode, accentColor
 * Non-persisted: previewTheme, systemPreference
 *
 * Uses localStorage persistence via Zustand persist middleware.
 * Applies theme to DOM via subscribe (runs on every state change).
 */
export const useSettingsStore = create(
  persist(
    /**
     * @param {import('zustand').SetState<SettingsState & SettingsActions>} set
     * @param {import('zustand').GetState<SettingsState & SettingsActions>} get
     */
    (set, get) => {
      const defaultThemeId = getDefaultThemeId();

      return {
        // Persisted state
        currentTheme: defaultThemeId,
        themeMode: DEFAULT_MODE,
        accentColor: null,

        // Non-persisted state
        previewTheme: null,
        systemPreference,

        // Actions
        setTheme: (themeId) => {
          const theme = getThemeById(themeId);
          if (!theme) return;
          set({ currentTheme: themeId, previewTheme: null });
        },

        setThemeMode: (mode) => {
          if (!['system', 'light', 'dark'].includes(mode)) return;
          set({ themeMode: mode });
        },

        setAccentColor: (color) => {
          set({ accentColor: color });
        },

        setPreviewTheme: (themeId) => {
          if (themeId === null) {
            set({ previewTheme: null });
            return;
          }
          const theme = getThemeById(themeId);
          if (theme) {
            set({ previewTheme: themeId });
          }
        },

        applyPreview: () => {
          const { previewTheme } = get();
          if (previewTheme) {
            set({ currentTheme: previewTheme, previewTheme: null });
          }
        },

        resetPreview: () => {
          set({ previewTheme: null });
        },

        resetToDefaults: () => {
          set({
            currentTheme: defaultThemeId,
            themeMode: DEFAULT_MODE,
            accentColor: null,
            previewTheme: null,
          });
        },

        _syncSystemPreference: () => {
          if (typeof window !== 'undefined') {
            const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
            const pref = mediaQuery?.matches ? 'dark' : 'light';
            set({ systemPreference: pref });
          }
        },
      };
    },
    {
      name: 'fileManager.settings',
      // Only persist specific keys
      partialize: (state) => ({
        currentTheme: state.currentTheme,
        themeMode: state.themeMode,
        accentColor: state.accentColor,
      }),
      // Migrate from old localStorage keys
      migrate: (persistedState, version) => {
        // If old keys exist in localStorage but not in persisted state, merge them
        if (typeof window !== 'undefined' && !persistedState?.currentTheme) {
          try {
            const oldTheme = localStorage.getItem(STORAGE_KEY_THEME);
            const oldMode = localStorage.getItem(STORAGE_KEY_MODE);
            const oldAccent = localStorage.getItem(STORAGE_KEY_ACCENT);
            return {
              currentTheme: oldTheme || getDefaultThemeId(),
              themeMode: oldMode || DEFAULT_MODE,
              accentColor: oldAccent || null,
            };
          } catch {
            // ignore
          }
        }
        return persistedState;
      },
    }
  )
);

// =============================================================================
// System Preference Listener Setup
// =============================================================================

/** Initialize system preference listener (call once on app start) */
export function initSystemPreferenceListener() {
  if (typeof window === 'undefined') return;

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    useSettingsStore.getState()._syncSystemPreference();
  });
}

// =============================================================================
// DOM Subscription (applies theme on every state change)
// =============================================================================

if (typeof document !== 'undefined') {
  useSettingsStore.subscribe((state) => {
    const effectiveTheme = state.previewTheme || state.currentTheme;
    const resolvedMode =
      state.themeMode === 'system' ? state.systemPreference : state.themeMode;

    applyThemeToDOM(effectiveTheme, resolvedMode);
    applyAccentToDOM(state.accentColor);
  });
}

// =============================================================================
// Derived Selectors
// =============================================================================

/**
 * Get the resolved light/dark mode.
 * @returns {'light'|'dark'}
 */
export function useResolvedMode() {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemPreference = useSettingsStore((s) => s.systemPreference);
  return themeMode === 'system' ? systemPreference : themeMode;
}

/**
 * Get the effective theme ID (preview or current).
 * @returns {string}
 */
export function useEffectiveTheme() {
  const previewTheme = useSettingsStore((s) => s.previewTheme);
  const currentTheme = useSettingsStore((s) => s.currentTheme);
  return previewTheme || currentTheme;
}

/**
 * Get the current theme object definition.
 * @returns {import('@/lib/themes/theme-definitions').ThemeDefinition}
 */
export function useThemeObject() {
  const effectiveTheme = useEffectiveTheme();
  return getThemeById(effectiveTheme) || getThemeById(getDefaultThemeId());
}

// =============================================================================
// Backward-compatible useTheme Hook
// =============================================================================

/**
 * Access theme state and actions.
 * Drop-in replacement for the old ThemeContext's useTheme hook.
 *
 * @returns {{
 *   currentTheme: string,
 *   themeMode: 'system'|'light'|'dark',
 *   resolvedMode: 'light'|'dark',
 *   accentColor: string|null,
 *   previewTheme: string|null,
 *   themeObject: import('@/lib/themes/theme-definitions').ThemeDefinition,
 *   allThemes: import('@/lib/themes/theme-definitions').ThemeDefinition[],
 *   setTheme: (themeId: string) => void,
 *   setThemeMode: (mode: 'system'|'light'|'dark') => void,
 *   setAccentColor: (color: string|null) => void,
 *   setPreviewTheme: (themeId: string|null) => void,
 *   applyPreview: () => void,
 *   resetPreview: () => void,
 *   resetToDefaults: () => void,
 * }}
 */
export function useTheme() {
  const currentTheme = useSettingsStore((s) => s.currentTheme);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const previewTheme = useSettingsStore((s) => s.previewTheme);
  const systemPreference = useSettingsStore((s) => s.systemPreference);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);
  const setPreviewTheme = useSettingsStore((s) => s.setPreviewTheme);
  const applyPreview = useSettingsStore((s) => s.applyPreview);
  const resetPreview = useSettingsStore((s) => s.resetPreview);
  const resetToDefaults = useSettingsStore((s) => s.resetToDefaults);

  const resolvedMode = themeMode === 'system' ? systemPreference : themeMode;
  const effectiveTheme = previewTheme || currentTheme;
  const themeObject = getThemeById(effectiveTheme) || getThemeById(getDefaultThemeId());

  return {
    currentTheme,
    themeMode,
    resolvedMode,
    accentColor,
    previewTheme,
    themeObject,
    allThemes: themes,
    setTheme,
    setThemeMode,
    setAccentColor,
    setPreviewTheme,
    applyPreview,
    resetPreview,
    resetToDefaults,
  };
}

/**
 * Access theme state without throwing if outside provider.
 * @returns {ReturnType<typeof useTheme>|null}
 */
export function useThemeOptional() {
  try {
    return useTheme();
  } catch {
    return null;
  }
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export { themes, getThemeById, getDefaultThemeId } from '@/lib/themes/theme-definitions';
export {
  generateAccentCSS,
  accentPresets,
  validateAccentColor,
} from '@/lib/themes/accent-colors';
