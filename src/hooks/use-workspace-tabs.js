"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";

/**
 * @typedef {'explorer'|'editor'|'image-viewer'|'text-viewer'|'pdf-viewer'|'archive'} TabType
 */

/**
 * @typedef {Object} WorkspaceTab
 * @property {string} id - Unique tab identifier (type + path or random)
 * @property {TabType} type - Tab type
 * @property {string} title - Display title
 * @property {string} [path] - File or directory path
 * @property {boolean} dirty - Unsaved changes
 * @property {boolean} pinned - Pinned state
 * @property {Object} [state] - Tab-specific persisted state
 */

const STORAGE_KEY = "fileManager.workspace";

/** Generate a unique ID */
function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Build a tab ID from type and path.
 * Explorer tabs always use 'explorer' as ID (singleton).
 * @param {TabType} type
 * @param {string} [tabPath]
 * @returns {string}
 */
function buildTabId(type, tabPath) {
  if (type === "explorer") return "explorer";
  return `${type}:${tabPath || generateId()}`;
}

/**
 * Load workspace state from localStorage.
 * @returns {{ tabs: WorkspaceTab[], activeTabId: string|null, recentlyClosed: WorkspaceTab[] }}
 */
function loadWorkspace() {
  if (typeof window === "undefined") {
    return {
      tabs: [{ id: "explorer", type: "explorer", title: "Explorer", pinned: true, dirty: false }],
      activeTabId: "explorer",
      recentlyClosed: [],
    };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
        // Ensure explorer tab exists
        const hasExplorer = parsed.tabs.some((t) => t.type === "explorer");
        if (!hasExplorer) {
          parsed.tabs.unshift({
            id: "explorer",
            type: "explorer",
            title: "Explorer",
            pinned: true,
            dirty: false,
          });
        }
        // Ensure explorer is pinned
        const explorerTab = parsed.tabs.find((t) => t.type === "explorer");
        if (explorerTab) explorerTab.pinned = true;

        return {
          tabs: parsed.tabs,
          activeTabId: parsed.activeTabId || parsed.tabs[0].id,
          recentlyClosed: Array.isArray(parsed.recentlyClosed)
            ? parsed.recentlyClosed.slice(0, 20)
            : [],
        };
      }
    }
  } catch (error) {
    console.error("Failed to load workspace:", error);
  }
  return {
    tabs: [{ id: "explorer", type: "explorer", title: "Explorer", pinned: true, dirty: false }],
    activeTabId: "explorer",
    recentlyClosed: [],
  };
}

/**
 * Centralized workspace tab manager.
 *
 * Manages all workspace tabs (explorer, editor, image viewer, etc.)
 * with persistence, reordering, pinning, and recently-closed tracking.
 *
 * @returns {Object} Workspace state and operations
 */
