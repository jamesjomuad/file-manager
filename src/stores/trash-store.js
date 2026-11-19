import { create } from 'zustand';

/**
 * Trash store - manages trash count for sidebar badge
 *
 * Provides a reactive count that updates when files are deleted.
 * Components can subscribe to changes and trigger refreshes.
 *
 * @example
 * // In sidebar
 * const { count } = useTrashStore();
 *
 * // After deletion
 * const { refresh } = useTrashStore.getState();
 * await refresh();
 */
export const useTrashStore = create((set, get) => ({
  /** @type {number} Current trash item count */
  count: 0,

  /** @type {boolean} Whether a refresh is in progress */
  loading: false,

  /** @type {number|null} Timestamp of last successful refresh */
  lastUpdated: null,

  /**
   * Refresh trash count from API
   * Fetches the current trash list and updates the count
   *
   * @returns {Promise<number>} The new count
   */
  refresh: async () => {
    // Prevent concurrent refreshes
    if (get().loading) {
      return get().count;
    }

    set({ loading: true });

    try {
      const response = await fetch('/api/trash');
      if (response.ok) {
        const data = await response.json();
        const count = data.data?.length || 0;
        set({
          count,
          lastUpdated: Date.now(),
          loading: false,
        });
        return count;
      } else {
        set({ loading: false });
        return get().count;
      }
    } catch (error) {
      console.error('Error refreshing trash count:', error);
      set({ loading: false });
      return get().count;
    }
  },

  /**
   * Increment count by a specific amount
   * Used when files are moved to trash
   *
   * @param {number} amount - Number of items added (default: 1)
   */
  increment: (amount = 1) => {
    set((state) => ({ count: state.count + amount }));
  },

  /**
   * Decrement count by a specific amount
   * Used when files are restored or permanently deleted
   *
   * @param {number} amount - Number of items removed (default: 1)
   */
  decrement: (amount = 1) => {
    set((state) => ({ count: Math.max(0, state.count - amount) }));
  },

  /**
   * Reset count to zero
   * Used when trash is emptied
   */
  reset: () => {
    set({ count: 0 });
  },
}));

// Initial fetch on module load
if (typeof window !== 'undefined') {
  useTrashStore.getState().refresh();
}
