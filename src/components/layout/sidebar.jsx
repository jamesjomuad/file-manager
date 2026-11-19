"use client";

import Link from "next/link";
import { cx } from "@/utils/cx";
import {
  RiFolderLine,
  RiTimeLine,
  RiStarLine,
  RiSettings3Line,
} from "@remixicon/react";

/**
 * Sidebar navigation component
 * @param {Object} props
 * @param {string} props.currentPath - Current route path for highlighting active item
 */
export function Sidebar({ currentPath = "/files" }) {
  const navItems = [
    { label: "Files", href: "/files", icon: RiFolderLine },
    { label: "Recent", href: "/files?view=recent", icon: RiTimeLine },
    { label: "Favorites", href: "/files?view=favorites", icon: RiStarLine },
    { label: "Settings", href: "/settings", icon: RiSettings3Line },
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
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
