"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/** @type {string} localStorage key for recent files */
const STORAGE_KEY = "fileManager.recentFiles";

/** @type {number} Maximum number of recent files to keep */
const MAX_RECENT = 20;

/**
 * Custom hook for tracking recently opened files with localStorage persistence.
 *
 * Maintains a most-recent-first ordered list of file paths. When a path is
 * added that already exists, it is moved to the front. The list is capped
 * at {@link MAX_RECENT} entries.
 *
 * @returns {{
 *   recentFiles: string[],
 *   addRecent: (path: string) => void,
 *   clearRecent: () => void,
 * }}
 */
export function useRecentFiles() {
  /** @type {[string[], React.Dispatch<React.StateSetter<string[]>>]} */
  const [recentFiles, setRecentFiles] = useState(/** @type {string[]} */ ([]));
  const initialized = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentFiles(parsed.filter((p) => typeof p === "string"));
        }
      }
    } catch (error) {
      console.error("Failed to load recent files from localStorage:", error);
    }
    initialized.current = true;
  }, []);

  // Persist to localStorage whenever recentFiles change (skip initial mount)
  useEffect(() => {
    if (!initialized.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentFiles));
    } catch (error) {
      console.error("Failed to save recent files to localStorage:", error);
    }
  }, [recentFiles]);

  // Sync across tabs
  useEffect(() => {
    /** @param {StorageEvent} event */
    const handleStorage = (event) => {
      if (event.key === STORAGE_KEY && event.newValue !== null) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (Array.isArray(parsed)) {
            setRecentFiles(parsed.filter((p) => typeof p === "string"));
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
   * Record a file as recently opened. If already present, move to front.
   * Trims the list to {@link MAX_RECENT} entries.
   * @param {string} path - File path that was opened
   */
  const addRecent = useCallback((path) => {
    if (!path) return;
    setRecentFiles((prev) => {
      // Remove existing entry (if any), then prepend
      const filtered = prev.filter((p) => p !== path);
      const next = [path, ...filtered];
      return next.slice(0, MAX_RECENT);
    });
  }, []);

  /**
   * Clear all recent files
   */
  const clearRecent = useCallback(() => {
    setRecentFiles([]);
  }, []);

  return { recentFiles, addRecent, clearRecent };
}
