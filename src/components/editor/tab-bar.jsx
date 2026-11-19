'use client';

import { useCallback } from 'react';
import { cx } from '@/utils/cx';
import { RiCloseLine } from '@remixicon/react';

/**
 * Tab bar component for multi-file editor
 * @param {Object} props
 * @param {Array} props.tabs - Array of open tab objects
 * @param {string} props.activeTabPath - Path of currently active tab
 * @param {Function} props.onSelectTab - Callback when tab is selected
 * @param {Function} props.onCloseTab - Callback when tab close is requested
 */
export function TabBar({ tabs, activeTabPath, onSelectTab, onCloseTab }) {
  const handleCloseClick = useCallback((e, tabPath) => {
    e.stopPropagation();
    onCloseTab(tabPath);
  }, [onCloseTab]);

  const handleMouseDown = useCallback((e, tabPath, index) => {
    // Middle mouse button closes tab
    if (e.button === 1) {
      e.preventDefault();
      onCloseTab(tabPath);
    }
  }, [onCloseTab]);

  if (!tabs || tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-0 border-b border-separator-border bg-background-secondary-default overflow-x-auto">
      {tabs.map((tab, index) => {
        const isActive = tab.path === activeTabPath;
        const fileName = tab.path.split('/').pop() || tab.path;
        
        return (
          <div
            key={tab.path}
            onClick={() => onSelectTab(tab.path)}
            onMouseDown={(e) => handleMouseDown(e, tab.path, index)}
            className={cx(
              'group flex items-center gap-2 px-4 py-2 min-w-[120px] max-w-[200px] cursor-pointer border-r border-separator-border',
              'transition-colors select-none',
              isActive
                ? 'bg-background-primary-default text-text-primary'
                : 'bg-background-secondary-default text-text-secondary hover:bg-background-secondary-hover'
            )}
          >
            {/* File name */}
            <span className="flex-1 truncate text-sm">
              {tab.dirty && (
                <span className="text-accent-500 mr-1">●</span>
              )}
              {fileName}
            </span>
            
            {/* Close button */}
            <button
              onClick={(e) => handleCloseClick(e, tab.path)}
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
  );
}
