"use client";

import { useEffect } from "react";
import { initSystemPreferenceListener } from "@/stores/settings-store";

/**
 * Client component that initializes Zustand store listeners.
 * Must be rendered once in the root layout.
 */
export function StoreInitializer() {
  useEffect(() => {
    initSystemPreferenceListener();
  }, []);

  return null;
}
