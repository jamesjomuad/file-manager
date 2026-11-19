/**
 * CSS Variables Generator for Theme System
 *
 * Converts theme definitions to CSS custom properties. Generates scoped
 * selectors using data-theme attribute for theme selection.
 *
 * Usage:
 *   import { generateThemeCSS, generateAllThemesCSS } from './generate-css-vars';
 *   const css = generateAllThemesCSS();
 *   // Inject into <style> tag or write to file
 */

import { themes, getThemeById } from './theme-definitions';

/**
 * Convert a theme color key to a CSS variable name
 * @param {string} key - Theme color key (e.g., 'bg-primary')
 * @returns {string} CSS variable name (e.g., '--color-bg-primary')
 */
function keyToCSSVar(key) {
  return `--color-${key}`;
}

/**
 * Convert a theme color key to a semantic BoardUI token name
 * @param {string} key - Theme color key
 * @returns {string} Semantic token name (e.g., '--bg-background-primary')
 */
function keyToSemanticToken(key) {
  const mapping = {
    // Backgrounds
    'bg-primary': '--bg-background-full',
    'bg-secondary': '--bg-background-primary',
    'bg-tertiary': '--bg-background-secondary',
    'bg-elevated': '--bg-background-elevated',
    'bg-overlay': '--bg-background-overlay',

    // Text
    'text-primary': '--text-text-primary',
    'text-secondary': '--text-text-secondary',
    'text-tertiary': '--text-text-tertiary',
    'text-disabled': '--text-text-disabled',

    // Borders
    'border-default': '--border-border-button-default',
    'border-subtle': '--border-border-separator',
    'border-strong': '--border-border-button-hover',

    // Interactive - Primary Button
    'button-primary-bg': '--button-primary-bg',
    'button-primary-text': '--button-primary-text',
    'button-primary-hover': '--button-primary-hover',

    // Interactive - Secondary Button
    'button-secondary-bg': '--button-secondary-bg',
    'button-secondary-text': '--button-secondary-text',
    'button-secondary-hover': '--button-secondary-hover',

    // Status colors
    'success': '--color-state-success',
    'warning': '--color-state-warning',
    'error': '--color-state-error',
    'info': '--color-state-info',

    // Scrollbar
    'scrollbar-track': '--scrollbar-track',
    'scrollbar-thumb': '--scrollbar-thumb',
    'scrollbar-thumb-hover': '--scrollbar-thumb-hover',
  };

  return mapping[key] || null;
}

/**
 * Generate CSS custom properties for a single theme
 * @param {Object} theme - Theme definition object
 * @returns {string} CSS string with custom properties
 */
export function generateThemeCSS(theme) {
  const lines = [];
  lines.push(`[data-theme="${theme.id}"] {`);

  // Generate raw color variables
  for (const [key, value] of Object.entries(theme.colors)) {
    lines.push(`  ${keyToCSSVar(key)}: ${value};`);
  }

  // Generate semantic token mappings
  lines.push('');
  lines.push('  /* Semantic BoardUI token mappings */');
  for (const [key, value] of Object.entries(theme.colors)) {
    const semanticToken = keyToSemanticToken(key);
    if (semanticToken) {
      lines.push(`  ${semanticToken}: ${keyToCSSVar(key)};`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Generate CSS for all themes
 * @returns {string} Complete CSS string for all themes
 */
export function generateAllThemesCSS() {
  const themeBlocks = themes.map(generateThemeCSS);
  return themeBlocks.join('\n\n');
}

/**
 * Generate inline CSS for a specific theme (for SSR/hydration)
 * @param {string} themeId - Theme ID to generate
 * @returns {string} CSS string or empty string if not found
 */
export function generateThemeCSSById(themeId) {
  const theme = getThemeById(themeId);
  if (!theme) return '';
  return generateThemeCSS(theme);
}

/**
 * Get CSS variable reference for a theme color
 * @param {string} key - Theme color key (e.g., 'bg-primary')
 * @returns {string} CSS variable reference (e.g., 'var(--color-bg-primary)')
 */
export function getCSSVarRef(key) {
  return `var(${keyToCSSVar(key)})`;
}

/**
 * Get the semantic token mapping for a theme color key
 * @param {string} key - Theme color key
 * @returns {string|null} Semantic token name or null if no mapping
 */
export function getSemanticToken(key) {
  return keyToSemanticToken(key);
}
