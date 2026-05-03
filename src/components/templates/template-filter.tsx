/**
 * TemplateFilterTabs — pill-tab filter for the template gallery.
 *
 * Surfaces above every template gallery (landing page, /new page,
 * editor's Templates tab) and lets the user narrow the visible
 * templates to either the English-shaped pool (the existing 47) or
 * the Danish-shaped pool (aarhus / roskilde / odense). Default
 * `all` shows everything — zero regression for existing users.
 *
 * Consumers manage filter state locally because:
 *   - Editor's Templates tab is mounted inside an authenticated
 *     editor session and shouldn't touch the URL.
 *   - /new and the landing page DO sync to the URL via the
 *     `?lang=` query so the choice survives a refresh / back-button.
 *
 * The DkBadge below sits on every Danish-pool thumbnail (regardless
 * of filter) so the All view still distinguishes them at a glance.
 *
 * Filter labels translate via `t("templates.filter.{key}")`.
 */

"use client";

import type { TemplateMeta } from "@/templates/registry";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export type TemplateRegion = "all" | "en" | "da";

interface FilterTabsProps {
  active: TemplateRegion;
  onChange: (next: TemplateRegion) => void;
  /**
   * Optional counts shown on each pill. Keeps the filter informative —
   * "English (47)" reads as "this filter has stuff in it" without making
   * the user click through to find out. Counts come from the consumer
   * because the full TEMPLATES list lives there; this component stays
   * stateless beyond the active selection.
   */
  counts?: { all: number; en: number; da: number };
  /** Forward-compatible className hook for consumers that need extra
   *  spacing / alignment. The pills layout itself is opinionated. */
  className?: string;
}

/** Filter the input list by region. Pure — no React. Consumers call
 *  this on every render with their own region state. */
export function filterTemplates<T extends Pick<TemplateMeta, "language">>(
  list: T[],
  region: TemplateRegion,
): T[] {
  if (region === "all") return list;
  if (region === "da") return list.filter((t) => t.language === "da");
  // "en" pool = anything that's not explicitly tagged "da". Default
  // (undefined language) is treated as English so the existing 47
  // entries don't need backfill.
  return list.filter((t) => t.language !== "da");
}

export function TemplateFilterTabs({
  active,
  onChange,
  counts,
  className = "",
}: FilterTabsProps) {
  const { t } = useLanguage();
  const tabs: Array<{ id: TemplateRegion; label: string; count?: number }> = [
    {
      id: "all",
      label: t("templates.filter.all"),
      count: counts?.all,
    },
    {
      id: "en",
      label: t("templates.filter.en"),
      count: counts?.en,
    },
    {
      id: "da",
      label: t("templates.filter.da"),
      count: counts?.da,
    },
  ];
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-1 ${className}`}
      role="tablist"
      aria-label={t("templates.filter.all")}
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selected
                ? "bg-[color:var(--color-text)] text-[color:var(--color-bg)]"
                : "text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`ml-1.5 text-[10px] tabular-nums ${
                  selected
                    ? "text-[color:var(--color-bg)]/70"
                    : "text-[color:var(--color-text-subtle)]"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * DkBadge — small "DK" pill for Danish-pool template thumbnails.
 *
 * Sits absolutely positioned in the top-right corner of the thumbnail
 * frame so a `Alle` view can still distinguish Danish templates at a
 * glance. Uses neutral surface tones that work on any swatch palette
 * (light + dark thumbs alike) — no accent so it never fights the
 * template's own color identity.
 *
 * Consumers wrap it in a `<div className="relative">` thumbnail frame
 * and conditionally render `{template.language === "da" && <DkBadge />}`.
 */
export function DkBadge() {
  const { t } = useLanguage();
  // Text-only badge (no flag emoji) — LESSONS.md "ZERO EMOJIS IN
  // WEBSITES — ANYWHERE, EVER" forbids it. The "DK" letter pill in
  // neutral surface tones reads cleanly on any thumbnail swatch
  // (light + dark alike) without fighting the template's identity.
  return (
    <span
      className="pointer-events-none absolute right-2 top-2 inline-flex items-center rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-neutral-700 shadow-sm ring-1 ring-black/5 backdrop-blur-sm"
      aria-label={t("templates.filter.da")}
    >
      {t("templates.filter.daBadge")}
    </span>
  );
}
