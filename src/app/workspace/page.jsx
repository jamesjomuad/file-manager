"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Router uses createHashRouter which accesses `document`,
// so it must only run on the client.
const RouterClient = dynamic(
  () => import("@/lib/router/router-client"),
  { ssr: false }
);

/**
 * Workspace page.
 *
 * Architecture:
 * - Next.js serves this page at /workspace
 * - Zustand stores manage state (no providers needed)
 * - React Router (hash mode) manages client-side navigation
 * - Hash URLs: #/explorer, #/recent, #/favorites, #/trash, #/settings
 */
export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="text-text-secondary">Loading workspace...</div>
        </div>
      }
    >
      <RouterClient />
    </Suspense>
  );
}
