"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { getLanguageName } from "@/lib/editor/file-types";

/** @type {string} sessionStorage key for open tabs */
const STORAGE_KEY = "fileManager.editorTabs";

/**
 * Extract file name from a path
 * @param {string} filePath
 * @returns {string}
 */
function getFileName(filePath) {
  return filePath.split("/").pop() || filePath;
}

/**
 * Load tab state from sessionStorage.
 * @returns {{ tabs: Array<Object>, activeIndex: number }}
 */
function loadTabsFromStorage() {
  if (typeof window === "undefined") return { tabs: [], activeIndex: 0 };
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        parsed &&
        Array.isArray(parsed.tabs) &&
        typeof parsed.activeIndex === "number"
      ) {
        return {
          tabs: parsed.tabs.filter(
            (t) => t && typeof t.path === "string" && typeof t.name === "string"
          ),
          activeIndex: Math.max(0, parsed.activeIndex),
        };
      }
    }
  } catch (error) {
    console.error("Failed to load editor tabs from sessionStorage:", error);
  }
  return { tabs: [], activeIndex: 0 };
}

/**
 * Custom hook for managing editor tabs.
 *
 * Maintains an array of open file tabs with content tracking, unsaved-change
 * detection, and sessionStorage persistence across page reloads.
 *
 * @returns {{
 *   tabs: Array<{path: string, name: string, content: string, originalContent: string, unsavedChanges: boolean, language: string}>,
 *   activeTab: Object|null,
 *   activeTabIndex: number,
 *   openTab: (filePath: string) => Promise<void>,
 *   closeTab: (index: number) => Promise<boolean>,
 *   closeAllTabs: () => Promise<void>,
 *   closeOtherTabs: (index: number) => Promise<void>,
 *   switchTab: (index: number) => void,
 *   updateTabContent: (index: number, content: string) => void,
 *   saveTab: (index: number) => Promise<boolean>,
 *   discardTabChanges: (index: number) => void,
 *   hasUnsavedChanges: boolean,
 * }}
 */
