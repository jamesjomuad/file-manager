"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/sidebar";
import { QuickOpenModal } from "@/components/workspace/quick-open-modal";
import { useWorkspace } from "@/contexts/workspace-context";
import { isSupportedImageFormat } from "@/lib/image/image-utils";
import { isBrowsableArchive } from "@/lib/archive/formats";

/**
 * Application layout component.
 *
 * Provides the sidebar, main content area (via Outlet), and quick open modal.
 * This is the layout route for all application routes.
 */
export function AppLayout() {
  const { openTab, tabs, activeTabId, switchTab, switchTabByIndex, closeTab, reopenLastClosed } =
    useWorkspace();
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const navigate = useNavigate();

  /**
   * Handle file selection from quick open.
   * Opens the appropriate workspace tab based on file type.
   */
  const handleQuickOpenSelect = useCallback(
    (file) => {
      if (!file || file.type === "directory") {
        // Navigate to explorer for directories
        if (file?.path) {
          navigate(`/explorer/${file.path.split(/[\\/]/).map(encodeURIComponent).join("/")}`);
        }
        return;
      }

      const ext = file.extension?.toLowerCase();

      if (isSupportedImageFormat(ext)) {
        openTab("image-viewer", { path: file.path, title: file.name });
      } else if (ext === ".pdf") {
        openTab("pdf-viewer", { path: file.path, title: file.name });
      } else if ([".md", ".markdown"].includes(ext)) {
        openTab("markdown-viewer", { path: file.path, title: file.name });
      } else if ([".txt", ".log", ".csv"].includes(ext)) {
        openTab("text-viewer", { path: file.path, title: file.name });
      } else if (isBrowsableArchive(ext, file.name)) {
        openTab("archive", { path: file.path, title: file.name });
      } else {
        openTab("editor", { path: file.path, title: file.name });
      }
    },
    [openTab, navigate]
  );

  // Workspace-level keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMod = e.ctrlKey || e.metaKey;
      const isInput =
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.classList.contains("monaco-editor");

      if (isInput && !(isMod && (e.key === "w" || e.key === "W" || e.key === "Tab"))) {
        return;
      }

      // Ctrl+1 through Ctrl+9 — Activate tab by position
      if (isMod && !e.shiftKey && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        switchTabByIndex(idx);
        return;
      }

      // Ctrl+Tab — Next tab
      if (isMod && e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const currentIdx = tabs.findIndex((t) => t.id === activeTabId);
        const nextIdx = (currentIdx + 1) % tabs.length;
        switchTabByIndex(nextIdx);
        return;
      }

      // Ctrl+Shift+Tab — Previous tab
      if (isMod && e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        const currentIdx = tabs.findIndex((t) => t.id === activeTabId);
        const prevIdx = currentIdx <= 0 ? tabs.length - 1 : currentIdx - 1;
        switchTabByIndex(prevIdx);
        return;
      }

      // Ctrl+W — Close active tab
      if (isMod && !e.shiftKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
        return;
      }

      // Ctrl+Shift+T — Reopen recently closed tab
      if (isMod && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        reopenLastClosed();
        return;
      }

      // Ctrl+P — Quick file search
      if (isMod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setIsQuickOpen(true);
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [tabs, activeTabId, switchTab, switchTabByIndex, closeTab, reopenLastClosed]);

  return (
    <div className="flex h-full gap-2 p-2">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col rounded-3xl bg-background-primary-default shadow-card overflow-hidden">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-text-secondary">Loading...</div>
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>

      {/* Quick open modal */}
      <QuickOpenModal
        isOpen={isQuickOpen}
        onClose={() => setIsQuickOpen(false)}
        onSelect={handleQuickOpenSelect}
      />
    </div>
  );
}
