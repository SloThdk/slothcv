/**
 * CookieBanner — minimal informational notice shown at the bottom of every
 * page on the user's first visit.
 *
 * Why this is short and has no consent buttons:
 *   slothcv only sets cookies that are *strictly necessary* for the
 *   service the user explicitly requested — Supabase auth-session cookies
 *   (so signing in survives a refresh). Theme + language preferences live
 *   in `localStorage`, not cookies. There are no analytics, no advertising
 *   pixels, no third-party trackers. Under ePrivacy / GDPR, "strictly
 *   necessary" cookies do not require consent — only transparency. So the
 *   banner is a one-time disclosure with a "Got it" dismiss + a link to
 *   the privacy page, not a consent dialog.
 *
 * Storage:
 *   Dismissal state lives in localStorage under `slothcv.cookies.acked`
 *   so the banner re-shows in private/incognito sessions but stays hidden
 *   for returning visitors. We never set a cookie to remember dismissal —
 *   that would be ironic.
 *
 * Hydration safety:
 *   The first server-rendered HTML emits nothing (banner === null) so
 *   there is no flash-of-banner / mismatch. After the first client effect
 *   reads localStorage we toggle visibility. Same pattern as the language
 *   provider.
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const STORAGE_KEY = "slothcv.cookies.acked";

export function CookieBanner() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  // Show only after we've checked storage on the client. Avoids
  // hydration mismatch and avoids flashing the banner for visitors who
  // already dismissed it.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "1") {
        setVisible(true);
      }
    } catch {
      // localStorage may be unavailable (private mode, sandboxed iframe).
      // Fall back to showing the banner — disclosure beats silence.
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Storage failure is fine — the banner just re-shows next visit.
    }
    setVisible(false);
  }

  return (
    <div
      role="region"
      aria-label={t("cookies.ariaLabel")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)]/95 backdrop-blur transition-colors"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-sm text-[color:var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="leading-relaxed">
          {t("cookies.message")}{" "}
          <Link
            href="/privacy"
            className="text-[color:var(--color-text)] underline underline-offset-4 hover:text-[color:var(--color-accent)]"
          >
            {t("cookies.learnMore")}
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="self-end rounded-md border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg)] px-4 py-2 text-sm font-medium text-[color:var(--color-text)] transition-colors hover:border-[color:var(--color-text)] sm:self-auto"
        >
          {t("cookies.dismiss")}
        </button>
      </div>
    </div>
  );
}
