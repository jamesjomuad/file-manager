"use client";

import { createContext, useContext } from "react";
import { useHashRouter } from "@/hooks/use-hash-router";

/**
 * @typedef {ReturnType<typeof useHashRouter>} HashRouterContextValue
 */

/** @type {import('react').Context<HashRouterContextValue|null>} */
const HashRouterContext = createContext(null);

/**
 * Hash router context provider.
 * Wraps the application and provides hash-based navigation.
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.children
 */
export function HashRouterProvider({ children }) {
  const router = useHashRouter();
  return (
    <HashRouterContext.Provider value={router}>
      {children}
    </HashRouterContext.Provider>
  );
}

/**
 * Access the hash router.
 * Must be used within a HashRouterProvider.
 *
 * @returns {HashRouterContextValue}
 */
export function useHashRouterContext() {
  const ctx = useContext(HashRouterContext);
  if (!ctx) {
    throw new Error("useHashRouterContext must be used within a HashRouterProvider");
  }
  return ctx;
}
