/**
 * /dashboard — auth-gated CV list (client component, static export).
 *
 * Wrapped in AuthGate so anonymous visitors are bounced to /login. Once
 * mounted with a user, fetches resumes via the Supabase client; RLS scopes
 * the query to the caller's rows automatically.
 *
 * If the URL carries `?template=<id>`, we treat it as "the user just clicked
 * a template card on the landing page". We auto-create a CV pre-seeded with
 * that template and forward into the editor — the dashboard is never rendered
 * in that path. This keeps the gallery → editor flow a single click for both
 * anonymous (sign-in → bounce → auto-create → editor) and authenticated users.
 */

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  FileText,
  Copy,
  Layers,
  Trash2,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-modal";
import { usePrompt } from "@/components/ui/prompt-modal";
import { AuthGate } from "@/components/auth-gate";
import { useAuth } from "@/lib/auth-context";
import { staggerContainer, staggerItem } from "@/lib/motion";
import {
  listResumes,
  createResume,
  deleteResume,
  deleteAllResumes,
  duplicateResume,
  duplicateAsVariant,
  groupResumesByMaster,
  renameResume,
  renameVariantLabel,
  MAX_CVS_PER_USER,
  type ResumeRow,
} from "@/lib/resumes";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { translateError } from "@/lib/translatable-error";
import type { TemplateId } from "@/types/resume";
import { TEMPLATES_BY_ID } from "@/templates/registry";

/** Translated relative-time formatter — passed the active `t` so the i18n
 *  switch works without re-defining anything. We re-derive the type from
 *  useLanguage's return so TS doesn't fight the strict TranslationKey union. */
