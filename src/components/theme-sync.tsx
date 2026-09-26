"use client";

import { useLayoutEffect } from "react";
import { applyMode, DARK_QUERY } from "@/lib/theme";

// Hält die Theme-Attribute auf <html> aktuell: nach dem Remount im Dev-Modus
// (React setzt dann die Attribute von <html> zurück) und wenn sich bei
// „System“ die Systemeinstellung ändert. Außerdem sperrt es das Zoomen auf iOS.
export function ThemeSync() {
  useLayoutEffect(() => {
    applyMode();
    const query = window.matchMedia(DARK_QUERY);
    query.addEventListener("change", applyMode);
    window.addEventListener("storage", applyMode);
    // iOS Safari ignoriert user-scalable=no; die Pinch-Geste lässt sich nur so abfangen.
    const noZoom = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", noZoom);
    return () => {
      query.removeEventListener("change", applyMode);
      window.removeEventListener("storage", applyMode);
      document.removeEventListener("gesturestart", noZoom);
    };
  }, []);
  return null;
}
