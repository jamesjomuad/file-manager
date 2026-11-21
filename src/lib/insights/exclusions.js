/**
 * Insights scan directory exclusions.
 *
 * Provides a default set of directory names that are always skipped during
 * filesystem scanning (dependencies, build output, caches, version control,
 * system directories). Users can add, remove, or toggle individual exclusions
 * via the settings UI. The final exclusion list is persisted to a JSON file
 * so the server-side scanner can read it without client state.
 *
 * All matching is case-insensitive and applies only to directories, never files.
 */

import fs from 'fs/promises';
import path from 'path';
import { ROOT_DIR } from '../filesystem/security.js';

// =============================================================================
// Default Exclusions
// =============================================================================

/**
 * @typedef {Object} ExclusionEntry
 * @property {string} name - Directory name to exclude
 * @property {string} category - Category label (dependencies, build, cache, vcs, system, custom)
 * @property {boolean} isDefault - Whether this is part of the default set
 * @property {boolean} enabled - Whether this exclusion is active
 */

/** @type {Array<{name: string, category: string}>} */
export const DEFAULT_EXCLUSIONS = [
  // Dependencies
  { name: 'node_modules', category: 'dependencies' },
  { name: 'vendor', category: 'dependencies' },
  { name: 'bower_components', category: 'dependencies' },
  { name: '.venv', category: 'dependencies' },
  { name: 'venv', category: 'dependencies' },
  { name: 'Pods', category: 'dependencies' },
  // Build output
  { name: 'dist', category: 'build' },
  { name: 'build', category: 'build' },
  { name: 'out', category: 'build' },
  { name: '.next', category: 'build' },
  { name: '.nuxt', category: 'build' },
  { name: '.output', category: 'build' },
  { name: 'target', category: 'build' },
  // Caches
  { name: '.cache', category: 'cache' },
  { name: '.turbo', category: 'cache' },
  { name: '.parcel-cache', category: 'cache' },
  { name: '.vite', category: 'cache' },
  { name: '__pycache__', category: 'cache' },
  // Version control
  { name: '.git', category: 'vcs' },
  { name: '.svn', category: 'vcs' },
  { name: '.hg', category: 'vcs' },
  // System
  { name: 'System Volume Information', category: 'system' },
  { name: '$RECYCLE.BIN', category: 'system' },
  { name: 'Lost+Found', category: 'system' },
  // Application-internal (always excluded, not user-configurable)
  { name: '.trash', category: 'internal' },
  { name: '.thumbnails', category: 'internal' },
];

/** Category labels for display */
export const EXCLUSION_CATEGORIES = {
  dependencies: 'Dependencies',
  build: 'Build Output',
  cache: 'Caches',
  vcs: 'Version Control',
  system: 'System',
  internal: 'Internal',
  custom: 'Custom',
};

// =============================================================================
// Config File Persistence
// =============================================================================

const CONFIG_FILE = path.join(ROOT_DIR, '.filemanager-insights.json');

/**
 * @typedef {Object} ExclusionsConfig
 * @property {string[]} disabled - Directory names that are disabled (default exclusions toggled off)
 * @property {string[]} custom - Custom directory names added by user
 */

/**
 * Read the exclusions config from disk.
 * @returns {Promise<ExclusionsConfig>}
 */
async function readConfig() {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      disabled: Array.isArray(parsed.disabled) ? parsed.disabled : [],
      custom: Array.isArray(parsed.custom) ? parsed.custom : [],
    };
  } catch {
    return { disabled: [], custom: [] };
  }
}

/**
 * Write the exclusions config to disk.
 * @param {ExclusionsConfig} config
 */
async function writeConfig(config) {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get the full list of exclusion entries with enabled state.
 * Merges defaults with user config (disabled defaults + custom additions).
 * @returns {Promise<ExclusionEntry[]>}
 */
export async function getExclusions() {
  const config = await readConfig();
  const disabledSet = new Set(config.disabled.map(n => n.toLowerCase()));

  return DEFAULT_EXCLUSIONS.map(entry => ({
    ...entry,
    enabled: !disabledSet.has(entry.name.toLowerCase()),
  })).concat(
    config.custom.map(name => ({
      name,
      category: 'custom',
      isDefault: false,
      enabled: true,
    }))
  );
}

/**
 * Get the effective set of directory names to exclude during scanning.
 * Only returns names that are enabled. Case-insensitive Set.
 * @returns {Promise<Set<string>>} Lowercased directory names to exclude
 */
export async function getEffectiveExclusions() {
  const exclusions = await getExclusions();
  return new Set(
    exclusions
      .filter(e => e.enabled)
      .map(e => e.name.toLowerCase())
  );
}

/**
 * Toggle a default exclusion on or off.
 * @param {string} name - Directory name
 * @param {boolean} enabled
 */
export async function setExclusionEnabled(name, enabled) {
  const config = await readConfig();
  const lowerName = name.toLowerCase();

  // Check if it's a default exclusion
  const isDefault = DEFAULT_EXCLUSIONS.some(e => e.name.toLowerCase() === lowerName);

  if (isDefault) {
    if (enabled) {
      // Remove from disabled list
      config.disabled = config.disabled.filter(n => n.toLowerCase() !== lowerName);
    } else {
      // Add to disabled list (preserve original casing from defaults)
      const original = DEFAULT_EXCLUSIONS.find(e => e.name.toLowerCase() === lowerName);
      if (original && !config.disabled.some(n => n.toLowerCase() === lowerName)) {
        config.disabled.push(original.name);
      }
    }
  }

  await writeConfig(config);
}

/**
 * Add a custom exclusion.
 * @param {string} name - Directory name to add
 * @returns {{success: boolean, error?: string}}
 */
export async function addCustomExclusion(name) {
  if (!name || typeof name !== 'string') {
    return { success: false, error: 'Name is required' };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: 'Name cannot be empty' };
  }

  // Validate: no path separators, no special chars
  if (/[\\/]/.test(trimmed)) {
    return { success: false, error: 'Name cannot contain path separators' };
  }

  const config = await readConfig();
  const lowerName = trimmed.toLowerCase();

  // Check for duplicates (case-insensitive)
  const allNames = [
    ...DEFAULT_EXCLUSIONS.map(e => e.name.toLowerCase()),
    ...config.custom.map(n => n.toLowerCase()),
  ];
  if (allNames.includes(lowerName)) {
    return { success: false, error: 'This exclusion already exists' };
  }

  config.custom.push(trimmed);
  await writeConfig(config);
  return { success: true };
}

/**
 * Remove a custom exclusion.
 * @param {string} name - Directory name to remove
 */
export async function removeCustomExclusion(name) {
  const config = await readConfig();
  const lowerName = name.toLowerCase();
  config.custom = config.custom.filter(n => n.toLowerCase() !== lowerName);
  await writeConfig(config);
}

/**
 * Restore all exclusions to defaults.
 */
export async function restoreDefaults() {
  await writeConfig({ disabled: [], custom: [] });
}
