/**
 * Site footer — minimal trust line + EU-hosting note. Reads copy through
 * useLanguage so DA/EN swaps the entire string set in one toggle.
 */

"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className="mt-auto border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] transition-colors">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-[color:var(--color-text-muted)] sm:flex-row">
        <p>{t("footer.tagline")}</p>
        <p className="text-[color:var(--color-text-subtle)]">
          {t("footer.note")}
        </p>
      </div>
    </footer>
  );
}
