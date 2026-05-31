/**
 * Root layout — wraps every page in the site shell (header + footer) and
 * mounts the Sonner toast viewport. AuthProvider hangs at the top so any
 * descendant can call `useAuth()` without prop-drilling.
 */

import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { AuthHashHandler } from "@/components/auth-hash-handler";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { ConfirmProvider } from "@/components/ui/confirm-modal";
import { PromptProvider } from "@/components/ui/prompt-modal";
import { LANDING_FONT_VARIABLE_CLASSES } from "@/lib/fonts/registry";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CookieBanner } from "@/components/cookie-banner";
import { BackToTop } from "@/components/back-to-top";
import { RouteTransition } from "@/components/motion/route-transition";
import { JsonLd } from "@/components/seo/json-ld";
import { VersionGuard } from "@/components/version-guard";
import { AccountDeletedToast } from "@/components/account-deleted-toast";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TITLE_DEFAULT,
  SITE_TITLE_TEMPLATE,
  SITE_DESCRIPTION,
  SITE_OG_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_OG_LOCALE,
  INDEXABLE,
  OG_IMAGE_PATH,
} from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  // Absolute base for resolving canonical + OG/Twitter image URLs. Derives
  // from site.ts so the whole metadata tree tracks the domain (see the
  // "domain switch" note there).
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE_DEFAULT,
    template: SITE_TITLE_TEMPLATE,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  category: "technology",
  // The CV form never renders user phone/email/addresses as auto-linkable
  // text; turn off Safari's aggressive auto-detection to avoid junk links.
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE_DEFAULT,
    description: SITE_OG_DESCRIPTION,
    url: "/",
    locale: SITE_OG_LOCALE,
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "SlothCV — free CV & resume builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE_DEFAULT,
    description: SITE_OG_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
  // Index production; noindex preview hosts (see site.ts INDEXABLE). The
  // googleBot directives unlock rich snippets + large image previews.
  robots: INDEXABLE
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
        },
      }
    : { index: false, follow: false },
  // Renders a Google Search Console verification <meta> only once the token
  // is set (after the real domain is verified in GSC). No-op until then.
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION }
    : undefined,
  // src/app/{favicon.ico,icon.svg,apple-icon.png} are auto-detected by Next;
  // no manual icons config needed.
};

// CRITICAL FOR MOBILE: without this iOS Safari falls back to its legacy
// 980px viewport — every mobile user sees the site zoomed out with bleed
// past the edges. `viewportFit:"cover"` lets the page extend under the
// notch / dynamic island so we can apply env(safe-area-inset-*) to the
// site header / mobile toggle bars instead of letting iOS reserve gutters
// for us. Tailwind's responsive prefixes (`sm:` etc.) only work after
// the viewport meta tag is present.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Tint the mobile browser chrome to match the page background per scheme,
  // so the address bar blends into the site instead of flashing white/black.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  // Allow user zoom — accessibility requirement (WCAG 1.4.4 Resize Text).
  // Maximum-scale capped only because Safari double-tap-to-zoom can
  // disorient users mid-edit; user pinch-zoom is unrestricted.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${LANDING_FONT_VARIABLE_CLASSES} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
        {/* Self-heals a stale deploy: if this page's HTML was served from a
            browser/proxy cache older than the live build, reload once to the
            current version. No-op for up-to-date clients. See
            src/components/version-guard.tsx. */}
        <VersionGuard />
        {/* schema.org structured data (Organization + WebSite +
            SoftwareApplication). Server-rendered; derives from site.ts. */}
        <JsonLd />
        {/* Provider order matters: Theme outermost so the rest renders with
            the correct colors immediately. Language next so toasts can use
            translated strings. Auth innermost — only data flows through. */}
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              {/* Reads Supabase auth tokens that arrive in the URL #hash
                  (implicit-flow e-mail links) and routes: confirmation →
                  /login?notice=email_confirmed, recovery → /reset-password.
                  detectSessionInUrl is OFF so this is the single place that
                  handles the hash. See rules/auth-link-tokens-in-url-hash.md. */}
              <AuthHashHandler />
              {/* Confirm modal at this level (above Auth, below Theme) so
                  every page can spawn confirmations and the modal still
                  picks up theme tokens. The modal renders its own backdrop
                  at z-[100] so it stacks above any in-page overlay. */}
              <ConfirmProvider>
                <PromptProvider>
                  <SiteHeader />
                  <main className="flex-1">
                    {/* RouteTransition fades + rises content on every
                        navigation. Keyed on pathname so the framer-motion
                        runtime treats each route as a fresh mount — gives
                        the site a "settled" feel without chasing exits. */}
                    <RouteTransition>{children}</RouteTransition>
                  </main>
                  <SiteFooter />
                  <CookieBanner />
                  {/* Back-to-top floating button. Hidden by default;
                      appears only after scrolling past the threshold,
                      so short pages (login, account, editor — where
                      window scroll is 0) never see it. */}
                  <BackToTop />
                  <Toaster richColors position="top-center" />
                  {/* Reads ?deleted=1 (set by the account-deletion hard-nav)
                      and fires the "Konto slettet!" toast post-load, then
                      strips the marker. See rules/account-delete-confirm-toast. */}
                  <AccountDeletedToast />
                </PromptProvider>
              </ConfirmProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
