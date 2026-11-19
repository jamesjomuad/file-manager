"use client";

import Link from "next/link";
import { cx } from "@/utils/cx";
import { useFavorites } from "@/hooks/use-favorites";
import { useRecentFiles } from "@/hooks/use-recent-files";
import { useState, useEffect } from "react";
import {
  RiFolderLine,
  RiTimeLine,
  RiStarLine,
  RiSettings3Line,
  RiDeleteBinLine,
} from "@remixicon/react";

/**
 * Count badge shown next to a sidebar nav item.
 * @param {Object} props
 * @param {number} props.count - Number to display
 */
function CountBadge({ count }) {
  if (!count) return null;
  return (
    <span className="ms-auto text-caption-1-semibold text-text-tertiary bg-background-secondary-hover rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * Sidebar navigation component
 * @param {Object} props
 * @param {string} props.currentPath - Current route path for highlighting active item
 */
export function Sidebar({ currentPath = "/files" }) {
  const { favorites } = useFavorites();
  const { recentFiles } = useRecentFiles();
  const [trashCount, setTrashCount] = useState(0);

  // Fetch trash count
  useEffect(() => {
    const fetchTrashCount = async () => {
      try {
        const response = await fetch("/api/trash");
        if (response.ok) {
          const data = await response.json();
          setTrashCount(data.data?.length || 0);
        }
      } catch (error) {
        console.error("Error fetching trash count:", error);
      }
    };

    fetchTrashCount();
    // Refresh trash count every 30 seconds
    const interval = setInterval(fetchTrashCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { label: "Files", href: "/files", icon: RiFolderLine, count: null },
    { label: "Favorites", href: "/favorites", icon: RiStarLine, count: favorites.length },
    { label: "Recent", href: "/recent", icon: RiTimeLine, count: recentFiles.length },
    { label: "Trash", href: "/trash", icon: RiDeleteBinLine, count: trashCount },
    { label: "Settings", href: "/settings", icon: RiSettings3Line, count: null },
  ];

  const isActive = (href) => {
    if (href.includes("?")) {
      return currentPath.startsWith(href.split("?")[0]);
    }
    return currentPath === href;
  };

  return (
    <aside className="w-56 shrink-0 bg-background-secondary-default border-e border-separator-border flex flex-col h-full">
      {/* App Title */}
      <div className="p-4 border-b border-separator-border">
        <div className="flex items-center gap-2">
          <RiFolderLine className="size-5 text-accent-500" aria-hidden />
          <span className="text-title-3-semibold text-text-primary">
            File Manager
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-body-medium transition-colors",
                active
                  ? "bg-background-secondary-hover text-text-primary"
                  : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span>{item.label}</span>
              <CountBadge count={item.count} />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
