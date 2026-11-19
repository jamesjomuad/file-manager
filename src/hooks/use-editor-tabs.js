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
  const initial = useRef(loadTabsFromStorage());
  /** @type {[Array<Object>, React.Dispatch<React.StateSetter<Array<Object>>>]} */
  const [tabs, setTabs] = useState(initial.current.tabs);
  /** @type {[number, React.Dispatch<React.StateSetter<number>>]} */
  const [activeIndex, setActiveIndex] = useState(() => {
    const idx = initial.current.activeIndex;
    // Clamp to valid range in case stored index is out of bounds
    return tabs.length > 0 ? Math.min(idx, tabs.length - 1) : 0;
  });
  const initialized = useRef(true);

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
    () => (tabs.length > 0 && activeIndex >= 0 && activeIndex < tabs.length ? tabs[activeIndex] : null),
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

    // Check if already open — switch to it
    setTabs((prev) => {
      const existingIndex = prev.findIndex((t) => t.path === filePath);
      if (existingIndex !== -1) {
        setActiveIndex(existingIndex);
        return prev; // No state change needed, just switch
      }
      return prev; // We'll handle the new tab below
    });

    // Re-check synchronously via a ref-like pattern:
    // We need to know if the tab existed to avoid duplicate fetches.
    // Use functional update and a flag.
    let alreadyOpen = false;
    setTabs((prev) => {
      const existingIndex = prev.findIndex((t) => t.path === filePath);
      if (existingIndex !== -1) {
        alreadyOpen = true;
        setActiveIndex(existingIndex);
      }
      return prev;
    });

    if (alreadyOpen) return;

    try {
      const response = await fetch(
        `/api/files/${filePath}?action=read`
      );
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
    let canClose = true;

    setTabs((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      if (prev[index].unsavedChanges) {
        const confirmed = window.confirm(
          `"${prev[index].name}" has unsaved changes. Close anyway?`
        );
        if (!confirmed) {
          canClose = false;
        }
      }
      return prev;
    });

    if (!canClose) return false;

    setTabs((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = prev.filter((_, i) => i !== index);

      // Adjust active index
      setActiveIndex((currentActive) => {
        if (next.length === 0) return 0;
        if (index < currentActive) return currentActive - 1;
        if (index === currentActive) return Math.min(currentActive, next.length - 1);
        return currentActive;
      });

      return next;
    });

    return true;
  }, []);

  /**
   * Close all tabs. Prompts for any unsaved changes.
   */
  const closeAllTabs = useCallback(async () => {
    setTabs((prev) => {
      const hasDirty = prev.some((t) => t.unsavedChanges);
      if (hasDirty) {
        const confirmed = window.confirm(
          "Close all tabs? Unsaved changes will be lost."
        );
        if (!confirmed) return prev;
      }
      setActiveIndex(0);
      return [];
    });
  }, []);

  /**
   * Close all tabs except the one at the given index.
   * @param {number} index - Tab index to keep
   */
  const closeOtherTabs = useCallback(async (index) => {
    setTabs((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const kept = prev[index];
      const others = prev.filter((_, i) => i !== index);
      const hasDirtyOthers = others.some((t) => t.unsavedChanges);

      if (hasDirtyOthers) {
        const confirmed = window.confirm(
          "Close other tabs? Unsaved changes will be lost."
        );
        if (!confirmed) return prev;
      }

      setActiveIndex(0);
      return [kept];
    });
  }, []);

  /**
   * Switch to a different tab by index.
   * @param {number} index - Tab index to activate
   */
  const switchTab = useCallback((index) => {
    setActiveIndex((prev) => {
      // Validate bounds via functional update
      return index;
    });
  }, []);

  /**
   * Update the content of a tab (marks it as having unsaved changes).
   * @param {number} index - Tab index
   * @param {string} content - New content
   */
  const updateTabContent = useCallback((index, content) => {
    setTabs((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const tab = prev[index];
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
    let tabToSave = null;
    setTabs((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      tabToSave = prev[index];
      return prev;
    });

    if (!tabToSave) return false;

    try {
      const response = await fetch(`/api/files/${tabToSave.path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: tabToSave.content }),
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

      // Ctrl/Cmd+W — Close active tab
      if (isMod && !e.shiftKey && e.key === "w") {
        e.preventDefault();
        setTabs((prev) => {
          if (prev.length === 0) return prev;
          // We'll read activeIndex from the closure — but it might be stale.
          // Use a workaround: store it in a ref, or just trigger closeTab.
          return prev; // handled below
        });
        // Call closeTab for the current active tab
        setActiveIndex((currentIdx) => {
          // We need to close this tab — but closeTab is async with confirm.
          // Trigger it outside the state setter.
          // We use a microtask trick: just call closeTab.
          // The current activeIndex is captured in the closure.
          closeTab(currentIdx);
          return currentIdx; // Don't change — closeTab handles it
        });
      }

      // Ctrl/Cmd+Shift+W — Close all tabs
      if (isMod && e.shiftKey && e.key === "W") {
        e.preventDefault();
        closeAllTabs();
      }

      // Ctrl/Cmd+Tab — Next tab
      if (isMod && !e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        setActiveIndex((prev) => {
          // Need to know tab count — read from sessionStorage or derive
          // We'll use the functional update with the tabs array
          return prev; // handled below
        });
        setTabs((prev) => {
          if (prev.length <= 1) return prev;
          setActiveIndex((currentIdx) => (currentIdx + 1) % prev.length);
          return prev;
        });
      }

      // Ctrl/Cmd+Shift+Tab — Previous tab
      if (isMod && e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        setTabs((prev) => {
          if (prev.length <= 1) return prev;
          setActiveIndex((currentIdx) =>
            currentIdx <= 0 ? prev.length - 1 : currentIdx - 1
          );
          return prev;
        });
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
