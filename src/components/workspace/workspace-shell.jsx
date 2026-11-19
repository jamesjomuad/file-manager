"use client";

import { useCallback, useState, useRef, useEffect, memo } from "react";
import { cx } from "@/utils/cx";
import { useWorkspace } from "@/contexts/workspace-context";
import {
  RiCloseLine,
  RiPushpinLine,
  RiPushpinFill,
  RiMoreLine,
} from "@remixicon/react";

/**
 * File-type icon mapping for tab display
 * @param {string} type
 * @param {string} [path]
 * @returns {string} Icon class name
 */
function getTabIcon(type, path) {
  switch (type) {
    case "explorer":
      return "ri-folder-line";
    case "editor":
      return "ri-code-line";
    case "image-viewer":
      return "ri-image-line";
    case "text-viewer":
      return "ri-file-text-line";
    case "pdf-viewer":
      return "ri-file-pdf-line";
    case "archive":
      return "ri-file-zip-line";
    default:
      return "ri-file-line";
  }
}

/**
 * A single tab in the workspace tab bar.
 */
const WorkspaceTabItem = memo(function WorkspaceTabItem({
  tab,
  isActive,
  onClick,
  onClose,
  onContextMenu,
  onMouseDown,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
}) {
  const icon = getTabIcon(tab.type, tab.path);

  return (
    <div
      onClick={onClick}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      draggable={tab.type !== "explorer"}
      onDragStart={(e) => onDragStart?.(e, tab.id)}
      onDragOver={(e) => onDragOver?.(e, tab.id)}
      onDrop={(e) => onDrop?.(e, tab.id)}
      onDragEnd={onDragEnd}
      className={cx(
        "group flex items-center gap-2 px-3 py-2 min-w-[100px] max-w-[200px] cursor-pointer border-r border-separator-border",
        "transition-colors select-none shrink-0",
        isActive
          ? "bg-background-primary-default text-text-primary"
          : "bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover",
        isDragOver && "border-l-2 border-l-accent-500"
      )}
    >
      {/* Icon */}
      <i className={cx(icon, "text-base flex-shrink-0")} aria-hidden />

      {/* Title with dirty indicator */}
      <span className="flex-1 truncate text-sm flex items-center gap-1.5">
        {tab.dirty && (
          <span className="w-2 h-2 rounded-full bg-accent-500 flex-shrink-0" />
        )}
        <span className="truncate">{tab.title}</span>
      </span>

      {/* Pin indicator */}
      {tab.pinned && tab.type !== "explorer" && (
        <RiPushpinFill className="w-3 h-3 flex-shrink-0 text-text-tertiary" />
      )}

      {/* Close button (hidden for pinned explorer) */}
      {!(tab.type === "explorer") && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cx(
            "flex-shrink-0 p-0.5 rounded hover:bg-background-tertiary-default transition-colors",
            "opacity-0 group-hover:opacity-100"
          )}
          aria-label={`Close ${tab.title}`}
        >
          <RiCloseLine className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});

/**
 * Workspace tab bar component.
 *
 * Displays all workspace tabs with:
 * - Active tab highlighting
 * - Dirty indicator
 * - Pin indicator
 * - Close button
 * - Context menu
 * - Overflow navigation
 *
 * @param {Object} props
 * @param {Array} props.tabs - Workspace tabs
 * @param {string} props.activeTabId - Active tab ID
 * @param {function} props.onSwitchTab - Switch tab handler
 * @param {function} props.onCloseTab - Close tab handler
 * @param {function} props.onCloseOthers - Close others handler
 * @param {function} props.onCloseAll - Close all handler
 * @param {function} props.onCloseToRight - Close to right handler
 * @param {function} props.onTogglePin - Toggle pin handler
 */
export function WorkspaceTabBar({
  tabs,
  activeTabId,
  onSwitchTab,
  onCloseTab,
  onCloseOthers,
  onCloseAll,
  onCloseToRight,
  onTogglePin,
  onReorder,
}) {
  const [contextMenu, setContextMenu] = useState(null);
  const contextMenuRef = useRef(null);
  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [draggedTabId, setDraggedTabId] = useState(null);
  const [dragOverTabId, setDragOverTabId] = useState(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [contextMenu]);

  // Check overflow arrows
  useEffect(() => {
    const checkOverflow = () => {
      const el = scrollRef.current;
      if (!el) return;
      setShowLeftArrow(el.scrollLeft > 0);
      setShowRightArrow(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };

    checkOverflow();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkOverflow);
      const observer = new ResizeObserver(checkOverflow);
      observer.observe(el);
      return () => {
        el.removeEventListener("scroll", checkOverflow);
        observer.disconnect();
      };
    }
  }, [tabs]);

  const handleContextMenu = useCallback((e, tabId) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  }, []);

  const handleMouseDown = useCallback((e, tabId) => {
    if (e.button === 1) {
      e.preventDefault();
      onCloseTab(tabId);
    }
  }, [onCloseTab]);

  const handleContextAction = useCallback((action) => {
    if (!contextMenu) return;
    const tabId = contextMenu.tabId;

    switch (action) {
      case "close":
        onCloseTab(tabId);
        break;
      case "closeOthers":
        onCloseOthers(tabId);
        break;
      case "closeAll":
        onCloseAll();
        break;
      case "closeToRight":
        onCloseToRight(tabId);
        break;
      case "pin":
        onTogglePin(tabId);
        break;
    }
    setContextMenu(null);
  }, [contextMenu, onCloseTab, onCloseOthers, onCloseAll, onCloseToRight, onTogglePin]);

  const contextTab = contextMenu ? tabs.find((t) => t.id === contextMenu.tabId) : null;

  // Drag-and-drop handlers
  const handleDragStart = useCallback((e, tabId) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab?.type === "explorer") {
      e.preventDefault();
      return;
    }
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", tabId);
  }, [tabs]);

  const handleDragOver = useCallback((e, tabId) => {
    e.preventDefault();
    const tab = tabs.find((t) => t.id === tabId);
    // Can't drop on explorer or on itself
    if (tabId === draggedTabId || tab?.type === "explorer") {
      e.dataTransfer.dropEffect = "none";
      return;
    }
    e.dataTransfer.dropEffect = "move";
    setDragOverTabId(tabId);
  }, [draggedTabId, tabs]);

  const handleDrop = useCallback((e, targetTabId) => {
    e.preventDefault();
    const sourceTabId = e.dataTransfer.getData("text/plain");
    if (sourceTabId && sourceTabId !== targetTabId) {
      onReorder?.(sourceTabId, targetTabId);
    }
    setDraggedTabId(null);
    setDragOverTabId(null);
  }, [onReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedTabId(null);
    setDragOverTabId(null);
  }, []);

  return (
    <>
      <div className="flex items-stretch bg-background-secondary-default border-b border-separator-border relative">
        {/* Left scroll arrow */}
        {showLeftArrow && (
          <button
            onClick={() => {
              scrollRef.current?.scrollBy({ left: -200, behavior: "smooth" });
            }}
            className="flex-shrink-0 px-1 text-text-tertiary hover:text-text-primary hover:bg-background-secondary-hover transition-colors"
            aria-label="Scroll left"
          >
            <i className="ri-arrow-left-s-line text-base" />
          </button>
        )}

        {/* Tabs scroll container */}
        <div
          ref={scrollRef}
          className="flex items-stretch overflow-x-auto scrollbar-none flex-1"
        >
          {tabs.map((tab) => (
            <WorkspaceTabItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onClick={() => onSwitchTab(tab.id)}
              onClose={() => onCloseTab(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              onMouseDown={(e) => handleMouseDown(e, tab.id)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              isDragOver={dragOverTabId === tab.id}
            />
          ))}
        </div>

        {/* Right scroll arrow */}
        {showRightArrow && (
          <button
            onClick={() => {
              scrollRef.current?.scrollBy({ left: 200, behavior: "smooth" });
            }}
            className="flex-shrink-0 px-1 text-text-tertiary hover:text-text-primary hover:bg-background-secondary-hover transition-colors"
            aria-label="Scroll right"
          >
            <i className="ri-arrow-right-s-line text-base" />
          </button>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && contextTab && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-background-primary-default border border-border-button-default rounded-lg shadow-lg py-1 min-w-[180px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          {contextTab.type !== "explorer" && (
            <>
              <button
                onClick={() => handleContextAction("close")}
                className="w-full px-3 py-1.5 text-left text-sm text-text-primary hover:bg-background-primary-hover transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleContextAction("closeOthers")}
                className="w-full px-3 py-1.5 text-left text-sm text-text-primary hover:bg-background-primary-hover transition-colors"
              >
                Close Others
              </button>
              <button
                onClick={() => handleContextAction("closeToRight")}
                className="w-full px-3 py-1.5 text-left text-sm text-text-primary hover:bg-background-primary-hover transition-colors"
              >
                Close to Right
              </button>
              <div className="my-1 border-t border-separator-border" />
              <button
                onClick={() => handleContextAction("pin")}
                className="w-full px-3 py-1.5 text-left text-sm text-text-primary hover:bg-background-primary-hover transition-colors flex items-center gap-2"
              >
                {contextTab.pinned ? (
                  <>
                    <RiPushpinFill className="w-4 h-4" /> Unpin
                  </>
                ) : (
                  <>
                    <RiPushpinLine className="w-4 h-4" /> Pin
                  </>
                )}
              </button>
              <div className="my-1 border-t border-separator-border" />
            </>
          )}
          <button
            onClick={() => handleContextAction("closeAll")}
            className="w-full px-3 py-1.5 text-left text-sm text-text-primary hover:bg-background-primary-hover transition-colors"
          >
            Close All
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Main workspace shell component.
 * Renders the tab bar and the active tab's content.
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.children - Active tab content
 */
export function WorkspaceShell({ children }) {
  const {
    tabs,
    activeTabId,
    switchTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    closeTabsToRight,
    togglePin,
    reorderTabs,
  } = useWorkspace();

  // Convert drag-drop from (sourceId, targetId) to (fromIndex, toIndex)
  const handleReorder = useCallback((sourceId, targetId) => {
    const fromIndex = tabs.findIndex((t) => t.id === sourceId);
    const toIndex = tabs.findIndex((t) => t.id === targetId);
    if (fromIndex >= 0 && toIndex >= 0) {
      reorderTabs(fromIndex, toIndex);
    }
  }, [tabs, reorderTabs]);

  return (
    <div className="flex flex-col h-full">
      {/* Workspace tab bar */}
      <WorkspaceTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSwitchTab={switchTab}
        onCloseTab={closeTab}
        onCloseOthers={closeOtherTabs}
        onCloseAll={closeAllTabs}
        onCloseToRight={closeTabsToRight}
        onTogglePin={togglePin}
        onReorder={handleReorder}
      />

      {/* Active tab content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
