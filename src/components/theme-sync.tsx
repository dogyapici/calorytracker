"use client";

import { useLayoutEffect } from "react";
import { applyTheme, DARK_QUERY } from "@/lib/theme";

// Hält die Theme-Attribute auf <html> aktuell: nach dem Remount im Dev-Modus
// (React setzt dann die Attribute von <html> zurück) und wenn sich bei
// „System“ die Systemeinstellung ändert.
export function ThemeSync() {
  useLayoutEffect(() => {
    applyTheme();
    const query = window.matchMedia(DARK_QUERY);
    query.addEventListener("change", applyTheme);
    window.addEventListener("storage", applyTheme);
    return () => {
      query.removeEventListener("change", applyTheme);
      window.removeEventListener("storage", applyTheme);
    };
  }, []);
  return null;
}
