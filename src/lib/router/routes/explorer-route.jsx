"use client";

import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { ExplorerTabContent } from "@/components/workspace/tabs/explorer-tab";
import { EditorTabContent } from "@/components/workspace/tabs/editor-tab";
import { ImageViewerTabContent } from "@/components/workspace/tabs/image-viewer-tab";
import { TextViewerTabContent } from "@/components/workspace/tabs/text-viewer-tab";
import { PdfViewerTabContent } from "@/components/workspace/tabs/pdf-viewer-tab";
import { MarkdownViewerTabContent } from "@/components/workspace/tabs/markdown-viewer-tab";
import { ArchiveTabContent } from "@/components/workspace/tabs/archive-tab";
import { useWorkspace } from "@/contexts/workspace-context";

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
    case "markdown-viewer":
      return <MarkdownViewerTabContent tab={activeTab} />;
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
 * Explorer route component.
 *
 * Renders the workspace shell with the tabbed interface.
 * Reads the folder path from the URL splat parameter and navigates to it.
 *
 * URL format: #/explorer or #/explorer/folder/subfolder
 */
export function ExplorerRoute() {
  const params = useParams();
  const { navigateExplorer } = useWorkspace();

  // Extract the folder path from the splat parameter
  // React Router v7 splat param: "*" contains the rest of the path
  const splatPath = params["*"] || "";
  // Decode the path (each segment is URL-encoded)
  const folderPath = splatPath
    ? splatPath.split("/").map(decodeURIComponent).join("/")
    : "";

  // Navigate to the folder when the route loads with a path
  useEffect(() => {
    if (folderPath) {
      navigateExplorer(folderPath);
    }
  }, [folderPath, navigateExplorer]);

  return (
    <WorkspaceShell>
      <TabContentRenderer />
    </WorkspaceShell>
  );
}
