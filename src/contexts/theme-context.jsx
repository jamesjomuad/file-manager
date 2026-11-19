'use client';

/**
 * Theme Context Provider
 *
 * Provides theme state management with:
 * - Theme selection (10 built-in themes)
 * - Theme mode (system/light/dark)
 * - Custom accent colors
 * - Theme preview (hover/temporary theme switching)
 * - localStorage persistence
 * - System preference detection
 *
 * Themes are applied via data-theme and data-theme-mode attributes on <html>.
 *
 * @example
 * ```jsx
 * import { ThemeProvider, useTheme } from '@/contexts/theme-context';
 *
 * function App() {
 *   return (
 *     <ThemeProvider>
 *       <MyComponent />
 *     </ThemeProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const { currentTheme, setTheme, setThemeMode } = useTheme();
 *   return <button onClick={() => setTheme('dracula')}>Switch Theme</button>;
 * }
 * ```
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from 'react';
import {
  themes,
  getThemeById,
  getDefaultThemeId,
} from '@/lib/themes/theme-definitions';
import {
  getDefaultAccent,
  generateAccentCSS,
  validateAccentColor,
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
// Storage Utilities
// =============================================================================

/**
 * Safely read from localStorage
 * @param {string} key - Storage key
 * @returns {string|null} Stored value or null
 */
function readStorage(key) {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely write to localStorage
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 */
function writeStorage(key, value) {
  if (typeof window === 'undefined') return;
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // Storage may be full or disabled
  }
}

// =============================================================================
// System Preference Detection
// =============================================================================

/**
 * Get the user's system color scheme preference
 * @returns {'light'|'dark'} System preference
 */
function getSystemPreference() {
  if (typeof window === 'undefined') return 'dark';
  const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
  return mediaQuery?.matches ? 'dark' : 'light';
}

/**
 * Resolve theme mode to actual light/dark value
 * @param {'system'|'light'|'dark'} mode - Theme mode
 * @returns {'light'|'dark'} Resolved mode
 */
function resolveMode(mode) {
  if (mode === 'system') {
    return getSystemPreference();
  }
  return mode;
}

// =============================================================================
// DOM Application
// =============================================================================

/**
 * Apply theme to the document
 * @param {string} themeId - Theme ID to apply
 * @param {'light'|'dark'} resolvedMode - Resolved light/dark mode
 */
function applyThemeToDOM(themeId, resolvedMode) {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;
  html.setAttribute('data-theme', themeId);
  html.setAttribute('data-theme-mode', resolvedMode);

  // Also maintain .dark class for BoardUI compatibility
  if (resolvedMode === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}

/**
 * Apply accent color override to the document
 * @param {string|null} accentColor - Custom accent color or null for default
 * @param {string} themeId - Current theme ID
 */
function applyAccentToDOM(accentColor, themeId) {
  if (typeof document === 'undefined') return;

  const styleId = 'theme-accent-override';
  let style = document.getElementById(styleId);

  if (!accentColor) {
    // Remove custom accent
    if (style) {
      style.remove();
    }
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
// Context
// =============================================================================

/**
 * @typedef {Object} ThemeContextValue
 * @property {string} currentTheme - Current theme ID
 * @property {'system'|'light'|'dark'} themeMode - Theme mode setting
 * @property {'light'|'dark'} resolvedMode - Resolved light/dark mode
 * @property {string|null} accentColor - Custom accent color or null
 * @property {string|null} previewTheme - Theme ID being previewed or null
 * @property {Object} themeObject - Current theme definition object
 * @property {Object[]} allThemes - Array of all theme definitions
 * @property {(themeId: string) => void} setTheme - Set active theme
 * @property {(mode: 'system'|'light'|'dark') => void} setThemeMode - Set theme mode
 * @property {(color: string|null) => void} setAccentColor - Set custom accent color
 * @property {(themeId: string|null) => void} setPreviewTheme - Start/stop theme preview
 * @property {() => void} applyPreview - Apply previewed theme as active
 * @property {() => void} resetPreview - Cancel theme preview
 * @property {() => void} resetToDefaults - Reset all theme settings
 */

/** @type {import('react').Context<ThemeContextValue|null>} */
const ThemeContext = createContext(null);

// =============================================================================
// External Store for System Preference Changes
// =============================================================================

let systemPreferenceListeners = new Set();
let systemPreference = getSystemPreference();

function subscribeToSystemPreference(listener) {
  systemPreferenceListeners.add(listener);
  return () => systemPreferenceListeners.delete(listener);
}

if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    systemPreference = e.matches ? 'dark' : 'light';
    systemPreferenceListeners.forEach((listener) => listener());
  });
}

function useSystemPreference() {
  return useSyncExternalStore(
    subscribeToSystemPreference,
    () => systemPreference,
    () => 'dark' // Server default
  );
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * ThemeProvider component
 *
 * Wraps the application and provides theme context to all children.
 * Must be placed as high in the component tree as possible.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.defaultTheme] - Initial theme ID (before localStorage)
 * @param {'system'|'light'|'dark'} [props.defaultMode] - Initial theme mode
 */
