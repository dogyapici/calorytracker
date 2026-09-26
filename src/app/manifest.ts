import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kalorientracker",
    short_name: "Kalorien",
    description: "Kalorien und Nährwerte einfach erfassen.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#2f6b4f",
    lang: "de",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
