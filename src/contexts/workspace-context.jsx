'use client';

/**
 * Workspace Context - Backward compatibility layer.
 *
 * This file re-exports from the Zustand workspace store.
 * Components using `useWorkspace()` or `WorkspaceProvider` will continue to work.
 *
 * @deprecated Import from `@/stores/workspace-store` directly for new code.
 */

export {
  useWorkspace,
  useWorkspaceStore,
  useActiveTab,
  useActiveTabIndex,
} from '@/stores/workspace-store';

/**
 * WorkspaceProvider - No-op component for backward compatibility.
 *
 * The workspace store is now global and doesn't need a provider.
 * This component simply renders children without any wrapping.
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.children
 */
export function WorkspaceProvider({ children }) {
  return <>{children}</>;
}
