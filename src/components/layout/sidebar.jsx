"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import {
  RiFolderLine,
  RiTimeLine,
  RiStarLine,
  RiBarChartLine,
  RiDeleteBinLine,
  RiSettings3Line,
  RiSearchLine,
  RiSideBarFill,
} from "@remixicon/react";
import { cx } from "@/utils/cx";
import { Counter } from "@/components/base/badges/counter";
import { Kbd } from "@/components/base/kbd/kbd";
import { CloseButton } from "@/components/base/buttons/close-button";
import { useFavorites } from "@/hooks/use-favorites";
import { useRecentFiles } from "@/hooks/use-recent-files";
import { useTrashStore } from "@/stores/trash-store";

/**
 * Collapsible text/badge slot: blurs + fades + shrinks away when the rail
 * closes, and blurs back in on expand. Based on BoardUI DashboardSidebar.
 *
 * @param {Object} props
 * @param {boolean} props.collapsed
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.className]
 */
function Collapsible({ collapsed, children, className }) {
  return (
    <span
      className={cx(
        "flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,filter] duration-300 ease-in-out",
        collapsed
          ? "max-w-0 opacity-0 blur-[3px]"
          : "max-w-full opacity-100 blur-0",
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Sidebar navigation item with subtle active indication.
 *
 * Active state uses a tinted background (background-selection token) +
 * accent-colored icon/text instead of a bold filled gradient. This creates
 * clear but restrained visual hierarchy appropriate for a file manager.
 *
 * @param {Object} props
 * @param {import('react').ComponentType<{className?: string, 'aria-hidden'?: boolean}>} props.icon
 * @param {string} props.label
 * @param {import('react').ReactNode} [props.badge]
 * @param {boolean} [props.isSelected]
 * @param {boolean} [props.collapsed]
 * @param {string} props.to - React Router link target
 */
function NavItem({ icon: Icon, label, badge, isSelected = false, collapsed = false, to }) {
  return (
    <NavLink
      to={to}
      aria-current={isSelected ? "page" : undefined}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={cx(
        "group flex items-center justify-between overflow-hidden rounded-2lg px-2 py-1.5",
        "transition-colors duration-150 ease-in-out",
        "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-1",
        collapsed ? "w-9 justify-center" : "w-full",
        isSelected
          ? "bg-background-selection"
          : "hover:bg-background-secondary-hover"
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon
          className={cx(
            "size-[18px] shrink-0 transition-colors duration-150",
            isSelected
              ? "text-foreground-icon-accent"
              : "text-foreground-icon-secondary group-hover:text-foreground-icon-primary"
          )}
          aria-hidden
        />
        <Collapsible collapsed={collapsed}>
          <span
            className={cx(
              "text-body-medium whitespace-nowrap transition-colors duration-150",
              isSelected ? "text-text-primary" : "text-text-secondary"
            )}
          >
            {label}
          </span>
        </Collapsible>
      </span>
      {badge && <Collapsible collapsed={collapsed}>{badge}</Collapsible>}
    </NavLink>
  );
}

/**
 * Section label — visually subordinate heading for navigation groups.
 * Uses caption-1 semibold with tertiary color and uppercase tracking.
 *
 * @param {Object} props
 * @param {string} props.children
 * @param {boolean} [props.collapsed]
 */
function SectionLabel({ children, collapsed }) {
  if (collapsed) return null;
  return (
    <span className="px-2 text-caption-1-semibold uppercase tracking-wider text-text-tertiary select-none">
      {children}
    </span>
  );
}

/**
 * Workspace navigation items
 */
const WORKSPACE_NAV_ITEMS = [
  { key: "files", label: "My Files", icon: RiFolderLine, to: "/explorer" },
  { key: "recent", label: "Recent", icon: RiTimeLine, to: "/recent", countKey: "recent" },
  { key: "favorites", label: "Favorites", icon: RiStarLine, to: "/favorites", countKey: "favorites" },
  { key: "insights", label: "Insights", icon: RiBarChartLine, to: "/" },
];

/**
 * Bottom utility navigation items (anchored to sidebar footer)
 */
const UTILITY_NAV_ITEMS = [
  { key: "trash", label: "Trash", icon: RiDeleteBinLine, to: "/trash", countKey: "trash" },
  { key: "settings", label: "Settings", icon: RiSettings3Line, to: "/settings" },
];

/**
 * Determine the selected nav key from the current location pathname.
 * @param {string} pathname
 * @returns {string}
 */
function getSelectedKey(pathname) {
  if (pathname === "/" || pathname === "") return "insights";
  if (pathname.startsWith("/explorer")) return "files";
  if (pathname.startsWith("/recent")) return "recent";
  if (pathname.startsWith("/favorites")) return "favorites";
  if (pathname.startsWith("/trash")) return "trash";
  if (pathname.startsWith("/settings")) return "settings";
  return "insights";
}

/**
 * BoardUI-based sidebar navigation component.
 *
 * Uses the floating dashboard sidebar pattern from BoardUI with improvements:
 * - Floating panel with rounded corners, shadow, and border
 * - Collapsible rail (260px expanded, 60px collapsed)
 * - Subtle active state: background-selection tint + accent icon (not bold gradient)
 * - Section grouping: "WORKSPACE" label above main nav, separator before utility nav
 * - Labels animate with blur + fade on collapse
 * - Quick search with Cmd/Ctrl+L shortcut
 * - Utility items (Trash, Settings) anchored to bottom with visual separator
 * - Counter badges only shown when count > 0
 *
 * @param {Object} props
 * @param {string} [props.className]
 */
export function Sidebar({ className }) {
  const location = useLocation();
  const selectedKey = getSelectedKey(location.pathname);

  const { favorites } = useFavorites();
  const { recentFiles } = useRecentFiles();
  const trashCount = useTrashStore((s) => s.count);

  // Collapsed state
  const [collapsed, setCollapsed] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [query, setQuery] = useState("");
  const searchTriggerRef = useRef(null);
  const searchFieldRef = useRef(null);
  const searchInputRef = useRef(null);

  // Periodically refresh trash count
  useEffect(() => {
    const refreshTrash = () => useTrashStore.getState().refresh();
    const interval = setInterval(refreshTrash, 30000);
    return () => clearInterval(interval);
  }, []);

  // Count badge lookup
  const counts = {
    recent: recentFiles.length,
    favorites: favorites.length,
    trash: trashCount,
  };

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = (label) => label.toLocaleLowerCase().includes(normalizedQuery);
  const secondaryMatch = UTILITY_NAV_ITEMS.some((item) => matches(item.label));

  const activateSearch = useCallback(() => {
    setCollapsed(false);
    setSearchActive(true);
  }, []);

  const deactivateSearch = useCallback((restoreFocus) => {
    setQuery("");
    setSearchActive(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => searchTriggerRef.current?.focus());
    }
  }, []);

  // Auto-focus search input when activated
  useEffect(() => {
    if (!searchActive) return;
    const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [searchActive]);

  // Close search on outside click
  useEffect(() => {
    if (!searchActive) return;
    const onOutsideClick = (event) => {
      const target = event.target;
      if (target instanceof Node && searchFieldRef.current?.contains(target)) return;
      deactivateSearch(false);
    };
    document.addEventListener("click", onOutsideClick);
    return () => document.removeEventListener("click", onOutsideClick);
  }, [deactivateSearch, searchActive]);

  // Cmd/Ctrl+L keyboard shortcut for search
  useEffect(() => {
    const onShortcut = (event) => {
      if (event.key.toLocaleLowerCase() === "l" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        activateSearch();
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [activateSearch]);

  /**
   * Filter nav items by search query
   */
  const filteredWorkspaceItems = WORKSPACE_NAV_ITEMS.filter((item) =>
    matches(item.label)
  );
  const filteredUtilityItems = UTILITY_NAV_ITEMS.filter((item) =>
    matches(item.label)
  );

  /**
   * Render a nav item with an optional count badge (only shown when count > 0)
   */
  const renderNavItem = (item) => {
    const isSelected = selectedKey === item.key;
    const count = item.countKey ? counts[item.countKey] : 0;
    return (
      <NavItem
        key={item.key}
        icon={item.icon}
        label={item.label}
        to={item.to}
        isSelected={isSelected}
        collapsed={collapsed}
        badge={
          count > 0 ? (
            <Counter color={isSelected ? "primary" : "neutral"}>
              {count > 99 ? "99+" : count}
            </Counter>
          ) : undefined
        }
      />
    );
  };

  return (
    <aside
      className={cx(
        "flex h-full shrink-0 flex-col justify-between overflow-hidden",
        "rounded-3xl bg-background-secondary-default shadow-sidebar",
        "transition-[width] duration-300 ease-in-out",
        collapsed
          ? "w-[60px] px-[11px] py-3"
          : "w-[260px] p-3",
        className
      )}
    >
      {/* Scrollable top section */}
      <div
        className="-m-2 flex min-h-0 w-[calc(100%+16px)] flex-col gap-3 overflow-y-auto p-2 [scrollbar-width:none]"
      >
        {/* Header: Brand + collapse toggle */}
        <div
          className={cx(
            "flex w-full transition-[gap] duration-300 ease-in-out",
            collapsed
              ? "flex-col-reverse items-start justify-center gap-2.5"
              : "flex-row items-center justify-between"
          )}
        >
          {/* Brand / app name — compact treatment */}
          <div
            className={cx(
              "-m-2 min-w-0 overflow-hidden p-2 transition-[max-width,opacity,transform] duration-300 ease-in-out",
              "max-w-[206px] scale-100 opacity-100"
            )}
          >
            <div className="flex items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-500">
                <RiFolderLine className="size-3.5 text-white" aria-hidden />
              </div>
              <Collapsible collapsed={collapsed}>
                <span className="text-body-semibold whitespace-nowrap text-text-primary">
                  File Manager
                </span>
              </Collapsible>
            </div>
          </div>

          {/* Collapse toggle button */}
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={() => {
              const isExpanding = collapsed;
              if (!isExpanding) deactivateSearch(false);
              setCollapsed(!collapsed);
            }}
            className={cx(
              "cursor-pointer rounded-md p-1 text-foreground-icon-secondary transition-colors duration-150",
              "hover:bg-background-secondary-hover hover:text-foreground-icon-primary",
              "focus-visible:ring-2 focus-visible:ring-border-focus-ring outline-none",
              collapsed && "flex w-9 items-center justify-center"
            )}
          >
            <RiSideBarFill
              className={cx(
                "size-[18px] transition-transform duration-300 ease-in-out",
                collapsed
                  ? "rtl:-scale-x-100"
                  : "-scale-x-100 rtl:scale-x-100"
              )}
              aria-hidden
            />
          </button>
        </div>

        <div className="flex w-full flex-col gap-3">
          {/* Quick search */}
          {searchActive && !collapsed ? (
            <div
              ref={searchFieldRef}
              className="flex w-full items-center gap-2 rounded-full bg-background-tertiary-default py-2 pe-2.5 ps-2 ring-2 ring-inset ring-border-button-active transition-[background-color,box-shadow] duration-[var(--input-transition-ms)] ease"
            >
              <RiSearchLine
                className="size-[18px] shrink-0 text-foreground-icon-secondary"
                aria-hidden
              />
              <input
                ref={searchInputRef}
                type="search"
                aria-label="Filter sidebar navigation"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    deactivateSearch(true);
                  }
                }}
                placeholder="Search navigation…"
                className="min-w-0 flex-1 bg-transparent text-body-medium text-text-primary outline-none placeholder:text-text-tertiary"
              />
              <CloseButton
                size="2xs"
                aria-label="Clear navigation search"
                onClick={() => deactivateSearch(true)}
                className="bg-background-tertiary-hover"
              />
            </div>
          ) : (
            <button
              ref={searchTriggerRef}
              type="button"
              aria-label="Quick Search"
              title={collapsed ? "Quick Search" : undefined}
              onClick={activateSearch}
              className={cx(
                "flex cursor-pointer items-center gap-2 rounded-full p-2",
                "text-text-secondary hover:bg-background-tertiary-hover/55",
                "transition-[width,border-radius,background-color] duration-300 ease-in-out",
                collapsed
                  ? "w-9 justify-center bg-background-tertiary-default"
                  : "w-full bg-background-tertiary-default"
              )}
            >
              <span className={cx("flex min-w-0 items-center gap-2", !collapsed && "flex-1")}>
                <RiSearchLine
                  className="size-[18px] shrink-0 text-foreground-icon-secondary"
                  aria-hidden
                />
                <Collapsible collapsed={collapsed}>
                  <span className="text-body-medium whitespace-nowrap text-text-secondary">
                    Quick Search
                  </span>
                </Collapsible>
              </span>
              <Collapsible collapsed={collapsed}>
                <Kbd>⌘L</Kbd>
              </Collapsible>
            </button>
          )}

          {/* Workspace section */}
          <div className="flex w-full flex-col gap-1">
            {/* Section label — hidden when collapsed */}
            <Collapsible collapsed={collapsed}>
              <SectionLabel>Workspace</SectionLabel>
            </Collapsible>

            {/* Primary navigation */}
            <nav className={cx("flex w-full flex-col gap-0.5", !collapsed && "px-0.5")}>
              {!collapsed && filteredWorkspaceItems.length === 0 && !secondaryMatch ? (
                <p className="px-2 py-3 text-body-regular text-text-tertiary">
                  No results
                </p>
              ) : (
                filteredWorkspaceItems.map(renderNavItem)
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom section: Utility nav */}
      <div className="flex w-full shrink-0 flex-col gap-1.5">
        {/* Visual separator */}
        <div className="mx-2 h-px bg-separator-border" />

        {/* Utility navigation (Trash + Settings) */}
        <nav className={cx("flex w-full flex-col gap-0.5", !collapsed && "px-0.5")}>
          {filteredUtilityItems.map(renderNavItem)}
        </nav>
      </div>
    </aside>
  );
}