export function ThemeProvider({
  children,
  defaultTheme = getDefaultThemeId(),
  defaultMode = DEFAULT_MODE,
}) {
  // System preference (reactive to changes)
  const systemPref = useSystemPreference();

  // Theme state (initialized from localStorage or defaults)
  const [currentTheme, setCurrentTheme] = useState(() => {
    if (typeof window === 'undefined') return defaultTheme;
    return readStorage(STORAGE_KEY_THEME) || defaultTheme;
  });

  const [themeMode, setThemeModeState] = useState(() => {
    if (typeof window === 'undefined') return defaultMode;
    return readStorage(STORAGE_KEY_MODE) || defaultMode;
  });

  const [accentColor, setAccentColorState] = useState(() => {
    if (typeof window === 'undefined') return null;
    return readStorage(STORAGE_KEY_ACCENT);
  });

  // Preview state (not persisted)
  const [previewTheme, setPreviewThemeState] = useState(null);

  // Derived: resolve mode considering system preference
  const resolvedMode = useMemo(() => {
    if (themeMode === 'system') {
      return systemPref;
    }
    return themeMode;
  }, [themeMode, systemPref]);

  // Derived: effective theme (preview or current)
  const effectiveTheme = previewTheme || currentTheme;

  // Derived: theme object
  const themeObject = useMemo(() => {
    return getThemeById(effectiveTheme) || getThemeById(defaultTheme);
  }, [effectiveTheme, defaultTheme]);

  // Apply theme to DOM when it changes
  useEffect(() => {
    applyThemeToDOM(effectiveTheme, resolvedMode);
  }, [effectiveTheme, resolvedMode]);

  // Apply accent color when it changes
  useEffect(() => {
    applyAccentToDOM(accentColor, currentTheme);
  }, [accentColor, currentTheme]);

  // Setters with persistence
  const setTheme = useCallback((themeId) => {
    const theme = getThemeById(themeId);
    if (!theme) return;
    setCurrentTheme(themeId);
    writeStorage(STORAGE_KEY_THEME, themeId);
  }, []);

  const setThemeMode = useCallback((mode) => {
    if (!['system', 'light', 'dark'].includes(mode)) return;
    setThemeModeState(mode);
    writeStorage(STORAGE_KEY_MODE, mode);
  }, []);

  const setAccentColor = useCallback((color) => {
    setAccentColorState(color);
    writeStorage(STORAGE_KEY_ACCENT, color);
  }, []);

  const setPreviewTheme = useCallback((themeId) => {
    if (themeId === null) {
      setPreviewThemeState(null);
      return;
    }
    const theme = getThemeById(themeId);
    if (theme) {
      setPreviewThemeState(themeId);
    }
  }, []);

  const applyPreview = useCallback(() => {
    if (previewTheme) {
      setCurrentTheme(previewTheme);
      writeStorage(STORAGE_KEY_THEME, previewTheme);
      setPreviewThemeState(null);
    }
  }, [previewTheme]);

  const resetPreview = useCallback(() => {
    setPreviewThemeState(null);
  }, []);

  const resetToDefaults = useCallback(() => {
    setCurrentTheme(defaultTheme);
    setThemeModeState(defaultMode);
    setAccentColorState(null);
    setPreviewThemeState(null);
    writeStorage(STORAGE_KEY_THEME, defaultTheme);
    writeStorage(STORAGE_KEY_MODE, defaultMode);
    writeStorage(STORAGE_KEY_ACCENT, null);
  }, [defaultTheme, defaultMode]);

  // Context value
  const value = useMemo(
    () => ({
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
    }),
    [
      currentTheme,
      themeMode,
      resolvedMode,
      accentColor,
      previewTheme,
      themeObject,
      setTheme,
      setThemeMode,
      setAccentColor,
      setPreviewTheme,
      applyPreview,
      resetPreview,
      resetToDefaults,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Access theme context
 *
 * @returns {ThemeContextValue} Theme context value
 * @throws {Error} If used outside ThemeProvider
 *
 * @example
 * ```jsx
 * function ThemeSwitcher() {
 *   const { currentTheme, setTheme, allThemes } = useTheme();
 *   return (
 *     <select value={currentTheme} onChange={(e) => setTheme(e.target.value)}>
 *       {allThemes.map((t) => (
 *         <option key={t.id} value={t.id}>{t.name}</option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Access theme context without throwing if outside provider
 *
 * @returns {ThemeContextValue|null} Theme context value or null
 */
export function useThemeOptional() {
  return useContext(ThemeContext);
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export { themes, getThemeById, getDefaultThemeId } from '@/lib/themes/theme-definitions';
export {
  getDefaultAccent,
  accentPresets,
  validateAccentColor,
} from '@/lib/themes/accent-colors';
