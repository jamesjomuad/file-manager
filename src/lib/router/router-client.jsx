"use client";

import { useMemo } from "react";
import { RouterProvider } from "react-router-dom";
import { createAppRouter } from "@/lib/router/create-router";

/**
 * Inner component that creates and renders the router.
 * This component is only imported/rendered on the client
 * via dynamic import with ssr: false.
 */
function RouterClient() {
  const router = useMemo(() => createAppRouter(), []);
  return <RouterProvider router={router} />;
}

export default RouterClient;
