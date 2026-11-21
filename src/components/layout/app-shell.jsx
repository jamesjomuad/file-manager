"use client";

import { cx } from "@/utils/cx";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

/**
 * Main application shell wrapper
 * @param {Object} props
 * @param {import('react').ReactNode} props.children - Page content
 * @param {string} props.path - Current file path for breadcrumb
 * @param {'grid'|'list'} props.viewMode - Current view mode
 * @param {(mode: 'grid'|'list') => void} props.onViewModeChange - View mode change callback
 * @param {(path: string) => void} props.onNavigate - Navigation callback
 */
export function AppShell({
  children,
  path,
  viewMode,
  onViewModeChange,
  onNavigate,
}) {
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <Header
          path={path}
          onNavigate={onNavigate}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />

        {/* Page content */}
        <main className="flex-1 min-h-0 flex flex-col overflow-auto bg-background-primary-default">
          {children}
        </main>
      </div>
    </div>
  );
}
