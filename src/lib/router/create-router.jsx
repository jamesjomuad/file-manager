"use client";

import { createHashRouter } from "react-router-dom";
import { routeConfig } from "./routes";
import { AppLayout } from "./app-layout";

/**
 * Create the application's hash router.
 *
 * Uses React Router's createHashRouter for hash-based URLs (#/explorer, #/recent, etc.).
 * All routes are nested under a layout route that provides the sidebar and content area.
 *
 * @returns {import('react-router-dom').Router} The router instance
 */
export function createAppRouter() {
  return createHashRouter([
    {
      element: <AppLayout />,
      children: routeConfig,
    },
  ]);
}
