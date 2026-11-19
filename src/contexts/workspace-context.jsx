"use client";

import { createContext, useContext } from "react";
import { useWorkspaceTabs } from "@/hooks/use-workspace-tabs";

/**
 * @typedef {ReturnType<typeof useWorkspaceTabs>} WorkspaceContextValue
 */

/** @type {import('react').Context<WorkspaceContextValue|null>} */
const WorkspaceContext = createContext(null);

/**
 * Workspace context provider.
 * Wraps the application and provides centralized tab management.
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.children
 */
export function WorkspaceProvider({ children }) {
  const workspace = useWorkspaceTabs();
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * Access the workspace tab manager.
 * Must be used within a WorkspaceProvider.
 *
 * @returns {WorkspaceContextValue}
 */
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
