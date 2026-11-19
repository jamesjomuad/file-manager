import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

// =============================================================================
// Helpers
// =============================================================================

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
  if (type === 'explorer') return 'explorer';
  return `${type}:${tabPath || generateId()}`;
}

/**
 * Create default explorer tab.
 * @returns {WorkspaceTab}
 */
function createExplorerTab() {
  return {
    id: 'explorer',
    type: 'explorer',
    title: 'Explorer',
    pinned: true,
    dirty: false,
  };
}

// =============================================================================
// Store Definition
// =============================================================================

/**
 * @typedef {Object} WorkspaceState
 * @property {WorkspaceTab[]} tabs - All workspace tabs
 * @property {string|null} activeTabId - ID of active tab
 * @property {WorkspaceTab[]} recentlyClosed - Recently closed tabs (max 20)
 */

/**
 * @typedef {Object} WorkspaceActions
 * @property {(type: TabType, options?: {path?: string, title?: string, state?: Object}) => string} openTab - Open a tab
 * @property {(tabId: string, options?: {force?: boolean}) => boolean} closeTab - Close a tab
 * @property {(options?: {force?: boolean}) => void} closeAllTabs - Close all tabs except explorer
 * @property {(tabId: string, options?: {force?: boolean}) => void} closeOtherTabs - Close all tabs except one
 * @property {(tabId: string, options?: {force?: boolean}) => void} closeTabsToRight - Close tabs to the right
 * @property {(tabId: string) => void} switchTab - Activate a tab by ID
 * @property {(index: number) => void} switchTabByIndex - Activate a tab by index
 * @property {(tabId: string) => void} togglePin - Toggle pinned state
 * @property {(fromIndex: number, toIndex: number) => void} reorderTabs - Reorder tabs
 * @property {() => string|null} reopenLastClosed - Reopen most recently closed tab
 * @property {(tabId: string, dirty: boolean) => void} setTabDirty - Update dirty state
 * @property {(tabId: string, title: string) => void} setTabTitle - Update title
 * @property {(tabId: string, state: Object) => void} updateTabState - Update tab state
 * @property {(dirPath: string) => void} navigateExplorer - Navigate explorer to path
 */

/**
 * Workspace store - manages workspace tabs with persistence.
 *
 * Persisted state: tabs[], activeTabId, recentlyClosed[]
 *
 * Features:
 * - Tab singleton pattern (explorer tab always exists)
 * - Recently closed tabs (max 20)
 * - Dirty state tracking with confirmation
 * - Tab pinning (explorer always pinned)
 * - Tab reordering (explorer stays at index 0)
 *
 * Uses localStorage persistence via Zustand persist middleware.
 */
