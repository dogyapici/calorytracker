import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Splash, splashScript } from "@/components/splash";
import { ThemeSync } from "@/components/theme-sync";
import { DEFAULT_MODE, THEME, themeScript } from "@/lib/theme";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Kalorientracker", template: "%s · Kalorientracker" },
  description: "Kalorien und Nährwerte einfach erfassen.",
  appleWebApp: { capable: true, title: "Kalorien", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#141312" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${inter.variable} h-full antialiased`}
      data-theme={THEME}
      data-mode={DEFAULT_MODE}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: splashScript }} />
      </head>
      <body className="min-h-full">
        <Splash />
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
