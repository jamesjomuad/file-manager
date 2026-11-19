'use client';

import { useEffect, useRef } from 'react';
import { cx } from '@/utils/cx';
import {
  RiCloseLine,
  RiCloseCircleLine,
  RiSubtractLine,
  RiFileCopyLine,
} from '@remixicon/react';

/**
 * Context menu for tab actions (right-click on a tab).
 *
 * Displays at the mouse coordinates where the context menu was triggered
 * and offers options to close the target tab, close others, close all,
 * or copy the file path.
 *
 * @param {Object} props
 * @param {{ x: number, y: number }|null} props.position - Menu position (null = hidden)
 * @param {number|null} props.tabIndex - Index of the tab being acted on
 * @param {string|null} props.tabPath - File path of the tab being acted on
 * @param {() => void} props.onClose - Close callback
 * @param {(index: number) => void} props.onCloseTab - Close single tab
 * @param {(index: number) => void} props.onCloseOthers - Close other tabs
 * @param {() => void} props.onCloseAll - Close all tabs
 */
export function TabContextMenu({
  position,
  tabIndex,
  tabPath,
  onClose,
  onCloseTab,
  onCloseOthers,
  onCloseAll,
}) {
  const menuRef = useRef(null);

  // Close on click outside or Escape
  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Defer listener attachment to avoid the triggering contextmenu event
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [position, onClose]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (!position || !menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    if (position.x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 8;
    }
    if (position.y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 8;
    }

    menuRef.current.style.left = `${adjustedX}px`;
    menuRef.current.style.top = `${adjustedY}px`;
  }, [position]);

  if (!position || tabIndex === null) return null;

  /**
   * Run a tab action and close the menu.
   * @param {() => void} action
   */
  const handleAction = (action) => {
    action();
    onClose();
  };

  /**
   * Copy the tab's file path to the clipboard.
   */
  const handleCopyPath = () => {
    if (tabPath) {
      navigator.clipboard.writeText(tabPath).catch(() => {
        // Fallback: ignore if clipboard API is unavailable
      });
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className={cx(
        'fixed z-50 min-w-[180px] py-1 rounded-xl',
        'bg-background-primary-default border border-border-button-default',
        'shadow-lg'
      )}
      style={{ left: position.x, top: position.y }}
      role="menu"
    >
      <button
        onClick={() => handleAction(() => onCloseTab(tabIndex))}
        className={cx(
          'w-full px-3 py-2 flex items-center gap-3 text-start',
          'text-body-regular text-text-primary',
          'hover:bg-background-secondary-hover transition-colors'
        )}
        role="menuitem"
      >
        <RiCloseLine className="w-4 h-4 text-foreground-icon-secondary" />
        <span>Close</span>
      </button>

      <button
        onClick={() => handleAction(() => onCloseOthers(tabIndex))}
        className={cx(
          'w-full px-3 py-2 flex items-center gap-3 text-start',
          'text-body-regular text-text-primary',
          'hover:bg-background-secondary-hover transition-colors'
        )}
        role="menuitem"
      >
        <RiSubtractLine className="w-4 h-4 text-foreground-icon-secondary" />
        <span>Close Others</span>
      </button>

      <button
        onClick={() => handleAction(() => onCloseAll())}
        className={cx(
          'w-full px-3 py-2 flex items-center gap-3 text-start',
          'text-body-regular text-text-primary',
          'hover:bg-background-secondary-hover transition-colors'
        )}
        role="menuitem"
      >
        <RiCloseCircleLine className="w-4 h-4 text-foreground-icon-secondary" />
        <span>Close All</span>
      </button>

      {tabPath && (
        <>
          <div className="my-1 border-t border-separator-border" />

          <button
            onClick={handleCopyPath}
            className={cx(
              'w-full px-3 py-2 flex items-center gap-3 text-start',
              'text-body-regular text-text-primary',
              'hover:bg-background-secondary-hover transition-colors'
            )}
            role="menuitem"
          >
            <RiFileCopyLine className="w-4 h-4 text-foreground-icon-secondary" />
            <span>Copy Path</span>
          </button>
        </>
      )}
    </div>
  );
}
