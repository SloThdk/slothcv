/**
 * Site footer — minimal trust line + EU-hosting note + legal links.
 * Reads copy through useLanguage so DA/EN swaps the entire string set in
 * one toggle. Legal links route to /privacy and /terms — see those pages
 * for the actual content. Copyright year is computed on render so the
 * footer never goes stale.
 */

"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function SiteFooter() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] transition-colors">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-[color:var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between">
        {/* Left: tagline + EU note */}
        <div className="flex flex-col gap-1 sm:gap-0.5">
          <p>{t("footer.tagline")}</p>
          <p className="text-[color:var(--color-text-subtle)]">
            {t("footer.note")}
          </p>
        </div>

        {/* Right: legal links + copyright */}
        <nav
          aria-label={t("footer.privacy")}
          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[color:var(--color-text-subtle)]"
        >
          <Link
            href="/privacy"
            className="transition-colors hover:text-[color:var(--color-text)]"
          >
            {t("footer.privacy")}
          </Link>
          <Link
            href="/terms"
            className="transition-colors hover:text-[color:var(--color-text)]"
          >
            {t("footer.terms")}
          </Link>
          <span aria-hidden className="text-[color:var(--color-text-subtle)]/50">
            ·
          </span>
          <span>{t("footer.copyright", { year })}</span>
        </nav>
      </div>
    </footer>
  );
}
