/**
 * /new — Template-picker landing for the "+ New CV" flow.
 *
 * Why this route exists (and why `+ New CV` no longer goes straight
 * into the editor): the previous flow created a DB row the moment the
 * user clicked `+ New CV`, then dropped them into the editor with a
 * default template. A user who was just browsing — picking templates
 * in the editor's Templates tab to see what they liked — left behind
 * an `Untitled CV` row in their account that counted toward the 10-CV
 * cap. Tire-kickers ate slots they never asked to use, and the
 * dashboard filled with phantom CVs.
 *
 * The fix: separate "browse templates" from "create a CV". This page
 * is the browse phase. No DB row is created on mount, on hover, or on
 * card-click that just changes the focus. The row is created only
 * when the user explicitly clicks "Use this template" on the card
 * they want to commit to. That click triggers `createResume(id)`,
 * which seeds the row with the picked template's sample data and
 * redirects to `/editor?id=<new-id>`.
 *
 * Modeled after Canva's "Create a design" → template chooser → editor
 * flow. Notion's "+ → page from template" picker uses the same shape:
 * picker is a separate surface, the editor only opens after a
 * deliberate template choice.
 *
 * Auth: gated by <AuthGate>, same as /dashboard. Anonymous visitors
 * get bounced to /login. After sign-in they return to /new and can
 * keep browsing.
 *
 * Cap: if the user is already at 10 CVs the picker still renders so
 * they can see what's available, but every "Use this template"
 * button is disabled and an amber banner explains why. The trigger
 * on the resumes table is the actual gate; the client-side check
 * here is purely UX (no spinner-then-error round-trip).
 */

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { AuthGate } from "@/components/auth-gate";
import { Button } from "@/components/ui/button";
import { TEMPLATES, TEMPLATES_BY_ID } from "@/templates/registry";
import { TemplatePreview } from "@/components/editor/template-preview";
import {
  DkBadge,
  TemplateFilterTabs,
  filterTemplates,
  type TemplateRegion,
} from "@/components/templates/template-filter";
import {
  createResume,
  listResumes,
  MAX_CVS_PER_USER,
} from "@/lib/resumes";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { translateError } from "@/lib/translatable-error";
import { EASE, staggerContainer, staggerItem } from "@/lib/motion";
import type { TemplateId } from "@/types/resume";

/** Pull the initial region from `?lang=` so a fresh visit / refresh
 *  remembers what the user picked last time. Anything outside the
 *  three valid values falls back to "all" so we don't end up with a
 *  ghost selection. Pure helper — exported only for testing. */
function regionFromSearch(value: string | null): TemplateRegion {
  if (value === "da" || value === "en") return value;
  return "all";
}

function NewCvPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  // Filter region — synced to `?lang=da|en` so the choice survives a
  // refresh / back-button. Initialised from the URL on mount; updates
  // push a `router.replace` so the URL stays the source of truth and
  // the user can bookmark / share `/new?lang=da` to land directly on
  // the Danish pool.
  const [region, setRegion] = useState<TemplateRegion>(() =>
    regionFromSearch(searchParams.get("lang")),
  );
  // Keep state in sync if the URL changes externally (e.g. back/forward
  // navigation). Without this, hitting Back after switching pills
  // would update the URL but leave the pill out of sync.
  useEffect(() => {
    const next = regionFromSearch(searchParams.get("lang"));
    setRegion(next);
    // searchParams identity changes per render in Next 15+; only react
    // to the actual query value via the get() output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("lang")]);

  // Counts shown in the pills — `Alle (50)`, `English (47)`, `Dansk CV (3)`.
  // Memoised on the static TEMPLATES list so we only walk it once.
  const counts = useMemo(() => {
    const da = TEMPLATES.filter((tpl) => tpl.language === "da").length;
    return { all: TEMPLATES.length, da, en: TEMPLATES.length - da };
  }, []);
  const visibleTemplates = useMemo(
    () => filterTemplates(TEMPLATES, region),
    [region],
  );

  function onRegionChange(next: TemplateRegion) {
    setRegion(next);
    // Push the new region into the URL — `?lang=da` for Danish, drop
    // the param entirely for "all" so the canonical URL stays clean.
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("lang");
    else params.set("lang", next);
    const qs = params.toString();
    router.replace(qs ? `/new?${qs}` : "/new");
  }

  // The id of the template currently being created. Truthy = a card
  // has been clicked, async createResume() is in flight; we render a
  // full-screen "Creating your <name>…" splash and lock the gallery
  // so a second click can't double-fire. Cleared on error so the
  // user can retry; on success we redirect away so it doesn't matter.
  const [creatingId, setCreatingId] = useState<TemplateId | null>(null);
  // CV count, fetched once on mount, used to decide whether the user
  // is already at the cap. We don't block the gallery render on this —
  // a brief "could be at cap, will know in a second" window is fine
  // because the trigger is the real gate. atLimit is computed from
  // this; null = still loading; number = answer.
  const [cvCount, setCvCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    listResumes()
      .then((rows) => {
        if (!cancelled) setCvCount(rows.length);
      })
      .catch(() => {
        // Best-effort. If the count call fails the gallery still
        // renders; the trigger will reject any over-cap insert with
        // the typed error and we'll show the toast then.
        if (!cancelled) setCvCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const atLimit = cvCount !== null && cvCount >= MAX_CVS_PER_USER;

  async function handlePick(id: TemplateId) {
    if (creatingId) return; // de-dupe rapid clicks
    if (atLimit) {
      toast.error(
        t("dashboard.limitTitle", { n: MAX_CVS_PER_USER }),
      );
      return;
    }
    setCreatingId(id);
    try {
      const newId = await createResume(id);
      // Use replace, not push — the user shouldn't be able to
      // back-button into a template picker that has just successfully
      // created a CV (it would just sit there confused).
      router.replace(`/editor?id=${newId}`);
    } catch (e) {
      // CvLimitReachedError is a TranslatableError — translateError
      // resolves it (and any other thrown TranslatableError) to the
      // localized copy. Plain Errors fall through to e.message.
      toast.error(translateError(e, t, "new.toastFailed"));
      setCreatingId(null);
    }
  }

  // Splash screen while createResume is in flight. Same visual shape
  // as /dashboard's `?template=` preparing splash so the perceived UX
  // between the two entry points stays consistent.
  if (creatingId) {
    const tpl = TEMPLATES_BY_ID[creatingId];
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-fg" />
        <div className="text-sm font-medium text-fg">
          {t("dashboard.preparingTemplate")}{" "}
          <span className="font-semibold">{tpl.name}</span>{" "}
          {t("dashboard.preparingSuffix")}
        </div>
        <p className="mt-2 text-sm text-muted">
          {t("dashboard.preparingHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Header band: back link + page title. Back link uses
          router.back() semantics via Link to /dashboard so even if the
          user landed here directly (typed URL, refresh) they have a
          clean way out. */}
      <div className="mb-8 flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("new.backToDashboard")}
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            {t("new.title")}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {t("new.subtitle")}
          </p>
        </div>
      </div>

      {/* Cap banner — only shows when the user is already at 10 CVs.
          We DON'T hide the gallery, because seeing what's available is
          part of deciding which CV to delete to make room. We just
          disable every "Use this template" button. */}
      {atLimit && (
        <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          {t("dashboard.limitTitle", { n: MAX_CVS_PER_USER })}
        </div>
      )}

      {/* Region filter — Alle / English / Dansk CV. Above the gallery
          so users see the option before scrolling, sticky on the page
          flow (no fixed positioning — that would fight mobile). */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <TemplateFilterTabs
          active={region}
          onChange={onRegionChange}
          counts={counts}
        />
      </div>

      {/* Empty-filter fallback — if a future version of the registry
          drops the Danish pool to zero this becomes visible; today
          there's always at least one template per filter so this
          path is dormant. Cheaper than handling it inside the grid. */}
      {visibleTemplates.length === 0 && (
        <p className="mt-12 text-center text-sm text-muted">
          {t("templates.filter.empty")}
        </p>
      )}

      {/* Gallery cascade — same stagger shape as the landing page so
          there's a single "this is how SlothCV reveals options"
          motion language. 30 ms per card means ~30 templates finish
          their entrance in under a second. */}
      <motion.div
        variants={staggerContainer(0.03)}
        initial="initial"
        animate="animate"
        // Same responsive grid as the landing page (1 / 2 / 3 cols)
        // so cards have room to breathe and the TemplatePreview
        // (794px-wide A4 page) has space to scale to a readable
        // thumbnail without horizontal overflow on mobile.
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {visibleTemplates.map((tpl) => (
          <motion.div
            key={tpl.id}
            variants={staggerItem}
            whileHover={atLimit ? undefined : { y: -4, scale: 1.01 }}
            transition={{ duration: 0.2, ease: EASE.out }}
            // Whole card is clickable when not at the cap. Cards use
            // <button> instead of <Link> for the same reason as the
            // landing page: the rendered TemplatePreview emits inner
            // <a> elements for personal contact links, and nested
            // anchors are an HTML invariant React flags as a
            // hydration error. pointer-events-none on the preview
            // wrapper stops those inner anchors from intercepting
            // clicks — the whole card routes via onClick.
          >
            <button
              type="button"
              onClick={() => handlePick(tpl.id)}
              disabled={atLimit}
              aria-label={tpl.name}
              className={`group flex h-full w-full flex-col overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-left shadow-sm transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2 ${
                atLimit
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer hover:border-[color:var(--color-border-strong)] hover:shadow-lg"
              }`}
            >
              <div className="pointer-events-none relative border-b border-[color:var(--color-border)]">
                <TemplatePreview id={tpl.id} />
                {tpl.language === "da" && <DkBadge />}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-semibold text-[color:var(--color-text)]">
                    {tpl.name}
                  </h3>
                  {/* Inline CTA — visually subordinate to the card
                      itself but reinforces "click commits". On hover
                      it darkens to fg color so the user feels the
                      target. Disabled state mutes it. */}
                  <span
                    className={`text-xs font-medium transition-colors ${
                      atLimit
                        ? "text-[color:var(--color-text-subtle)]"
                        : "text-[color:var(--color-text-subtle)] group-hover:text-[color:var(--color-text)]"
                    }`}
                  >
                    {t("new.use")} →
                  </span>
                </div>
                <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
                  {tpl.blurb}
                </p>
              </div>
            </button>
          </motion.div>
        ))}
      </motion.div>

      {/* Footer-area dashboard return — covers users who scrolled
          past the top header and want to bail. Mirrors the landing
          page's "Open dashboard" CTA. */}
      <div className="mt-12 flex justify-center">
        <Link href="/dashboard">
          <Button variant="outline" size="lg">
            <ArrowLeft className="h-4 w-4" />
            {t("new.backToDashboard")}
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function NewCvPageWrapper() {
  // useSearchParams() in NewCvPage needs a Suspense boundary in static
  // export builds — Next.js fails the build otherwise with "missing
  // suspense boundary with useSearchParams". The fallback is just an
  // empty fragment because AuthGate already shows its own gating UI
  // until auth resolves; rendering a spinner here would double-flash.
  return (
    <AuthGate>
      <Suspense fallback={null}>
        <NewCvPage />
      </Suspense>
    </AuthGate>
  );
}
