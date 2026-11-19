"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/** @type {string} localStorage key for favorites */
const STORAGE_KEY = "fileManager.favorites";

/**
 * Custom hook for managing favorite file paths with localStorage persistence.
 *
 * Stores an array of file paths that the user has marked as favorites.
 * Changes are automatically persisted to localStorage and synced across
 * tabs via the `storage` event.
 *
 * @returns {{
 *   favorites: string[],
 *   addFavorite: (path: string) => void,
 *   removeFavorite: (path: string) => void,
 *   toggleFavorite: (path: string) => void,
 *   isFavorite: (path: string) => boolean,
 *   clearFavorites: () => void,
 * }}
 */
export function useFavorites() {
  /** @type {[string[], React.Dispatch<React.StateSetter<string[]>>]} */
  const [favorites, setFavorites] = useState(/** @type {string[]} */ ([]));
  const initialized = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFavorites(parsed.filter((p) => typeof p === "string"));
        }
      }
    } catch (error) {
      console.error("Failed to load favorites from localStorage:", error);
    }
    initialized.current = true;
  }, []);

  // Persist to localStorage whenever favorites change (skip initial mount)
  useEffect(() => {
    if (!initialized.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error("Failed to save favorites to localStorage:", error);
    }
  }, [favorites]);

  // Sync across tabs
  useEffect(() => {
    /** @param {StorageEvent} event */
    const handleStorage = (event) => {
      if (event.key === STORAGE_KEY && event.newValue !== null) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (Array.isArray(parsed)) {
            setFavorites(parsed.filter((p) => typeof p === "string"));
          }
        } catch {
          // Ignore malformed storage events
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  /**
   * Add a path to favorites (no-op if already present)
   * @param {string} path - File path to favorite
   */
  const addFavorite = useCallback((path) => {
    if (!path) return;
    setFavorites((prev) =>
      prev.includes(path) ? prev : [...prev, path]
    );
  }, []);

  /**
   * Remove a path from favorites
   * @param {string} path - File path to unfavorite
   */
  const removeFavorite = useCallback((path) => {
    setFavorites((prev) => prev.filter((p) => p !== path));
  }, []);

  /**
   * Toggle favorite status of a path
   * @param {string} path - File path to toggle
   */
  const toggleFavorite = useCallback((path) => {
    if (!path) return;
    setFavorites((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  }, []);

  /**
   * Check if a path is favorited
   * @param {string} path - File path to check
   * @returns {boolean}
   */
  const isFavorite = useCallback(
    (path) => favorites.includes(path),
    [favorites]
  );

  /**
   * Clear all favorites
   */
  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    clearFavorites,
  };
}
