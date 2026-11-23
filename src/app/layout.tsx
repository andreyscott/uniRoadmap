import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Overpass } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeScript } from "@/components/layout/theme-script";
import { siteConfig } from "@/lib/site";
import "./globals.css";

// Body: designed for legibility (low-vision friendly). Headings: highway-signage lettering.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  // Next has no metric overrides for this family yet, so use a plain system fallback.
  adjustFontFallback: false,
  fallback: ["system-ui", "sans-serif"],
});

const overpass = Overpass({
  variable: "--font-overpass",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name}: find your course, follow the path`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1424" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: ThemeScript adds the `dark` class before React hydrates.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${atkinson.variable} ${overpass.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <AuthProvider>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
