'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { cx } from '@/utils/cx';
import { RiCloseLine, RiMoreLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';

/**
 * Tab bar component for multi-file editor.
 *
 * Displays open file tabs with:
 * - Active tab highlighting
 * - Unsaved changes indicator (dot)
 * - Close button on hover
 * - Middle-click to close
 * - Context menu (right-click) with close options
 *
 * @param {Object} props
 * @param {Array<{path: string, name: string, unsavedChanges: boolean, language: string}>} props.tabs
 * @param {number} props.activeIndex - Index of the active tab
 * @param {function(number): void} props.onSwitchTab - Called when tab should be activated
 * @param {function(number): void} props.onCloseTab - Called when tab should be closed
 * @param {function(number): void} props.onCloseOthers - Called to close all tabs except one
 * @param {function(): void} props.onCloseAll - Called to close all tabs
 */
export function TabBar({ tabs, activeIndex, onSwitchTab, onCloseTab, onCloseOthers, onCloseAll }) {
  const [contextMenu, setContextMenu] = useState(null);
  const contextMenuRef = useRef(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu]);

  /**
   * Handle tab click to switch to it
   */
  const handleTabClick = useCallback((index) => {
    onSwitchTab(index);
  }, [onSwitchTab]);

  /**
   * Handle close button click
   */
  const handleCloseClick = useCallback((e, index) => {
    e.stopPropagation();
    onCloseTab(index);
  }, [onCloseTab]);

  /**
   * Handle middle mouse button to close tab
   */
  const handleMouseDown = useCallback((e, index) => {
    if (e.button === 1) {
      e.preventDefault();
      onCloseTab(index);
    }
  }, [onCloseTab]);

  /**
   * Handle right-click for context menu
   */
  const handleContextMenu = useCallback((e, index) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabIndex: index });
  }, []);

  /**
   * Handle context menu action
   */
  const handleContextAction = useCallback((action) => {
    if (!contextMenu) return;

    switch (action) {
      case 'close':
        onCloseTab(contextMenu.tabIndex);
        break;
      case 'closeOthers':
        onCloseOthers(contextMenu.tabIndex);
        break;
      case 'closeAll':
        onCloseAll();
        break;
    }
    setContextMenu(null);
  }, [contextMenu, onCloseTab, onCloseOthers, onCloseAll]);

  if (!tabs || tabs.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-0 border-b border-separator-border bg-background-secondary-default overflow-x-auto">
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          const fileName = tab.name || tab.path.split('/').pop() || tab.path;

          return (
            <div
              key={tab.path}
              onClick={() => handleTabClick(index)}
              onMouseDown={(e) => handleMouseDown(e, index)}
              onContextMenu={(e) => handleContextMenu(e, index)}
              className={cx(
                'group flex items-center gap-2 px-4 py-2 min-w-[120px] max-w-[200px] cursor-pointer border-r border-separator-border',
                'transition-colors select-none',
                isActive
                  ? 'bg-background-primary-default text-text-primary'
                  : 'bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover'
              )}
            >
              {/* File name with unsaved indicator */}
              <span className="flex-1 truncate text-sm flex items-center gap-1.5">
                {tab.unsavedChanges && (
                  <span className="w-2 h-2 rounded-full bg-accent-500 flex-shrink-0" />
                )}
                <span className="truncate">{fileName}</span>
              </span>

              {/* Close button */}
              <button
                onClick={(e) => handleCloseClick(e, index)}
                className={cx(
                  'flex-shrink-0 p-0.5 rounded hover:bg-background-tertiary-default transition-colors',
                  'opacity-0 group-hover:opacity-100'
                )}
                aria-label={`Close ${fileName}`}
              >
                <RiCloseLine className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-background-primary-default border border-border-button-default rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={() => handleContextAction('close')}
            className="w-full px-3 py-1.5 text-left text-sm text-text-primary hover:bg-background-primary-hover transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => handleContextAction('closeOthers')}
            className="w-full px-3 py-1.5 text-left text-sm text-text-primary hover:bg-background-primary-hover transition-colors"
          >
            Close Others
          </button>
          <button
            onClick={() => handleContextAction('closeAll')}
            className="w-full px-3 py-1.5 text-left text-sm text-text-primary hover:bg-background-primary-hover transition-colors"
          >
            Close All
          </button>
        </div>
      )}
    </>
  );
}
