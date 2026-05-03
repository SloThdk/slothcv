/**
 * Root layout — wraps every page in the site shell (header + footer) and
 * mounts the Sonner toast viewport. AuthProvider hangs at the top so any
 * descendant can call `useAuth()` without prop-drilling.
 */

import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { ConfirmProvider } from "@/components/ui/confirm-modal";
import { PromptProvider } from "@/components/ui/prompt-modal";
import { ALL_FONT_VARIABLE_CLASSES } from "@/lib/fonts/registry";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CookieBanner } from "@/components/cookie-banner";
import { BackToTop } from "@/components/back-to-top";
import { RouteTransition } from "@/components/motion/route-transition";
import "./globals.css";

export const metadata: Metadata = {
  title: "SlothCV — free, beautiful CVs",
  description:
    "Free, beautiful CVs. No signup walls, no watermarks. Drag, drop, design. Export to PDF.",
  openGraph: {
    title: "SlothCV",
    description: "Free, beautiful CVs. No signup walls, no watermarks.",
    type: "website",
  },
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
    <html lang="en" className={`${ALL_FONT_VARIABLE_CLASSES} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
        {/* Provider order matters: Theme outermost so the rest renders with
            the correct colors immediately. Language next so toasts can use
            translated strings. Auth innermost — only data flows through. */}
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
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
                </PromptProvider>
              </ConfirmProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
