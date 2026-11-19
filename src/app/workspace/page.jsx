"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { WorkspaceProvider, useWorkspace } from "@/contexts/workspace-context";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { ExplorerTabContent } from "@/components/workspace/tabs/explorer-tab";
import { EditorTabContent } from "@/components/workspace/tabs/editor-tab";
import { ImageViewerTabContent } from "@/components/workspace/tabs/image-viewer-tab";
import { TextViewerTabContent } from "@/components/workspace/tabs/text-viewer-tab";
import { PdfViewerTabContent } from "@/components/workspace/tabs/pdf-viewer-tab";
import { ArchiveTabContent } from "@/components/workspace/tabs/archive-tab";
import { QuickOpenModal } from "@/components/workspace/quick-open-modal";
import { Sidebar } from "@/components/layout/sidebar";
import { isSupportedImageFormat } from "@/lib/image/image-utils";
import { useHashRouterContext } from "@/contexts/hash-router-context";
import { RecentView } from "@/components/workspace/views/recent-view";
import { FavoritesView } from "@/components/workspace/views/favorites-view";
import { TrashView } from "@/components/workspace/views/trash-view";
import { SettingsView } from "@/components/workspace/views/settings-view";

/**
 * Renders the active tab's content based on tab type.
 */
function TabContentRenderer() {
  const { activeTab } = useWorkspace();

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary">
        No tab selected
      </div>
    );
  }

  switch (activeTab.type) {
    case "explorer":
      return <ExplorerTabContent tab={activeTab} />;
    case "editor":
      return <EditorTabContent tab={activeTab} />;
    case "image-viewer":
      return <ImageViewerTabContent tab={activeTab} />;
    case "text-viewer":
      return <TextViewerTabContent tab={activeTab} />;
    case "pdf-viewer":
      return <PdfViewerTabContent tab={activeTab} />;
    case "archive":
      return <ArchiveTabContent tab={activeTab} />;
    default:
      return (
        <div className="flex items-center justify-center h-full text-text-secondary">
          Unknown tab type: {activeTab.type}
        </div>
      );
  }
}

/**
 * Main workspace page component.
 * Uses hash router to determine which view to render.
 */
function WorkspaceContent() {
  const { route, isReady } = useHashRouterContext();
  const {
    tabs,
    openTab,
    switchTab,
    switchTabByIndex,
    closeTab,
    activeTabId,
    reopenLastClosed,
  } = useWorkspace();

  const [isQuickOpen, setIsQuickOpen] = useState(false);

  // Handle file selection from quick open
  const handleQuickOpenSelect = useCallback(
    (file) => {
      if (!file || file.type === 'directory') return;

      const ext = file.extension?.toLowerCase();

      // Determine tab type based on file extension
      if (isSupportedImageFormat(ext)) {
        openTab('image-viewer', {
          path: file.path,
          title: file.name,
          state: {
            galleryFiles: [file],
            currentIndex: 0,
          },
        });
      } else if (ext === '.pdf') {
        openTab('pdf-viewer', {
          path: file.path,
          title: file.name,
        });
      } else if (ext === '.txt' || ext === '.md' || ext === '.log' || ext === '.csv') {
        openTab('text-viewer', {
          path: file.path,
          title: file.name,
        });
      } else if (ext === '.zip' || ext === '.tar' || ext === '.gz' || ext === '.7z' || ext === '.rar') {
        openTab('archive', {
          path: file.path,
          title: file.name,
        });
      } else {
        openTab('editor', {
          path: file.path,
          title: file.name,
        });
      }
    },
    [openTab]
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

  // Show loading state until router is ready (prevents hydration mismatch)
  if (!isReady) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  // Render content based on hash route
  const renderContent = () => {
    switch (route.name) {
      case "explorer":
        return (
          <WorkspaceShell>
            <TabContentRenderer />
          </WorkspaceShell>
        );
      case "recent":
        return <RecentView />;
      case "favorites":
        return <FavoritesView />;
      case "trash":
        return <TrashView />;
      case "settings":
        return <SettingsView />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-text-secondary">
            Unknown route: {route.name}
          </div>
        );
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {renderContent()}
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

/**
 * Workspace page with provider wrapper.
 */
export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <div className="text-text-secondary">Loading workspace...</div>
      </div>
    }>
      <WorkspaceProvider>
        <WorkspaceContent />
      </WorkspaceProvider>
    </Suspense>
  );
}
