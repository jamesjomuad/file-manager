import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * @typedef {'on'|'off'|'wordWrapColumn'} WordWrap
 */

/**
 * @typedef {Object} EditorState
 * @property {number} fontSize - Font size in pixels
 * @property {WordWrap} wordWrap - Word wrap mode
 * @property {boolean} minimap - Show minimap
 * @property {string} theme - Monaco theme ID (synced with app theme)
 */

/**
 * @typedef {Object} EditorActions
 * @property {(size: number) => void} setFontSize - Set font size
 * @property {(mode: WordWrap) => void} setWordWrap - Set word wrap mode
 * @property {(enabled: boolean) => void} setMinimap - Toggle minimap
 * @property {(theme: string) => void} setTheme - Set Monaco theme
 */

/**
 * Editor store - manages code editor preferences.
 *
 * Persisted state: fontSize, wordWrap, minimap, theme
 *
 * Controls editor appearance and behavior.
 * Uses localStorage persistence via Zustand persist middleware.
 *
 * Note: The editor theme is synced with the app theme via a component
 * effect, not stored here. This store holds the user's preference.
 */
export const useEditorStore = create(
  persist(
    /**
     * @param {import('zustand').SetState<EditorState & EditorActions>} set
     */
    (set) => ({
      // Initial state
      fontSize: 14,
      wordWrap: 'on',
      minimap: true,
      theme: 'vs-dark',

      // Actions
      setFontSize: (size) => {
        if (typeof size !== 'number' || size < 8 || size > 32) return;
        set({ fontSize: size });
      },

      setWordWrap: (mode) => {
        if (!['on', 'off', 'wordWrapColumn'].includes(mode)) return;
        set({ wordWrap: mode });
      },

      setMinimap: (enabled) => {
        set({ minimap: enabled });
      },

      setTheme: (theme) => {
        set({ theme });
      },
    }),
    {
      name: 'fileManager.editor',
      partialize: (state) => ({
        fontSize: state.fontSize,
        wordWrap: state.wordWrap,
        minimap: state.minimap,
        theme: state.theme,
      }),
    }
  )
);
