/**
 * Accent Color System
 *
 * Provides default accent colors per theme and support for custom accent
 * overrides. Generates CSS custom properties for accent colors and ensures
 * accessibility through contrast ratio validation.
 *
 * Usage:
 *   import { getDefaultAccent, setCustomAccent, generateAccentCSS } from './accent-colors';
 *   const css = generateAccentCSS('#ff6b6b');
 */

import { themes } from './theme-definitions';

/**
 * Default accent color for each theme
 * @type {Object<string, string>}
 */
export const defaultAccents = {
  'midnight-pro': '#89b4fa',
  'dracula': '#bd93f9',
  'one-dark-pro': '#61afef',
  'tokyo-night': '#7aa2f7',
  'catppuccin-mocha': '#f5c2e7',
  'github-dark-dimmed': '#539bf5',
  'nord': '#88c0d0',
  'github-light': '#0969da',
  'catppuccin-latte': '#1e66f5',
  'one-light': '#4078f2',
};

/**
 * Preset accent color options
 * @type {Array<{id: string, name: string, color: string}>}
 */
export const accentPresets = [
  { id: 'blue', name: 'Blue', color: '#3b82f6' },
  { id: 'indigo', name: 'Indigo', color: '#6366f1' },
  { id: 'violet', name: 'Violet', color: '#8b5cf6' },
  { id: 'purple', name: 'Purple', color: '#a855f7' },
  { id: 'pink', name: 'Pink', color: '#ec4899' },
  { id: 'rose', name: 'Rose', color: '#f43f5e' },
  { id: 'red', name: 'Red', color: '#ef4444' },
  { id: 'orange', name: 'Orange', color: '#f97316' },
  { id: 'amber', name: 'Amber', color: '#f59e0b' },
  { id: 'yellow', name: 'Yellow', color: '#eab308' },
  { id: 'lime', name: 'Lime', color: '#84cc16' },
  { id: 'green', name: 'Green', color: '#22c55e' },
  { id: 'emerald', name: 'Emerald', color: '#10b981' },
  { id: 'teal', name: 'Teal', color: '#14b8a6' },
  { id: 'cyan', name: 'Cyan', color: '#06b6d4' },
  { id: 'sky', name: 'Sky', color: '#0ea5e9' },
];

/**
 * Get the default accent color for a theme
 * @param {string} themeId - Theme ID
 * @returns {string} Hex color value
 */
export function getDefaultAccent(themeId) {
  return defaultAccents[themeId] || defaultAccents['midnight-pro'];
}

/**
 * Parse a hex color string to RGB components
 * @param {string} hex - Hex color (3 or 6 digits, with or without #)
 * @returns {{r: number, g: number, b: number}|null} RGB object or null
 */
export function parseHex(hex) {
  if (!hex) return null;
  const cleaned = hex.replace(/^#/, '');
  let r, g, b;

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else if (cleaned.length === 6) {
    r = parseInt(cleaned.substring(0, 2), 16);
    g = parseInt(cleaned.substring(2, 4), 16);
    b = parseInt(cleaned.substring(4, 6), 16);
  } else {
    return null;
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

/**
 * Calculate relative luminance of a color (WCAG 2.0)
 * @param {{r: number, g: number, b: number}} rgb - RGB color object
 * @returns {number} Relative luminance (0-1)
 */
export function getLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors (WCAG 2.0)
 * @param {string} color1 - First hex color
 * @param {string} color2 - Second hex color
 * @returns {number} Contrast ratio (1-21)
 */
export function getContrastRatio(color1, color2) {
  const rgb1 = parseHex(color1);
  const rgb2 = parseHex(color2);
  if (!rgb1 || !rgb2) return 1;

  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if text color has sufficient contrast against background
 * @param {string} textColor - Text hex color
 * @param {string} bgColor - Background hex color
 * @param {'AA'|'AAA'} level - WCAG level (default: AA)
 * @returns {boolean} True if contrast is sufficient
 */
export function hasSufficientContr(textColor, bgColor, level = 'AA') {
  const ratio = getContrastRatio(textColor, bgColor);
  const threshold = level === 'AAA' ? 7 : 4.5;
  return ratio >= threshold;
}

/**
 * Generate a lighter/darker variant of a color
 * @param {string} hex - Hex color
 * @param {number} amount - Amount to adjust (-100 to 100, negative = darker)
 * @returns {string} Adjusted hex color
 */
export function adjustColor(hex, amount) {
  const rgb = parseHex(hex);
  if (!rgb) return hex;

  const factor = amount / 100;
  const adjust = (c) => {
    if (factor > 0) {
      return Math.round(c + (255 - c) * factor);
    }
    return Math.round(c * (1 + factor));
  };

  const r = Math.max(0, Math.min(255, adjust(rgb.r)));
  const g = Math.max(0, Math.min(255, adjust(rgb.g)));
  const b = Math.max(0, Math.min(255, adjust(rgb.b)));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Generate an accent color ramp from a base color
 * @param {string} baseColor - Base hex color
 * @returns {Object<string, string>} Color ramp with shade keys (50-950)
 */
export function generateAccentRamp(baseColor) {
  const ramp = {};
  const steps = [
    { shade: '50', amount: 85 },
    { shade: '100', amount: 70 },
    { shade: '200', amount: 50 },
    { shade: '300', amount: 30 },
    { shade: '400', amount: 10 },
    { shade: '500', amount: 0 },
    { shade: '600', amount: -10 },
    { shade: '700', amount: -25 },
    { shade: '800', amount: -40 },
    { shade: '900', amount: -55 },
    { shade: '950', amount: -70 },
  ];

  for (const { shade, amount } of steps) {
    ramp[`accent-${shade}`] = adjustColor(baseColor, amount);
  }

  return ramp;
}

/**
 * Generate CSS for accent color override
 * @param {string} accentColor - Custom accent hex color
 * @returns {string} CSS string
 */
export function generateAccentCSS(accentColor) {
  const ramp = generateAccentRamp(accentColor);
  const lines = [];
  lines.push(':root {');
  lines.push(`  /* Custom accent color override */`);
  for (const [key, value] of Object.entries(ramp)) {
    lines.push(`  --color-${key}: ${value};`);
  }
  lines.push('}');
  return lines.join('\n');
}

/**
 * Get the best text color (black or white) for a given background
 * @param {string} bgColor - Background hex color
 * @returns {string} '#000000' or '#ffffff'
 */
export function getBestTextColor(bgColor) {
  const rgb = parseHex(bgColor);
  if (!rgb) return '#000000';

  const luminance = getLuminance(rgb);
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Validate an accent color for accessibility
 * @param {string} accentColor - Hex color to validate
 * @param {string} themeId - Theme ID to check against
 * @returns {{valid: boolean, issues: string[]}} Validation result
 */
export function validateAccentColor(accentColor, themeId) {
  const issues = [];
  const theme = themes.find((t) => t.id === themeId);

  if (!theme) {
    issues.push('Theme not found');
    return { valid: false, issues };
  }

  const bgColor = theme.colors['bg-primary'];
  const textColor = theme.colors['text-primary'];

  // Check accent against background for button text readability
  const accentOnBg = getContrastRatio(accentColor, bgColor);
  if (accentOnBg < 3) {
    issues.push(`Accent color has low contrast (${accentOnBg.toFixed(1)}:1) against background`);
  }

  // Check if text on accent button is readable
  const textOnAccent = getBestTextColor(accentColor);
  const textContrast = getContrastRatio(textOnAccent, accentColor);
  if (textContrast < 4.5) {
    issues.push(`Text on accent button has insufficient contrast (${textContrast.toFixed(1)}:1)`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
