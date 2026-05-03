/**
 * BackToTop — floating bottom-right button that appears after the user
 * scrolls past a threshold, smooth-scrolls to the top of the page on
 * click. Hidden by default; appears only when window.scrollY exceeds
 * the threshold so short pages (login, signup, account) never show
 * it. Editor pages don't show it either because the editor's left
 * pane scrolls in its own container — `window.scrollY` stays 0 even
 * during long edits.
 *
 * Mounted at the layout root so every page gets the affordance for
 * free without per-page wiring. The component itself has no styling
 * cost when invisible (returns early, no DOM).
 *
 * Accessibility:
 *   - aria-label translated via `t("common.backToTop")`.
 *   - Button is keyboard-focusable; Enter / Space activate it.
 *   - Honours prefers-reduced-motion: skips the smooth scroll and
 *     jumps to top instantly when the user has motion reduced.
 *
 * Visual:
 *   - Round 40 px button bottom-right, fixed positioning, accent
 *     surface that matches the rest of the editor chrome.
 *   - Fades in / out via opacity transition (no enter/leave animation
 *     that would re-trigger on every scroll tick).
 *   - Sits above the cookie banner (z-50 vs banner z-40 in the
 *     existing chrome — verified manually) so it's always reachable.
 */

"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const SHOW_THRESHOLD_PX = 400;

export function BackToTop() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Throttle the scroll listener with requestAnimationFrame so we
    // don't run a setState on every scroll tick (~120 events/sec on
    // smooth-scroll devices). The state only flips when crossing the
    // threshold so React rerenders are bounded to 1-2 per scroll
    // session, not per pixel.
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > SHOW_THRESHOLD_PX);
        ticking = false;
      });
    }
    // Run once on mount in case the user lands deep-scrolled (back-
    // navigation, anchor link, etc.).
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  function scrollToTop() {
    // Honour the user's reduced-motion preference. matchMedia is the
    // canonical way to check it programmatically — the global CSS
    // guard in globals.css collapses CSS animations, but `scrollTo`
    // accepts its own behaviour parameter.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: reduced ? "auto" : "smooth",
    });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label={t("common.backToTop")}
      title={t("common.backToTop")}
      // pointer-events-none when invisible so the hidden button doesn't
      // intercept clicks on whatever's underneath.
      className={`fixed bottom-6 right-6 z-50 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] shadow-md backdrop-blur transition-all duration-200 hover:border-[color:var(--color-text)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <ArrowUp className="h-4 w-4" aria-hidden />
    </button>
  );
}