export const useWorkspaceStore = create(
  persist(
    /**
     * @param {import('zustand').SetState<WorkspaceState & WorkspaceActions>} set
     * @param {import('zustand').GetState<WorkspaceState & WorkspaceActions>} get
     */
    (set, get) => ({
      // Initial state
      tabs: [createExplorerTab()],
      activeTabId: 'explorer',
      recentlyClosed: [],

      // Actions
      openTab: (type, options = {}) => {
        const { path, title, state } = options;
        const tabId = buildTabId(type, path);
        const { tabs, activeTabId } = get();

        // Check if already open
        const existing = tabs.find((t) => t.id === tabId);
        if (existing) {
          set({ activeTabId: tabId });
          // Update state if provided
          if (state) {
            set({
              tabs: tabs.map((t) =>
                t.id === tabId ? { ...t, state: { ...t.state, ...state } } : t
              ),
            });
          }
          return tabId;
        }

        // Create new tab
        const newTab = {
          id: tabId,
          type,
          title: title || path?.split('/').pop() || type,
          path: path || undefined,
          dirty: false,
          pinned: false,
          state: state || undefined,
        };

        // Insert after the active tab (or at end)
        const activeIdx = tabs.findIndex((t) => t.id === activeTabId);
        const insertAt = activeIdx >= 0 ? activeIdx + 1 : tabs.length;

        const next = [...tabs];
        next.splice(insertAt, 0, newTab);

        set({ tabs: next, activeTabId: tabId });
        return tabId;
      },

      closeTab: (tabId, options = {}) => {
        const { tabs, activeTabId, recentlyClosed } = get();
        const tab = tabs.find((t) => t.id === tabId);
        if (!tab) return false;

        // Can't close the explorer tab
        if (tab.type === 'explorer') return false;

        // Refuse pinned tabs unless forced
        if (tab.pinned && !options.force) return false;

        // Confirm dirty tabs
        if (tab.dirty && !options.force) {
          if (typeof window !== 'undefined') {
            const confirmed = window.confirm(
              `"${tab.title}" has unsaved changes. Close anyway?`
            );
            if (!confirmed) return false;
          }
        }

        // Add to recently closed (if it has a path)
        let nextRecentlyClosed = recentlyClosed;
        if (tab.path) {
          const filtered = recentlyClosed.filter((t) => t.id !== tabId);
          nextRecentlyClosed = [{ ...tab, state: undefined }, ...filtered].slice(0, 20);
        }

        // Remove tab
        const idx = tabs.findIndex((t) => t.id === tabId);
        const nextTabs = tabs.filter((t) => t.id !== tabId);

        // Adjust active tab
        let nextActiveTabId = activeTabId;
        if (tabId === activeTabId) {
          const newActive = nextTabs[Math.min(idx, nextTabs.length - 1)];
          if (newActive) nextActiveTabId = newActive.id;
        }

        set({
          tabs: nextTabs,
          activeTabId: nextActiveTabId,
          recentlyClosed: nextRecentlyClosed,
        });

        return true;
      },

      closeAllTabs: (options = {}) => {
        const { tabs } = get();
        const closable = tabs.filter((t) => t.type !== 'explorer');
        const hasDirty = closable.some((t) => t.dirty);

        if (hasDirty && !options.force) {
          if (typeof window !== 'undefined') {
            const confirmed = window.confirm(
              'Close all tabs? Unsaved changes will be lost.'
            );
            if (!confirmed) return;
          }
        }

        set({
          tabs: tabs.filter((t) => t.type === 'explorer'),
          activeTabId: 'explorer',
        });
      },

      closeOtherTabs: (tabId, options = {}) => {
        const { tabs } = get();
        const others = tabs.filter(
          (t) => t.id !== tabId && t.type !== 'explorer'
        );
        const hasDirty = others.some((t) => t.dirty);

        if (hasDirty && !options.force) {
          if (typeof window !== 'undefined') {
            const confirmed = window.confirm(
              'Close other tabs? Unsaved changes will be lost.'
            );
            if (!confirmed) return;
          }
        }

        set({
          tabs: tabs.filter((t) => t.id === tabId || t.type === 'explorer'),
          activeTabId: tabId,
        });
      },

      closeTabsToRight: (tabId, options = {}) => {
        const { tabs } = get();
        const idx = tabs.findIndex((t) => t.id === tabId);
        if (idx === -1) return;

        const toClose = tabs.slice(idx + 1).filter((t) => t.type !== 'explorer');
        const hasDirty = toClose.some((t) => t.dirty);

        if (hasDirty && !options.force) {
          if (typeof window !== 'undefined') {
            const confirmed = window.confirm(
              'Close tabs to the right? Unsaved changes will be lost.'
            );
            if (!confirmed) return;
          }
        }

        const cutIdx = tabs.findIndex((t) => t.id === tabId);
        let kept = tabs.slice(0, cutIdx + 1);

        // Keep explorer if it was after the cut point
        const explorerTab = tabs.find((t) => t.type === 'explorer');
        if (explorerTab && !kept.some((t) => t.id === explorerTab.id)) {
          kept.unshift(explorerTab);
        }

        set({ tabs: kept });
      },

      switchTab: (tabId) => {
        set({ activeTabId: tabId });
      },

      switchTabByIndex: (index) => {
        const { tabs } = get();
        if (index >= 0 && index < tabs.length) {
          set({ activeTabId: tabs[index].id });
        }
      },

      togglePin: (tabId) => {
        const { tabs } = get();
        set({
          tabs: tabs.map((t) => {
            if (t.id !== tabId) return t;
            if (t.type === 'explorer') return t; // Explorer always pinned
            return { ...t, pinned: !t.pinned };
          }),
        });
      },

      reorderTabs: (fromIndex, toIndex) => {
        const { tabs } = get();
        if (
          fromIndex < 0 ||
          fromIndex >= tabs.length ||
          toIndex < 0 ||
          toIndex >= tabs.length ||
          fromIndex === toIndex
        ) {
          return;
        }

        // Explorer tab (index 0) can't be moved
        if (fromIndex === 0 || toIndex === 0) return;

        const next = [...tabs];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);

        set({ tabs: next });
      },

      reopenLastClosed: () => {
        const { recentlyClosed, openTab } = get();
        if (recentlyClosed.length === 0) return null;

        const [last, ...rest] = recentlyClosed;
        set({ recentlyClosed: rest });

        // Re-open it
        openTab(last.type, {
          path: last.path,
          title: last.title,
          state: last.state,
        });

        return last.id;
      },

      setTabDirty: (tabId, dirty) => {
        const { tabs } = get();
        set({
          tabs: tabs.map((t) => (t.id === tabId ? { ...t, dirty } : t)),
        });
      },

      setTabTitle: (tabId, title) => {
        const { tabs } = get();
        set({
          tabs: tabs.map((t) => (t.id === tabId ? { ...t, title } : t)),
        });
      },

      updateTabState: (tabId, state) => {
        const { tabs } = get();
        set({
          tabs: tabs.map((t) =>
            t.id === tabId ? { ...t, state: { ...t.state, ...state } } : t
          ),
        });
      },

      navigateExplorer: (dirPath) => {
        const { openTab } = get();
        openTab('explorer', { state: { currentPath: dirPath } });
      },
    }),
    {
      name: 'fileManager.workspace',
      // Persist all state
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        recentlyClosed: state.recentlyClosed,
      }),
      // Migrate from old localStorage format if needed
      migrate: (persistedState, version) => {
        // Ensure explorer tab exists
        if (persistedState?.tabs) {
          const hasExplorer = persistedState.tabs.some((t) => t.type === 'explorer');
          if (!hasExplorer) {
            persistedState.tabs.unshift(createExplorerTab());
          }
          // Ensure explorer is pinned
          const explorerTab = persistedState.tabs.find((t) => t.type === 'explorer');
          if (explorerTab) explorerTab.pinned = true;
        }
        return persistedState;
      },
    }
  )
);