export function useWorkspaceTabs() {
  const initial = useMemo(() => loadWorkspace(), []);
  const [tabs, setTabs] = useState(initial.tabs);
  const [activeTabId, setActiveTabId] = useState(initial.activeTabId);
  const [recentlyClosed, setRecentlyClosed] = useState(initial.recentlyClosed);

  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tabs, activeTabId, recentlyClosed })
      );
    } catch (error) {
      console.error("Failed to save workspace:", error);
    }
  }, [tabs, activeTabId, recentlyClosed]);

  /** The currently active tab */
  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0] || null,
    [tabs, activeTabId]
  );

  /** Index of the active tab */
  const activeTabIndex = useMemo(
    () => tabs.findIndex((t) => t.id === activeTabId),
    [tabs, activeTabId]
  );

  /**
   * Open a tab. If a tab with the same type+path exists, activate it.
   * Otherwise create a new tab.
   *
   * @param {TabType} type - Tab type
   * @param {Object} options - Tab options
   * @param {string} [options.path] - File/directory path
   * @param {string} [options.title] - Override title
   * @param {Object} [options.state] - Tab-specific state
   * @returns {string} The tab ID
   */
  const openTab = useCallback((type, options = {}) => {
    const { path, title, state } = options;
    const tabId = buildTabId(type, path);

    setTabs((prev) => {
      // Check if already open
      const existing = prev.find((t) => t.id === tabId);
      if (existing) {
        setActiveTabId(tabId);
        // Update state if provided
        if (state) {
          return prev.map((t) =>
            t.id === tabId ? { ...t, state: { ...t.state, ...state } } : t
          );
        }
        return prev;
      }

      // Create new tab
      const newTab = {
        id: tabId,
        type,
        title: title || path?.split("/").pop() || type,
        path: path || undefined,
        dirty: false,
        pinned: false,
        state: state || undefined,
      };

      setActiveTabId(tabId);

      // Insert after the active tab (or at end)
      const currentTabs = tabsRef.current;
      const activeIdx = currentTabs.findIndex(
        (t) => t.id === activeTabIdRef.current
      );
      const insertAt = activeIdx >= 0 ? activeIdx + 1 : prev.length;

      const next = [...prev];
      next.splice(insertAt, 0, newTab);
      return next;
    });

    return tabId;
  }, []);

  /**
   * Close a tab by ID.
   * Refuses to close pinned tabs unless force=true.
   * Prompts for dirty tabs.
   *
   * @param {string} tabId - Tab ID to close
   * @param {Object} [options]
   * @param {boolean} [options.force] - Skip confirmation
   * @returns {boolean} Whether the tab was closed
   */
  const closeTab = useCallback((tabId, options = {}) => {
    const currentTabs = tabsRef.current;
    const tab = currentTabs.find((t) => t.id === tabId);
    if (!tab) return false;

    // Can't close the explorer tab
    if (tab.type === "explorer") return false;

    // Refuse pinned tabs unless forced
    if (tab.pinned && !options.force) return false;

    // Confirm dirty tabs
    if (tab.dirty && !options.force) {
      const confirmed = window.confirm(
        `"${tab.title}" has unsaved changes. Close anyway?`
      );
      if (!confirmed) return false;
    }

    // Add to recently closed (if it has a path)
    if (tab.path) {
      setRecentlyClosed((prev) => {
        const filtered = prev.filter((t) => t.id !== tabId);
        return [{ ...tab, state: undefined }, ...filtered].slice(0, 20);
      });
    }

    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      if (idx === -1) return prev;
      const next = prev.filter((t) => t.id !== tabId);

      // Adjust active tab
      if (tabId === activeTabIdRef.current) {
        // Activate the tab to the right, or left if none
        const newActive = next[Math.min(idx, next.length - 1)];
        if (newActive) setActiveTabId(newActive.id);
      }

      return next;
    });

    return true;
  }, []);

  /**
   * Close all tabs except the explorer.
   * @param {Object} [options]
   * @param {boolean} [options.force] - Skip confirmation
   */
  const closeAllTabs = useCallback((options = {}) => {
    const currentTabs = tabsRef.current;
    const closable = currentTabs.filter((t) => t.type !== "explorer");
    const hasDirty = closable.some((t) => t.dirty);

    if (hasDirty && !options.force) {
      const confirmed = window.confirm(
        "Close all tabs? Unsaved changes will be lost."
      );
      if (!confirmed) return;
    }

    setTabs((prev) => prev.filter((t) => t.type === "explorer"));
    setActiveTabId("explorer");
  }, []);

  /**
   * Close all tabs except one.
   * @param {string} tabId - Tab to keep
   * @param {Object} [options]
   * @param {boolean} [options.force] - Skip confirmation
   */
  const closeOtherTabs = useCallback((tabId, options = {}) => {
    const currentTabs = tabsRef.current;
    const others = currentTabs.filter(
      (t) => t.id !== tabId && t.type !== "explorer"
    );
    const hasDirty = others.some((t) => t.dirty);

    if (hasDirty && !options.force) {
      const confirmed = window.confirm(
        "Close other tabs? Unsaved changes will be lost."
      );
      if (!confirmed) return;
    }

    setTabs((prev) =>
      prev.filter((t) => t.id === tabId || t.type === "explorer")
    );
    setActiveTabId(tabId);
  }, []);

  /**
   * Close all tabs to the right of a given tab.
   * @param {string} tabId
   * @param {Object} [options]
   * @param {boolean} [options.force] - Skip confirmation
   */
  const closeTabsToRight = useCallback((tabId, options = {}) => {
    const currentTabs = tabsRef.current;
    const idx = currentTabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;

    const toClose = currentTabs.slice(idx + 1).filter((t) => t.type !== "explorer");
    const hasDirty = toClose.some((t) => t.dirty);

    if (hasDirty && !options.force) {
      const confirmed = window.confirm(
        "Close tabs to the right? Unsaved changes will be lost."
      );
      if (!confirmed) return;
    }

    setTabs((prev) => {
      const cutIdx = prev.findIndex((t) => t.id === tabId);
      const kept = prev.slice(0, cutIdx + 1);
      // Keep explorer if it was after the cut point (it shouldn't be, but safety)
      const explorerTab = prev.find((t) => t.type === "explorer");
      if (explorerTab && !kept.some((t) => t.id === explorerTab.id)) {
        kept.unshift(explorerTab);
      }
      return kept;
    });
  }, []);

  /**
   * Activate a tab by ID.
   * @param {string} tabId
   */
  const switchTab = useCallback((tabId) => {
    setActiveTabId(tabId);
  }, []);

  /**
   * Activate a tab by index.
   * @param {number} index
   */
  const switchTabByIndex = useCallback((index) => {
    const currentTabs = tabsRef.current;
    if (index >= 0 && index < currentTabs.length) {
      setActiveTabId(currentTabs[index].id);
    }
  }, []);

  /**
   * Toggle pinned state on a tab.
   * @param {string} tabId
   */
  const togglePin = useCallback((tabId) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId) return t;
        if (t.type === "explorer") return t; // Explorer always pinned
        return { ...t, pinned: !t.pinned };
      })
    );
  }, []);

  /**
   * Update a tab's dirty state.
   * @param {string} tabId
   * @param {boolean} dirty
   */
  const setTabDirty = useCallback((tabId, dirty) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, dirty } : t))
    );
  }, []);

  /**
   * Update a tab's title.
   * @param {string} tabId
   * @param {string} title
   */
  const setTabTitle = useCallback((tabId, title) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, title } : t))
    );
  }, []);

  /**
   * Update a tab's persisted state.
   * @param {string} tabId
   * @param {Object} state
   */
  const updateTabState = useCallback((tabId, state) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId ? { ...t, state: { ...t.state, ...state } } : t
      )
    );
  }, []);

  /**
   * Reorder tabs by moving one tab from one index to another.
   * @param {number} fromIndex
   * @param {number} toIndex
   */
  const reorderTabs = useCallback((fromIndex, toIndex) => {
    setTabs((prev) => {
      if (
        fromIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex < 0 ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev;
      }

      // Explorer tab (index 0) can't be moved
      if (fromIndex === 0 || toIndex === 0) return prev;

      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  /**
   * Reopen the most recently closed tab.
   * @returns {string|null} The reopened tab ID, or null
   */
  const reopenLastClosed = useCallback(() => {
    if (recentlyClosed.length === 0) return null;

    const [last, ...rest] = recentlyClosed;
    setRecentlyClosed(rest);

    // Re-open it
    openTab(last.type, {
      path: last.path,
      title: last.title,
      state: last.state,
    });

    return last.id;
  }, [recentlyClosed, openTab]);

  /**
   * Navigate the explorer tab to a path.
   * Opens/activates the explorer tab and sets its state.
   * @param {string} dirPath
   */
  const navigateExplorer = useCallback((dirPath) => {
    openTab("explorer", { state: { currentPath: dirPath } });
  }, [openTab]);

  return {
    // State
    tabs,
    activeTab,
    activeTabIndex,
    activeTabId,
    recentlyClosed,

    // Tab operations
    openTab,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    closeTabsToRight,
    switchTab,
    switchTabByIndex,
    togglePin,
    reorderTabs,
    reopenLastClosed,

    // Tab state updates
    setTabDirty,
    setTabTitle,
    updateTabState,

    // Navigation
    navigateExplorer,
  };
}
