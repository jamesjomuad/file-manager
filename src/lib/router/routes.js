"use client";

import { lazy } from "react";

// Lazy-loaded route components
const ExplorerRoute = lazy(() =>
  import("@/lib/router/routes/explorer-route").then((m) => ({
    default: m.ExplorerRoute,
  }))
);

const InsightsRoute = lazy(() =>
  import("@/lib/router/routes/insights-route").then((m) => ({
    default: m.InsightsRoute,
  }))
);

const RecentView = lazy(() =>
  import("@/components/workspace/views/recent-view").then((m) => ({
    default: m.RecentView,
  }))
);

const FavoritesView = lazy(() =>
  import("@/components/workspace/views/favorites-view").then((m) => ({
    default: m.FavoritesView,
  }))
);

const TrashView = lazy(() =>
  import("@/components/workspace/views/trash-view").then((m) => ({
    default: m.TrashView,
  }))
);

const SettingsView = lazy(() =>
  import("@/components/workspace/views/settings-view").then((m) => ({
    default: m.SettingsView,
  }))
);

const AppearanceSettings = lazy(() =>
  import("@/lib/router/routes/appearance-settings").then((m) => ({
    default: m.AppearanceSettings,
  }))
);

const NotFoundView = lazy(() =>
  import("@/lib/router/routes/not-found-route").then((m) => ({
    default: m.NotFoundView,
  }))
);

/**
 * Centralized route configuration for the File Manager application.
 *
 * Uses React Router's hash-based routing (createHashRouter).
 * All routes are relative to the hash fragment (e.g., #/explorer).
 *
 * Route structure:
 * /              → Insights (dashboard with instant + scan-based analytics)
 * /explorer      → File Explorer (root)
 * /explorer/*    → File Explorer with folder path (splat param)
 * /recent        → Recent files
 * /favorites     → Favorites
 * /trash         → Trash
 * /settings      → Settings (default section)
 * /settings/appearance → Appearance settings
 * *              → Not found → redirect to /explorer
 */
export const routeConfig = [
  {
    path: "/",
    element: <InsightsRoute />,
    handle: { name: "insights", label: "Insights" },
  },
  {
    path: "/explorer",
    element: <ExplorerRoute />,
    handle: { name: "files", label: "Explore" },
  },
  {
    path: "/explorer/*",
    element: <ExplorerRoute />,
    handle: { name: "files", label: "Explore" },
  },
  {
    path: "/recent",
    element: <RecentView />,
    handle: { name: "recent", label: "Recent" },
  },
  {
    path: "/favorites",
    element: <FavoritesView />,
    handle: { name: "favorites", label: "Favorites" },
  },
  {
    path: "/trash",
    element: <TrashView />,
    handle: { name: "trash", label: "Trash" },
  },
  {
    path: "/settings",
    element: <SettingsView />,
    handle: { name: "settings", label: "Settings" },
  },
  {
    path: "/settings/appearance",
    element: <AppearanceSettings />,
    handle: { name: "settings", label: "Settings", section: "appearance" },
  },
  {
    path: "*",
    element: <NotFoundView />,
  },
];