type TFn = ReturnType<typeof useLanguage>["t"];
function formatUpdated(iso: string, t: TFn): string {
  const updated = new Date(iso);
  const diffMs = Date.now() - updated.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return t("dashboard.justNow");
  if (min < 60) return `${min} ${t("dashboard.minAgo")}`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ${t("dashboard.hrAgo")}`;
  const day = Math.floor(hr / 24);
  if (day < 30)
    return `${day} ${day === 1 ? t("dashboard.dayAgo") : t("dashboard.daysAgo")}`;
  return updated.toLocaleDateString();
}

/** Narrow a raw search-param string to a known template id. */
function asTemplate(raw: string | null): TemplateId | null {
  if (!raw) return null;
  return raw in TEMPLATES_BY_ID ? (raw as TemplateId) : null;
}

function DashboardInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [resumes, setResumes] = useState<ResumeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // TERMINAL flag for the `?template=` auto-create. Set once the request is
  // resolved one way or another — created + navigated away, at the cap, the
  // insert failed, or it hung. While false the "preparing your CV…" splash
  // shows; once true the splash is GONE for the rest of this mount and the
  // dashboard list (with its at-limit banner) renders instead.
  //
  // Two bugs this shape defends against, both seen in the wild:
  //   1. `router.replace("/dashboard")` in the catch does NOT reliably strip
  //      `?template=` / re-fire `useSearchParams()` in the static export, so
  //      gating the splash on the URL param left at-cap users stranded on
  //      "Preparing your CV…" forever. → gate on this state flag instead.
  //   2. Gating the splash on a LIVE `!atLimit` re-showed the splash the
  //      moment the user deleted a CV (atLimit flips false) — but the
  //      one-shot `autoCreateFiredRef` guard meant no insert ever re-ran, so
  //      it spun on "Preparing your Scratch CV…" after a delete. → the
  //      decision must be TERMINAL, never re-derived from the live cap state.
  const [autoCreateSettled, setAutoCreateSettled] = useState(false);
  // Guard so the auto-create path runs at most once per mount even if the
  // search params re-fire (StrictMode double-mount, hydration, etc.).
  const autoCreateFiredRef = useRef(false);

  const requestedTemplate = asTemplate(params.get("template"));

  // Fetch on mount AND when the user identity changes — covers sign-in
  // happening after the component has already rendered (rare but possible).
  useEffect(() => {
    let cancelled = false;
    listResumes()
      .then((rows) => {
        if (cancelled) return;
        // Clear any prior error on success — we only set error once we know.
        setError(null);
        setResumes(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("editor.loadFailed"));
          setResumes([]);
        }
      });
    return () => {
      cancelled = true;
    };
    // user.id triggers a refetch if the signed-in user actually changes.
  }, [user?.id]);

  // Auto-create-and-forward when ?template=<id> is present. We wait until:
  //   1. the user is loaded (signed-in) so the insert hits RLS as the right
  //      identity, AND
  //   2. the resume list has been fetched (`resumes !== null`) so we know the
  //      current CV count and can pre-empt the per-account cap with a friendly
  //      message instead of firing a doomed insert and stranding the user on
  //      the splash.
  useEffect(() => {
    if (!requestedTemplate) return;
    if (!user) return; // AuthGate is still resolving; effect will re-fire.
    if (resumes === null) return; // wait for the count before deciding.
    if (autoCreateFiredRef.current) return;
    autoCreateFiredRef.current = true;

    // Snapshot the cap decision at fire time. We intentionally do NOT re-read
    // `resumes` after this point: once we've decided what to do with this
    // ?template= request the decision is terminal for the mount. (Deleting a
    // CV later flips the live cap state, but it must NOT resurrect the splash.)
    const atCapNow = resumes.length >= MAX_CVS_PER_USER;

    void (async () => {
      // All setState below lives inside this async IIFE rather than the effect
      // body, so none of it is a synchronous-in-effect call.

      // Already at the cap → don't fire an insert the trigger will reject.
      // Surface the limit and settle; the splash clears to the dashboard list
      // whose at-limit banner explains why, and STAYS cleared even after the
      // user deletes a CV to make room.
      if (atCapNow) {
        toast.error(t("dashboard.limitTitle", { n: MAX_CVS_PER_USER }));
        setAutoCreateSettled(true);
        return;
      }

      // Safety net for a hung insert: Supabase's fetch has no built-in
      // timeout, so on a flaky mobile connection createResume() could pend
      // indefinitely and keep the splash up. After 20s we settle with a
      // generic error instead of spinning forever. `done` guards against the
      // timeout and the real result both firing.
      let done = false;
      const bail = setTimeout(() => {
        if (done) return;
        done = true;
        toast.error(t("dashboard.toastNewFailed"));
        setAutoCreateSettled(true);
      }, 20_000);
      try {
        const id = await createResume(requestedTemplate);
        if (done) return; // timed out already — don't double-navigate.
        done = true;
        clearTimeout(bail);
        router.replace(`/editor?id=${id}`);
      } catch (e) {
        if (done) return;
        done = true;
        clearTimeout(bail);
        // CvLimitReachedError is a TranslatableError; translateError resolves
        // it to the localized "You can have at most {n} CVs" copy
        // automatically — no special branch needed. Any other error falls
        // back to its message / the generic key.
        toast.error(translateError(e, t, "dashboard.toastNewFailed"));
        setAutoCreateSettled(true);
      }
    })();
  }, [requestedTemplate, user, router, resumes, t]);

  async function refresh() {
    try {
      setResumes(await listResumes());
    } catch (e) {
      toast.error(translateError(e, t, "dashboard.toastRefreshFailed"));
    }
  }

  // "+ New CV" no longer creates a row directly — it navigates to /new
  // (the template-picker page) so the user has to deliberately commit
  // to a template before any DB row is created. This stops the
  // "browse templates → leave with phantom Untitled CV" flow that ate
  // CV-cap slots without the user noticing. The cap check stays here
  // so we don't even bother sending them to /new when they're already
  // maxed out.
  function onNewCv() {
    if (atLimit) {
      toast.error(t("dashboard.limitTitle", { n: MAX_CVS_PER_USER }));
      return;
    }
    router.push("/new");
  }

  /**
   * Hard-delete EVERY CV the user owns. Two friction layers:
   *
   *   1. The button is `variant="ghost"` with red text — it does not
   *      look like a primary action even when present.
   *   2. The confirm modal uses the danger variant + "this cannot be
   *      undone" language in EN/DA. The user has to actively click
   *      "Yes, delete everything" — a non-default keyboard-friendly
   *      label that requires reading.
   *
   * Server-side, RLS guarantees this DELETE only touches the caller's
   * rows. The `deleteAllResumes()` helper also adds an explicit
   * `eq("user_id", user.id)` filter as belt-and-braces.
   */
  async function onDeleteAll() {
    const ok = await confirm({
      title: t("dashboard.confirmDeleteAllTitle"),
      description: t("dashboard.confirmDeleteAllDesc"),
      confirmLabel: t("dashboard.confirmDeleteAllConfirm"),
      cancelLabel: t("common.cancel"),
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const n = await deleteAllResumes();
      // Plural-aware toast — naive "{n} CV{s}" templating would yield
      // "7 CVs" in English but "7 CVs" in Danish (incorrect; Danish
      // plural is "CV'er"). Two separate translation entries handle
      // the morphology cleanly.
      toast.success(
        n === 1
          ? t("dashboard.toastDeletedAll.one")
          : t("dashboard.toastDeletedAll.other", { n }),
      );
      await refresh();
    } catch (e) {
      toast.error(translateError(e, t, "dashboard.toastDeleteAllFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    const cv = resumes?.find((r) => r.id === id);
    const ok = await confirm({
      title: t("dashboard.confirmDeleteTitle"),
      description: cv?.title
        ? t("dashboard.confirmDeleteDescNamed", { name: cv.title })
        : t("dashboard.confirmDeleteDesc"),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteResume(id);
      toast.success(t("dashboard.toastDeleted"));
      await refresh();
    } catch (e) {
      toast.error(translateError(e, t, "dashboard.toastDeleteFailed"));
    }
  }

  async function onDuplicate(id: string) {
    try {
      await duplicateResume(id);
      toast.success(t("dashboard.toastDuplicated"));
      await refresh();
    } catch (e) {
      // CvLimitReachedError → translated cap copy; plain Errors fall
      // through to e.message; nothing → translated fallback.
      toast.error(translateError(e, t, "dashboard.toastDuplicateFailed"));
    }
  }

  /** Rename flow. Behaviour branches on whether the row is a master or
   *  a variant:
   *    - Master  → edits the shared `title` column. All variants under
   *                this master will start showing the new title in their
   *                "Variant of <master>" badge.
   *    - Variant → edits ONLY this row's `variant_label`. The master's
   *                title and every sibling variant's data stays
   *                untouched.
   *
   *  Either way the prompt seeds with the row's current label so the
   *  user can edit a few characters instead of retyping. Empty input
   *  cancels (matches the existing variant-create prompt's contract).
   */
  async function onRename(id: string) {
    const row = resumes?.find((r) => r.id === id);
    if (!row) return;
    const isVariant = !!row.parent_id;
    // Variant renames edit variant_label; master renames edit title.
    // The currentValue seeds the prompt so the user is editing, not
    // retyping from scratch.
    const currentValue = isVariant
      ? row.variant_label ?? ""
      : row.title ?? "";
    const label = await prompt({
      title: isVariant
        ? t("dashboard.renameVariantPromptTitle")
        : t("dashboard.renamePromptTitle"),
      description: isVariant
        ? t("dashboard.renameVariantPromptDesc")
        : t("dashboard.renamePromptDesc"),
      inputLabel: isVariant
        ? t("dashboard.variantPromptLabel")
        : t("dashboard.renamePromptLabel"),
      placeholder: isVariant
        ? t("dashboard.variantPromptPlaceholder")
        : t("dashboard.renamePromptPlaceholder"),
      confirmLabel: t("dashboard.renamePromptConfirm"),
      cancelLabel: t("common.cancel"),
      defaultValue: currentValue,
      // 80 for variants (matches duplicateAsVariant's cap), 120 for
      // titles (matches renameResume's cap). Surfaces the cap to the
      // user via the prompt UI's character counter.
      maxLength: isVariant ? 80 : 120,
    });
    if (!label) return; // user cancelled or cleared the field
    // No-op if the label didn't actually change. Avoids a pointless
    // round-trip + a "Renamed." toast on a click that did nothing.
    if (label.trim() === currentValue.trim()) return;
    try {
      if (isVariant) {
        await renameVariantLabel(id, label);
      } else {
        await renameResume(id, label);
      }
      toast.success(t("dashboard.toastRenamed"));
      await refresh();
    } catch (e) {
      toast.error(translateError(e, t, "dashboard.toastRenameFailed"));
    }
  }

  /** Save-as-variant flow. Pops a prompt for a label, then clones the
   *  source CV with `parent_id` set to the source's master (or the source
   *  itself if it IS a master). The new variant lands grouped under its
   *  master in the dashboard. */
  async function onSaveAsVariant(id: string) {
    const label = await prompt({
      title: t("dashboard.variantPromptTitle"),
      description: t("dashboard.variantPromptDesc"),
      inputLabel: t("dashboard.variantPromptLabel"),
      placeholder: t("dashboard.variantPromptPlaceholder"),
      confirmLabel: t("dashboard.variantPromptConfirm"),
      cancelLabel: t("common.cancel"),
      maxLength: 80,
    });
    if (!label) return;
    try {
      await duplicateAsVariant(id, label);
      toast.success(t("dashboard.toastVariantCreated"));
      await refresh();
    } catch (e) {
      // CvLimitReachedError → translated cap copy via TranslatableError.
      toast.error(translateError(e, t, "dashboard.toastVariantFailed"));
    }
  }

  // Whether the user has reached the per-account cap. Counted client-side
  // for UX (disable the button, show a banner); the trigger is the actual
  // gate, so this is allowed to lag briefly without a security impact.
  const atLimit =
    Array.isArray(resumes) && resumes.length >= MAX_CVS_PER_USER;

  // Show a focused "preparing your CV…" splash WHILE the auto-create is still
  // pending. The moment it settles (created + navigating away, at cap, failed,
  // or hung) `autoCreateSettled` flips and we fall through to the dashboard
  // list below. Gating ONLY on the terminal flag — never on the live
  // `atLimit` — is what stops the splash from resurrecting when the user
  // deletes a CV to make room.
  if (requestedTemplate && !autoCreateSettled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="text-sm font-medium text-fg">
          {t("dashboard.preparingTemplate")}{" "}
          <span className="font-semibold">
            {TEMPLATES_BY_ID[requestedTemplate].name}
          </span>{" "}
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t("dashboard.title")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t("dashboard.subtitle")}
            {Array.isArray(resumes) && (
              <span className="ml-1 font-medium text-fg">
                {resumes.length} / {MAX_CVS_PER_USER} {t("dashboard.usedSuffix")}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk-delete only renders when there's something to delete.
              Visually subordinate to "New CV" — a ghost button with
              red text + warning glyph reads as "destructive but
              available" without competing with the primary action.
              The confirm modal does the heavy work of friction. */}
          {Array.isArray(resumes) && resumes.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={onDeleteAll}
              disabled={busy}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
              title={t("dashboard.deleteAllCvs")}
            >
              <AlertTriangle className="h-4 w-4" />
              {t("dashboard.deleteAllCvs")}
            </Button>
          )}
          <Button
            type="button"
            onClick={onNewCv}
            disabled={atLimit}
            title={
              atLimit
                ? t("dashboard.limitTitle", { n: MAX_CVS_PER_USER })
                : undefined
            }
          >
            <Plus className="h-4 w-4" />
            {atLimit ? t("dashboard.limitReached") : t("dashboard.newCv")}
          </Button>
        </div>
      </div>

      {atLimit && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {t("dashboard.limitTitle", { n: MAX_CVS_PER_USER })}
        </div>
      )}

      <div className="mt-8">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : resumes === null ? (
          <div className="text-center text-sm text-subtle">
            {t("common.loading")}
          </div>
        ) : resumes.length > 0 ? (
          // Stagger container — each immediate child gets a 50ms-spaced
          // entrance. We wrap the per-master <div> so masters AND their
          // variant siblings share one stagger pass; otherwise the
          // variant subgroup would re-stagger on its own which reads as
          // a second wave of motion the user has to notice.
          <motion.div
            variants={staggerContainer(0.05)}
            initial="initial"
            animate="animate"
            className="space-y-6"
          >
            {groupResumesByMaster(resumes).map((group) => (
              <motion.div key={group.master.id} variants={staggerItem}>
                <ResumeCard
                  row={group.master}
                  isVariant={false}
                  onRename={onRename}
                  onDuplicate={onDuplicate}
                  onSaveAsVariant={onSaveAsVariant}
                  onDelete={onDelete}
                  t={t}
                />
                {group.variants.length > 0 && (
                  <div
                    // Variants render as a slightly-inset stack under their
                    // master so the parent → children relationship is
                    // visually obvious. Left-border accent gives a clean
                    // "this is a sub-tree" affordance without needing a
                    // separate column.
                    className="mt-2 ml-4 space-y-2 border-l-2 border-[color:var(--color-border)] pl-4"
                  >
                    {group.variants.map((v) => (
                      <ResumeCard
                        key={v.id}
                        row={v}
                        isVariant
                        masterTitle={group.master.title}
                        onRename={onRename}
                        onDuplicate={onDuplicate}
                        onSaveAsVariant={onSaveAsVariant}
                        onDelete={onDelete}
                        t={t}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="rounded-xl border border-dashed border-strong bg-surface p-10 text-center">
            <FileText className="mx-auto h-10 w-10 text-subtle" />
            <h2 className="mt-4 text-lg font-semibold text-fg">
              {t("dashboard.empty.title")}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {t("dashboard.empty.body")}
            </p>
            <Button type="button" onClick={onNewCv} className="mt-6">
              <Plus className="h-4 w-4" />
              {t("dashboard.newCv")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Single CV card. Same shape for both masters and variants — the only
 *  visual differences are: variant gets a "Variant of {master} · {label}"
 *  badge above the title, and (because variants render inside the
 *  indented sibling stack) they sit at slightly higher density. */
function ResumeCard({
  row,
  isVariant,
  masterTitle,
  onRename,
  onDuplicate,
  onSaveAsVariant,
  onDelete,
  t,
}: {
  row: ResumeRow;
  isVariant: boolean;
  masterTitle?: string;
  onRename: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSaveAsVariant: (id: string) => void;
  onDelete: (id: string) => void;
  t: TFn;
}) {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/editor?id=${row.id}`}
            className="flex flex-1 items-start gap-3 text-left"
          >
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-subtle" />
            <div className="min-w-0 flex-1">
              {isVariant && (
                <div className="mb-0.5 inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-900 dark:bg-violet-900/40 dark:text-violet-200">
                  <Layers className="h-3 w-3" aria-hidden="true" />
                  <span className="truncate">
                    {t("dashboard.variantBadge")} {masterTitle ?? "—"}
                  </span>
                </div>
              )}
              <h3 className="truncate font-semibold text-fg hover:underline">
                {isVariant && row.variant_label
                  ? row.variant_label
                  : row.title}
              </h3>
              <p className="mt-1 text-xs text-muted">
                {t("dashboard.updated")} {formatUpdated(row.updated_at, t)}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            {/* Pencil icon → rename. First in the row because rename
                is the most-expected action on a CV in a dashboard
                list — keep it discoverable. Hover wiggles the pencil
                so the affordance reads as "edit", not just a static
                glyph. */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("dashboard.renameAria")}
              title={t("dashboard.renameAria")}
              onClick={() => {
                onRename(row.id);
              }}
              className="group/rename"
            >
              <Pencil className="h-4 w-4 transition-transform duration-200 ease-out group-hover/rename:scale-110 group-hover/rename:-rotate-12" />
            </Button>
            {/* Layers icon → save-as-variant. The icon itself gets a
                subtle scale + rotate on hover via group-hover so the
                user feels the "stack" gesture. The Button's own
                hover/press transitions stay intact. */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("dashboard.variantAria")}
              title={t("dashboard.variantAria")}
              onClick={() => {
                onSaveAsVariant(row.id);
              }}
              className="group/layers"
            >
              <Layers className="h-4 w-4 transition-transform duration-200 ease-out group-hover/layers:scale-110 group-hover/layers:-rotate-6" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("dashboard.duplicateAria")}
              title={t("common.duplicate")}
              onClick={() => {
                onDuplicate(row.id);
              }}
              className="group/dupe"
            >
              <Copy className="h-4 w-4 transition-transform duration-200 ease-out group-hover/dupe:scale-110" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("dashboard.deleteAria")}
              title={t("common.delete")}
              className="group/del text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => {
                onDelete(row.id);
              }}
            >
              <Trash2 className="h-4 w-4 transition-transform duration-200 ease-out group-hover/del:scale-110" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <AuthGate>
      {/* Suspense is required because <DashboardInner> calls useSearchParams,
          which triggers a CSR bailout on the static-export build. */}
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-subtle">
            Loading…
          </div>
        }
      >
        <DashboardInner />
      </Suspense>
    </AuthGate>
  );
}