// =============================================================================
// Derived Selectors
// =============================================================================

/**
 * Get the active tab object.
 * @returns {WorkspaceTab|null}
 */
export function useActiveTab() {
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  return tabs.find((t) => t.id === activeTabId) || tabs[0] || null;
}

/**
 * Get the active tab index.
 * @returns {number}
 */
export function useActiveTabIndex() {
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  return tabs.findIndex((t) => t.id === activeTabId);
}

// =============================================================================
// Backward-compatible useWorkspace Hook
// =============================================================================

/**
 * Access workspace state and actions.
 * Drop-in replacement for the old WorkspaceContext's useWorkspace hook.
 *
 * @returns {{
 *   tabs: WorkspaceTab[],
 *   activeTab: WorkspaceTab|null,
 *   activeTabIndex: number,
 *   activeTabId: string|null,
 *   recentlyClosed: WorkspaceTab[],
 *   openTab: (type: TabType, options?: {path?: string, title?: string, state?: Object}) => string,
 *   closeTab: (tabId: string, options?: {force?: boolean}) => boolean,
 *   closeAllTabs: (options?: {force?: boolean}) => void,
 *   closeOtherTabs: (tabId: string, options?: {force?: boolean}) => void,
 *   closeTabsToRight: (tabId: string, options?: {force?: boolean}) => void,
 *   switchTab: (tabId: string) => void,
 *   switchTabByIndex: (index: number) => void,
 *   togglePin: (tabId: string) => void,
 *   reorderTabs: (fromIndex: number, toIndex: number) => void,
 *   reopenLastClosed: () => string|null,
 *   setTabDirty: (tabId: string, dirty: boolean) => void,
 *   setTabTitle: (tabId: string, title: string) => void,
 *   updateTabState: (tabId: string, state: Object) => void,
 *   navigateExplorer: (dirPath: string) => void,
 * }}
 */
export function useWorkspace() {
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const recentlyClosed = useWorkspaceStore((s) => s.recentlyClosed);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || null;
  const activeTabIndex = tabs.findIndex((t) => t.id === activeTabId);

  const openTab = useWorkspaceStore((s) => s.openTab);
  const closeTab = useWorkspaceStore((s) => s.closeTab);
  const closeAllTabs = useWorkspaceStore((s) => s.closeAllTabs);
  const closeOtherTabs = useWorkspaceStore((s) => s.closeOtherTabs);
  const closeTabsToRight = useWorkspaceStore((s) => s.closeTabsToRight);
  const switchTab = useWorkspaceStore((s) => s.switchTab);
  const switchTabByIndex = useWorkspaceStore((s) => s.switchTabByIndex);
  const togglePin = useWorkspaceStore((s) => s.togglePin);
  const reorderTabs = useWorkspaceStore((s) => s.reorderTabs);
  const reopenLastClosed = useWorkspaceStore((s) => s.reopenLastClosed);
  const setTabDirty = useWorkspaceStore((s) => s.setTabDirty);
  const setTabTitle = useWorkspaceStore((s) => s.setTabTitle);
  const updateTabState = useWorkspaceStore((s) => s.updateTabState);
  const navigateExplorer = useWorkspaceStore((s) => s.navigateExplorer);

  return {
    tabs,
    activeTab,
    activeTabIndex,
    activeTabId,
    recentlyClosed,
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
    setTabDirty,
    setTabTitle,
    updateTabState,
    navigateExplorer,
  };
}
