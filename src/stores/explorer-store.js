import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * @typedef {'grid'|'list'} ViewMode
 */

/**
 * @typedef {'name'|'size'|'modified'|'type'} SortField
 */

/**
 * @typedef {'asc'|'desc'} SortOrder
 */

/**
 * @typedef {Object} ExplorerState
 * @property {ViewMode} viewMode - Current view mode
 * @property {SortField} sortBy - Sort field
 * @property {SortOrder} sortOrder - Sort order
 * @property {number} thumbnailSize - Thumbnail size in pixels
 */

/**
 * @typedef {Object} ExplorerActions
 * @property {(mode: ViewMode) => void} setViewMode - Set view mode
 * @property {(field: SortField) => void} setSortBy - Set sort field
 * @property {(order: SortOrder) => void} setSortOrder - Set sort order
 * @property {(size: number) => void} setThumbnailSize - Set thumbnail size
 */

/**
 * Explorer store - manages file explorer view preferences.
 *
 * Persisted state: viewMode, sortBy, sortOrder, thumbnailSize
 *
 * Controls how files are displayed and sorted in the explorer.
 * Uses localStorage persistence via Zustand persist middleware.
 */
export const useExplorerStore = create(
  persist(
    /**
     * @param {import('zustand').SetState<ExplorerState & ExplorerActions>} set
     */
    (set) => ({
      // Initial state
      viewMode: 'grid',
      sortBy: 'name',
      sortOrder: 'asc',
      thumbnailSize: 96,

      // Actions
      setViewMode: (mode) => {
        if (mode !== 'grid' && mode !== 'list') return;
        set({ viewMode: mode });
      },

      setSortBy: (field) => {
        if (!['name', 'size', 'modified', 'type'].includes(field)) return;
        set({ sortBy: field });
      },

      setSortOrder: (order) => {
        if (order !== 'asc' && order !== 'desc') return;
        set({ sortOrder: order });
      },

      setThumbnailSize: (size) => {
        if (typeof size !== 'number' || size < 32 || size > 256) return;
        set({ thumbnailSize: size });
      },
    }),
    {
      name: 'fileManager.explorer',
      partialize: (state) => ({
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        thumbnailSize: state.thumbnailSize,
      }),
    }
  )
);
