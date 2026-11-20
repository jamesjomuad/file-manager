import { create } from 'zustand';

/**
 * @typedef {Object} ClipboardItem
 * @property {string} path - Absolute file path
 * @property {string} name - File/directory name
 * @property {'file'|'directory'} type - Item type
 */

/**
 * @typedef {'cut'|'copy'} ClipboardMode
 */

/**
 * Clipboard store for file operations (cut/copy/paste).
 * Tracks items to be moved or copied, and the operation mode.
 */
export const useClipboardStore = create((set, get) => ({
  /**
   * Items in clipboard
   * @type {ClipboardItem[]}
   */
  items: [],

  /**
   * Operation mode: 'cut' (move) or 'copy'
   * @type {ClipboardMode|null}
   */
  mode: null,

  /**
   * Cut items (prepare for move)
   * @param {ClipboardItem[]} items - Items to cut
   */
  cut: (items) => set({
    items: items.map(item => ({ path: item.path, name: item.name, type: item.type })),
    mode: 'cut'
  }),

  /**
   * Copy items
   * @param {ClipboardItem[]} items - Items to copy
   */
  copy: (items) => set({
    items: items.map(item => ({ path: item.path, name: item.name, type: item.type })),
    mode: 'copy'
  }),

  /**
   * Clear clipboard
   */
  clear: () => set({ items: [], mode: null }),

  /**
   * Check if a path is in clipboard as cut (for visual feedback)
   * @param {string} path - Absolute path to check
   * @returns {boolean}
   */
  isCut: (path) => {
    const { items, mode } = get();
    return mode === 'cut' && items.some(item => item.path === path);
  },

  /**
   * Get clipboard item count
   * @returns {number}
   */
  getCount: () => get().items.length,

  /**
   * Check if clipboard has items
   * @returns {boolean}
   */
  hasItems: () => get().items.length > 0
}));
