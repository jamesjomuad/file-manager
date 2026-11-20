import { create } from 'zustand';

/** @type {string} localStorage key for favorites */
const STORAGE_KEY = "fileManager.favorites";

/**
 * Load favorites from localStorage
 * @returns {string[]}
 */
function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter((p) => typeof p === "string");
      }
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

/**
 * Save favorites to localStorage
 * @param {string[]} favorites
 */
function saveToStorage(favorites) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Zustand store for managing favorite file paths.
 * 
 * Uses a shared store so all components (Explorer, Sidebar, FavoritesView)
 * see the same state immediately. Persists to localStorage.
 *
 * @template T
 * @typedef {import('zustand').UseBoundStore<import('zustand').StoreState<T>>} UseZustandStore
 */
export const useFavoritesStore = create((set, get) => ({
  /** @type {string[]} */
  favorites: loadFromStorage(),

  /**
   * Add a path to favorites (no-op if already present)
   * @param {string} path
   */
  addFavorite: (path) => {
    if (!path) return;
    const current = get().favorites;
    if (current.includes(path)) return;
    const next = [...current, path];
    saveToStorage(next);
    set({ favorites: next });
  },

  /**
   * Remove a path from favorites
   * @param {string} path
   */
  removeFavorite: (path) => {
    const current = get().favorites;
    const next = current.filter((p) => p !== path);
    saveToStorage(next);
    set({ favorites: next });
  },

  /**
   * Toggle favorite status of a path
   * @param {string} path
   */
  toggleFavorite: (path) => {
    if (!path) return;
    const current = get().favorites;
    const next = current.includes(path)
      ? current.filter((p) => p !== path)
      : [...current, path];
    saveToStorage(next);
    set({ favorites: next });
  },

  /**
   * Check if a path is favorited
   * @param {string} path
   * @returns {boolean}
   */
  isFavorite: (path) => get().favorites.includes(path),

  /**
   * Clear all favorites
   */
  clearFavorites: () => {
    saveToStorage([]);
    set({ favorites: [] });
  },

  /**
   * Refresh from localStorage (e.g., after cross-tab change)
   */
  refresh: () => {
    set({ favorites: loadFromStorage() });
  },
}));

// Listen for cross-tab storage events
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      useFavoritesStore.getState().refresh();
    }
  });
}
