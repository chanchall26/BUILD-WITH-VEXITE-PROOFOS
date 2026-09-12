import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { APP, isDemoMode } from "@/lib/config";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
/** The brand voice: wordmark, navigation and headlines. Body text stays Geist. */
const display = Space_Grotesk({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
/** The hero headline only. Louder than the brand voice, used once per page. */
const hero = Bricolage_Grotesque({
  variable: "--font-hero-face",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: { default: `${APP.name} — ${APP.tagline}`, template: `%s · ${APP.name}` },
  description: APP.pitch,
  applicationName: APP.name,
  openGraph: {
    title: `${APP.name} — ${APP.tagline}`,
    description: APP.pitch,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#070912" },
  ],
  width: "device-width",
  initialScale: 1,
};

/**
 * Applies the saved theme before the first paint. Without this the page
 * renders light and then flips, which is the single most noticeable thing a
 * theme toggle can get wrong.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("proofos.theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${hero.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-signal focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-on-signal"
        >
          Skip to content
        </a>
        <ToastProvider>
          <SiteHeader demoMode={isDemoMode()} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
