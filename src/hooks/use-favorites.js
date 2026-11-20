"use client";

import { useCallback } from "react";
import { useFavoritesStore } from "@/stores/favorites-store";

/**
 * Custom hook for managing favorite file paths.
 *
 * Backed by a Zustand store so all components share the same state.
 * Changes are persisted to localStorage and visible immediately
 * across Explorer, Sidebar, and FavoritesView.
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
  const favorites = useFavoritesStore((s) => s.favorites);
  const addFavorite = useFavoritesStore((s) => s.addFavorite);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const isFavorite = useCallback(
    (path) => favorites.includes(path),
    [favorites]
  );
  const clearFavorites = useFavoritesStore((s) => s.clearFavorites);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    clearFavorites,
  };
}
