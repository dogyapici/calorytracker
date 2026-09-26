import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeSync } from "@/components/theme-sync";
import { DEFAULT_MODE, DEFAULT_THEME, themeScript } from "@/lib/theme";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Kalorientracker", template: "%s · Kalorientracker" },
  description: "Kalorien und Nährwerte einfach erfassen.",
  appleWebApp: { capable: true, title: "Kalorien", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${inter.variable} h-full antialiased`}
      data-theme={DEFAULT_THEME}
      data-mode={DEFAULT_MODE}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
