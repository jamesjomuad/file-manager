"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

/**
 * @typedef {Object} HashRoute
 * @property {string} name - Route name (explorer, recent, favorites, trash, settings)
 * @property {string|null} path - Optional path segment (for explorer folder navigation)
 */

/**
 * Parse hash string into route object
 * @param {string} hash - URL hash (e.g., "#/explorer/Documents" or "#/recent")
 * @returns {HashRoute}
 */
function parseHash(hash) {
  // Remove leading # and /
  const cleaned = hash.replace(/^#?\/?/, "");

  if (!cleaned) {
    return { name: "explorer", path: null };
  }

  const parts = cleaned.split("/");
  const name = parts[0] || "explorer";
  const pathParts = parts.slice(1);

  // Decode path segments and join with /
  const path = pathParts.length > 0
    ? pathParts.map(decodeURIComponent).join("/")
    : null;

  return { name, path };
}

/**
 * Build hash string from route object
 * @param {string} name - Route name
 * @param {string|null} path - Optional path
 * @returns {string}
 */
function buildHash(name, path) {
  if (!path) {
    return `#/${name}`;
  }

  // Encode each path segment
  const encodedPath = path
    .split(/[\\/]/)
    .map(encodeURIComponent)
    .join("/");

  return `#/${name}/${encodedPath}`;
}

/**
 * Valid route names
 */
const VALID_ROUTES = ["explorer", "recent", "favorites", "trash", "settings"];

/**
 * Check if route name is valid
 * @param {string} name
 * @returns {boolean}
 */
function isValidRoute(name) {
  return VALID_ROUTES.includes(name);
}

/**
 * Hash-based router hook
 * Manages application navigation via URL hash fragments
 *
 * @returns {Object} Router interface
 */
export function useHashRouter() {
  const [route, setRoute] = useState({ name: "explorer", path: null });
  const [isReady, setIsReady] = useState(false);

  // Initialize router on client mount
  useEffect(() => {
    const hash = window.location.hash || "#/explorer";
    const parsed = parseHash(hash);

    // Validate route
    if (!isValidRoute(parsed.name)) {
      // Redirect to explorer if invalid
      window.location.hash = "#/explorer";
      setRoute({ name: "explorer", path: null });
    } else {
      setRoute(parsed);
    }

    setIsReady(true);
  }, []);

  // Listen to hash changes (browser back/forward, manual URL changes)
  useEffect(() => {
    if (!isReady) return;

    const handleHashChange = () => {
      const hash = window.location.hash || "#/explorer";
      const parsed = parseHash(hash);

      if (isValidRoute(parsed.name)) {
        setRoute(parsed);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [isReady]);

  /**
   * Navigate to a route
   * @param {string} name - Route name
   * @param {string|null} [path] - Optional path (for explorer)
   */
  const navigate = useCallback((name, path = null) => {
    if (!isValidRoute(name)) {
      console.warn(`Invalid route: ${name}`);
      name = "explorer";
    }

    const newHash = buildHash(name, path);
    window.location.hash = newHash;

    // Update state immediately for responsive UI
    setRoute({ name, path });
  }, []);

  /**
   * Navigate to explorer with optional path
   * @param {string|null} [path]
   */
  const navigateToExplorer = useCallback((path = null) => {
    navigate("explorer", path);
  }, [navigate]);

  /**
   * Navigate to recent files
   */
  const navigateToRecent = useCallback(() => {
    navigate("recent");
  }, [navigate]);

  /**
   * Navigate to favorites
   */
  const navigateToFavorites = useCallback(() => {
    navigate("favorites");
  }, [navigate]);

  /**
   * Navigate to trash
   */
  const navigateToTrash = useCallback(() => {
    navigate("trash");
  }, [navigate]);

  /**
   * Navigate to settings
   */
  const navigateToSettings = useCallback(() => {
    navigate("settings");
  }, [navigate]);

  return useMemo(() => ({
    route,
    isReady,
    navigate,
    navigateToExplorer,
    navigateToRecent,
    navigateToFavorites,
    navigateToTrash,
    navigateToSettings,
  }), [route, isReady, navigate, navigateToExplorer, navigateToRecent, navigateToFavorites, navigateToTrash, navigateToSettings]);
}