export function useEditorTabs() {
  /** @type {[Array<Object>, React.Dispatch<React.StateSetter<Array<Object>>>]} */
  const [tabs, setTabs] = useState(() => loadTabsFromStorage().tabs);
  /** @type {[number, React.Dispatch<React.StateSetter<number>>]} */
  const [activeIndex, setActiveIndex] = useState(() => {
    const { tabs: storedTabs, activeIndex: idx } = loadTabsFromStorage();
    return storedTabs.length > 0 ? Math.min(idx, storedTabs.length - 1) : 0;
  });

  // Refs to read latest state inside event handlers and effects
  const tabsRef = useRef(tabs);
  const activeIndexRef = useRef(activeIndex);

  // Keep refs in sync with state
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Persist tabs to sessionStorage on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tabs, activeIndex })
      );
    } catch (error) {
      console.error("Failed to save editor tabs to sessionStorage:", error);
    }
  }, [tabs, activeIndex]);

  /**
   * The currently active tab object, or null if no tabs are open.
   */
  const activeTab = useMemo(
    () =>
      tabs.length > 0 && activeIndex >= 0 && activeIndex < tabs.length
        ? tabs[activeIndex]
        : null,
    [tabs, activeIndex]
  );

  /**
   * Whether any tab has unsaved changes.
   */
  const hasUnsavedChanges = useMemo(
    () => tabs.some((t) => t.unsavedChanges),
    [tabs]
  );

  /**
   * Open a file in a new tab or switch to an existing one.
   * Fetches file content from the API if opening a new tab.
   * @param {string} filePath - Path of the file to open
   */
  const openTab = useCallback(async (filePath) => {
    if (!filePath) return;

    // Check if already open — switch to it and bail
    const currentTabs = tabsRef.current;
    const existingIndex = currentTabs.findIndex((t) => t.path === filePath);
    if (existingIndex !== -1) {
      setActiveIndex(existingIndex);
      return;
    }

    try {
      const response = await fetch(`/api/files/${filePath}?action=read`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to read file");
      }

      const content = data.data.content || "";
      const name = getFileName(filePath);
      const language = getLanguageName(filePath);

      const newTab = {
        path: filePath,
        name,
        content,
        originalContent: content,
        unsavedChanges: false,
        language,
      };

      setTabs((prev) => {
        // Double-check it wasn't added by a concurrent call
        const idx = prev.findIndex((t) => t.path === filePath);
        if (idx !== -1) {
          setActiveIndex(idx);
          return prev;
        }
        setActiveIndex(prev.length);
        return [...prev, newTab];
      });
    } catch (error) {
      console.error("Failed to open tab:", error);
      // TODO: Surface error to UI (toast)
    }
  }, []);

  /**
   * Close a tab by index. Prompts if the tab has unsaved changes.
   * @param {number} index - Tab index to close
   * @returns {Promise<boolean>} Whether the tab was closed
   */
  const closeTab = useCallback(async (index) => {
    const currentTabs = tabsRef.current;
    if (index < 0 || index >= currentTabs.length) return false;

    if (currentTabs[index].unsavedChanges) {
      const confirmed = window.confirm(
        `"${currentTabs[index].name}" has unsaved changes. Close anyway?`
      );
      if (!confirmed) return false;
    }

    setTabs((prev) => prev.filter((_, i) => i !== index));
    setActiveIndex((currentActive) => {
      const newLength = currentTabs.length - 1;
      if (newLength === 0) return 0;
      if (index < currentActive) return currentActive - 1;
      if (index === currentActive)
        return Math.min(currentActive, newLength - 1);
      return currentActive;
    });

    return true;
  }, []);

  /**
   * Close all tabs. Prompts for any unsaved changes.
   */
  const closeAllTabs = useCallback(async () => {
    const currentTabs = tabsRef.current;
    const hasDirty = currentTabs.some((t) => t.unsavedChanges);
    if (hasDirty) {
      const confirmed = window.confirm(
        "Close all tabs? Unsaved changes will be lost."
      );
      if (!confirmed) return;
    }
    setTabs([]);
    setActiveIndex(0);
  }, []);

  /**
   * Close all tabs except the one at the given index.
   * @param {number} index - Tab index to keep
   */
  const closeOtherTabs = useCallback(async (index) => {
    const currentTabs = tabsRef.current;
    if (index < 0 || index >= currentTabs.length) return;

    const others = currentTabs.filter((_, i) => i !== index);
    const hasDirtyOthers = others.some((t) => t.unsavedChanges);

    if (hasDirtyOthers) {
      const confirmed = window.confirm(
        "Close other tabs? Unsaved changes will be lost."
      );
      if (!confirmed) return;
    }

    setTabs([currentTabs[index]]);
    setActiveIndex(0);
  }, []);

  /**
   * Switch to a different tab by index.
   * @param {number} index - Tab index to activate
   */
  const switchTab = useCallback((index) => {
    setActiveIndex(index);
  }, []);

  /**
   * Update the content of a tab (marks it as having unsaved changes).
   * @param {number} index - Tab index
   * @param {string} content - New content
   */
  const updateTabContent = useCallback((index, content) => {
    setTabs((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      return prev.map((t, i) =>
        i === index
          ? {
              ...t,
              content,
              unsavedChanges: content !== t.originalContent,
            }
          : t
      );
    });
  }, []);

  /**
   * Save a tab's content to the API.
   * @param {number} index - Tab index to save
   * @returns {Promise<boolean>} Whether the save succeeded
   */
  const saveTab = useCallback(async (index) => {
    const currentTabs = tabsRef.current;
    if (index < 0 || index >= currentTabs.length) return false;

    const tab = currentTabs[index];

    try {
      const response = await fetch(`/api/files/${tab.path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: tab.content }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to save file");
      }

      // Mark as saved — content is now the "original"
      setTabs((prev) =>
        prev.map((t, i) =>
          i === index
            ? { ...t, originalContent: t.content, unsavedChanges: false }
            : t
        )
      );

      return true;
    } catch (error) {
      console.error("Failed to save tab:", error);
      // TODO: Surface error to UI (toast)
      return false;
    }
  }, []);

  /**
   * Discard unsaved changes for a tab, reverting to original content.
   * @param {number} index - Tab index
   */
  const discardTabChanges = useCallback((index) => {
    setTabs((prev) =>
      prev.map((t, i) =>
        i === index
          ? { ...t, content: t.originalContent, unsavedChanges: false }
          : t
      )
    );
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    /**
     * @param {KeyboardEvent} e
     */
    const handleKeyDown = (e) => {
      const isMod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Ctrl/Cmd+W — Close active tab
      if (isMod && !e.shiftKey && key === "w") {
        e.preventDefault();
        if (tabsRef.current.length > 0) {
          closeTab(activeIndexRef.current);
        }
        return;
      }

      // Ctrl/Cmd+Shift+W — Close all tabs
      if (isMod && e.shiftKey && key === "w") {
        e.preventDefault();
        closeAllTabs();
        return;
      }

      // Ctrl/Cmd+Tab — Next tab
      if (isMod && !e.shiftKey && key === "tab") {
        e.preventDefault();
        const len = tabsRef.current.length;
        if (len <= 1) return;
        setActiveIndex((currentIdx) => (currentIdx + 1) % len);
        return;
      }

      // Ctrl/Cmd+Shift+Tab — Previous tab
      if (isMod && e.shiftKey && key === "tab") {
        e.preventDefault();
        const len = tabsRef.current.length;
        if (len <= 1) return;
        setActiveIndex((currentIdx) =>
          currentIdx <= 0 ? len - 1 : currentIdx - 1
        );
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeTab, closeAllTabs]);

  return {
    tabs,
    activeTab,
    activeTabIndex: activeIndex,
    openTab,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    switchTab,
    updateTabContent,
    saveTab,
    discardTabChanges,
    hasUnsavedChanges,
  };
}
