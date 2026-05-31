/**
 * /editor — the actual usable CV builder (Phase 2).
 *
 * Two-pane layout:
 *   - Left (40%): tabbed controls (Content / Design / Templates / Settings).
 *   - Right (60%): live A4 preview, scrollable + zoomable.
 *
 * On mount we hydrate the editor store from Supabase. Mutations are applied
 * optimistically; the store schedules a debounced 1s save. The header shows
 * the SaveIndicator pill so the user always knows where they stand.
 *
 * Mobile: collapses to a single column with a bottom-bar toggle between
 * "Edit" and "Preview". Desktop-first; mobile is functional, not polished.
 */

"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  FileText,
  Layers,
  Monitor,
  Plus,
  Redo2,
  Save,
  Settings2,
  Undo2,
  Wand2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { usePrompt } from "@/components/ui/prompt-modal";
import { AuthGate } from "@/components/auth-gate";
import { getResumeParsed, renameResume } from "@/lib/resumes";
import {
  useEditorStore,
  flushPendingSave,
  type SaveStatus,
} from "@/lib/store/editor";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { translateError } from "@/lib/translatable-error";
import { SaveIndicator } from "@/components/editor/save-indicator";
import { SectionList } from "@/components/editor/section-list";
import { DesignTab } from "@/components/editor/design-tab";
import { TemplatesTab } from "@/components/editor/templates-tab";
import { SettingsTab } from "@/components/editor/settings-tab";
import { ToolshelfTab } from "@/components/editor/toolshelf-tab";
import { LayersPanel } from "@/components/editor/layers-panel";
import { Preview } from "@/components/editor/preview";

type Tab = "content" | "design" | "add" | "layers" | "templates" | "settings";
type MobilePane = "edit" | "preview";

function EditorInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const { t, lang } = useLanguage();

  const hydrate = useEditorStore((s) => s.hydrate);
  const reset = useEditorStore((s) => s.reset);
  const resumeId = useEditorStore((s) => s.resumeId);
  // Title lives in the store (single source) — the header below and the
  // Settings tab's rename field both read/write it, so a rename reflects
  // everywhere on the same tick instead of only after a refresh.
  const title = useEditorStore((s) => s.title);
  const setTitle = useEditorStore((s) => s.setTitle);
  const selectedElementId = useEditorStore((s) => s.selectedElementId);
  const setMeta = useEditorStore((s) => s.setMeta);
  const dataLanguage = useEditorStore((s) => s.data.meta.language);
  const requestJumpToSection = useEditorStore((s) => s.requestJumpToSection);

  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("content");
  const [mobilePane, setMobilePane] = useState<MobilePane>("edit");
  // "Click empty page → Design tab + scroll" plumbing. State lives in
  // the parent (this component) instead of inside DesignTab so the
  // first click works even when DesignTab isn't yet mounted (it's
  // conditionally rendered: `{tab === "design" && <DesignTab />}`).
  // The previous window-event-from-child design needed two clicks
  // because the listener didn't register until after the first
  // setTab made DesignTab mount. Passing as a prop means the prop
  // is "pageBg" exactly when DesignTab mounts → scroll fires on the
  // very first render. DesignTab calls back via onScrolled to clear.
  const [pendingDesignScroll, setPendingDesignScroll] = useState<
    "pageBg" | "photo" | "watermark" | null
  >(null);
  const handleDesignScrolled = useCallback(
    () => setPendingDesignScroll(null),
    [],
  );
  // Tab the user was on BEFORE selecting a custom element. We auto-switch
  // to "add" on selection so the inspector pops open, but on deselect we
  // want to send the user back to wherever they came from — not jump to
  // a default tab. Without this, picking a shape and clicking out would
  // bounce them to Design (or whatever default), losing their place.
  const prevTabBeforeSelectionRef = useRef<Tab | null>(null);

  // Hydrate the store from Supabase on mount / when the URL id changes.
  useEffect(() => {
    if (!id) {
      router.replace("/dashboard");
      return;
    }
    // Clear any leftover error / title from the PREVIOUS load synchronously,
    // BEFORE the async fetch starts. Without this, switching from a failed
    // CV (showing "Dette CV findes ikke" early-return) to a working one
    // keeps the error visible for the 200-500 ms window before the new
    // fetch resolves — users see "stuck on this error" and assume the
    // second CV is also broken. Setting both to null upfront paints the
    // loading placeholder during that window instead, which is honest
    // about "we're fetching, don't panic".
    setError(null);
    setTitle("");
    let cancelled = false;
    // Tiny retry helper. Freshly-created rows (dashboard "+ New CV" →
    // /editor?id=NEW) occasionally come back null on the first read
    // because Supabase's connection pool can route the read at a moment
    // when the user's session-bound RLS context hasn't propagated yet.
    // A single 250 ms retry catches ~all of these without delaying the
    // common path (existing CV, hits cache). If the second attempt is
    // also null, the row genuinely doesn't exist OR the user truly
    // doesn't have access — show the error.
    const loadWithRetry = async () => {
      const first = await getResumeParsed(id);
      if (first) return first;
      await new Promise((r) => setTimeout(r, 250));
      return getResumeParsed(id);
    };
    loadWithRetry()
      .then((res) => {
        if (cancelled) return;
        if (!res) {
          setError(t("editor.notFound"));
          return;
        }
        setError(null);
        hydrate(res.row.id, res.data, res.row.title);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : t("editor.loadFailed"));
      });

    // Warn the user if they try to close / navigate away with unsaved
    // changes. Auto-save is OFF so this is the only safety net.
    // Per spec, modern browsers ignore the custom message and show a
    // localized "Unsaved changes" prompt — that's fine, the goal is to
    // surface the dirty state, not the exact wording.
    function onUnload(e: BeforeUnloadEvent) {
      if (useEditorStore.getState().saveStatus === "dirty") {
        e.preventDefault();
        // Some old browsers still want a returnValue assignment.
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onUnload);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", onUnload);
      // Don't reset on unmount in dev (StrictMode double-mount would clobber);
      // call reset only when the id actually changes by triggering it on next
      // hydrate above.
    };
    // `t` deliberately NOT in deps — a language switch should never re-fetch
    // the CV (would waste a DB round-trip + reset the title state we just
    // populated). The "error message renders in the old language until next
    // CV switch" quirk is acceptable; the alternative was a re-fetch storm
    // every time the user toggled DA/EN in the header.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, hydrate, router]);

  // Reset the store when the editor leaves entirely. Flush any pending
  // autosave FIRST so edits made within the 800 ms debounce window
  // before navigating away (e.g. user types something then immediately
  // hits the back button or clicks a template card on the landing
  // page) actually commit to Supabase. Without this, reset() would
  // clear the saveTimer before the scheduled save fires and the edits
  // would silently disappear — which felt to the user like "the CV
  // went back to how it was before I touched it." flushPendingSave
  // captures state synchronously (see editor.ts), so the order
  // (flush, then reset) is safe even though both are sync calls on
  // the same tick. The earlier comment ("auto-save is off, unsaved
  // changes are intentionally discarded") was wrong — auto-save IS on
  // and discarding pending writes was a data-loss bug, not intent.
  useEffect(() => {
    return () => {
      void flushPendingSave();
      reset();
    };
  }, [reset]);

  // Click-to-jump from the live preview.
  //   - `slothcv:jump-to-section` → Content tab + expand the row.
  //     SectionList listens separately for the expand part.
  //   - `slothcv:open-design-tab` → Design tab. Fired by preview.tsx on
  //     a click on the empty page background. Design-tab listens for
  //     the same event to scroll the Page-background preset row into
  //     view and highlight it briefly.
  // Both clear `prevTabBeforeSelectionRef` so the deselect-restore
  // effect below doesn't immediately yank the user back to the tab
  // they were on before clicking — explicit navigation wins.
  useEffect(() => {
    function onJump(e: Event) {
      const detail = (e as CustomEvent<{ id: string; fieldId?: string }>).detail;
      if (!detail?.id) return;
      setTab("content");
      setMobilePane("edit");
      prevTabBeforeSelectionRef.current = null;
      // Persist the intent in the store so SectionList can pick it up
      // when it (re)mounts. Avoids the previous race where the window
      // event fired before SectionList had attached its listener.
      // `fieldId` (optional) carries the precise element the user
      // clicked so SectionList can scroll + flash the exact form field
      // instead of just the section row header.
      requestJumpToSection(detail.id, detail.fieldId ?? null);
    }
    function onOpenDesign() {
      setTab("design");
      setMobilePane("edit");
      // Same nav-clear contract as onJump — without this the
      // deselect-restore effect would overwrite our setTab once
      // selectedElementId settles back to null.
      prevTabBeforeSelectionRef.current = null;
      // Tell DesignTab to scroll its Page-bg picker into view on
      // its very next render (the one where it actually mounts).
      // DesignTab clears this back to null via onScrolled.
      setPendingDesignScroll("pageBg");
    }
    function onOpenDesignPhoto() {
      setTab("design");
      setMobilePane("edit");
      prevTabBeforeSelectionRef.current = null;
      setPendingDesignScroll("photo");
    }
    function onOpenDesignWatermark() {
      setTab("design");
      setMobilePane("edit");
      prevTabBeforeSelectionRef.current = null;
      setPendingDesignScroll("watermark");
    }
    window.addEventListener("slothcv:jump-to-section", onJump);
    window.addEventListener("slothcv:open-design-tab", onOpenDesign);
    window.addEventListener("slothcv:open-design-photo", onOpenDesignPhoto);
    window.addEventListener(
      "slothcv:open-design-watermark",
      onOpenDesignWatermark,
    );
    return () => {
      window.removeEventListener("slothcv:jump-to-section", onJump);
      window.removeEventListener("slothcv:open-design-tab", onOpenDesign);
      window.removeEventListener(
        "slothcv:open-design-photo",
        onOpenDesignPhoto,
      );
      window.removeEventListener(
        "slothcv:open-design-watermark",
        onOpenDesignWatermark,
      );
    };
  }, [requestJumpToSection]);

  // Selection ↔ tab coordination.
  //
  //   - Selection acquired (id goes from null → truthy):
  //       Snapshot the current tab into `prevTabBeforeSelectionRef`,
  //       then auto-open the "add" tab so the inspector pops up.
  //       Same idiom as Canva — selection = inspector, no extra click.
  //
  //   - Selection cleared (id goes from truthy → null):
  //       Pop the snapshot and restore that tab. The user lands back
  //       wherever they were before they touched the shape — no surprise
  //       Design-tab jumps, no orphaned "add" tab with nothing in it.
  //       If we never snapshotted (selection started before mount, or
  //       was set by something other than user click), leave the tab
  //       alone — don't jump to "content" by default.
  //
  // Tracked with a ref instead of state because the snapshot is a
  // single-use side-channel; consumers are this effect only and we
  // don't want React rerenders for it.
  useEffect(() => {
    if (selectedElementId) {
      // Only snapshot the FIRST time selection appears — if the user
      // selects element A then element B without deselecting in between,
      // we still want to remember the tab from BEFORE A.
      if (prevTabBeforeSelectionRef.current === null && tab !== "add") {
        prevTabBeforeSelectionRef.current = tab;
      }
      if (tab !== "add") {
        setTab("add");
        setMobilePane("edit");
      }
    } else {
      const restore = prevTabBeforeSelectionRef.current;
      if (restore) {
        setTab(restore);
        prevTabBeforeSelectionRef.current = null;
      }
    }
    // `tab` intentionally not in deps — we only want to run when the
    // selection changes. Reading the latest `tab` via closure is fine
    // because this effect re-creates whenever selectedElementId changes,
    // which is exactly when we need to read the current tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementId]);

  // Sync the CV's `meta.language` to whatever the global header toggle
  // is set to. Removes the need for a duplicate "Document language"
  // selector inside the editor's Settings tab — the header is the single
  // source of truth. Only writes when they actually differ so the save
  // debouncer doesn't churn on every render.
  useEffect(() => {
    if (resumeId && dataLanguage !== lang) {
      setMeta({ language: lang });
    }
  }, [lang, resumeId, dataLanguage, setMeta]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/dashboard">
          <Button variant="outline" className="mt-6">
            {t("editor.backToDashboard")}
          </Button>
        </Link>
      </div>
    );
  }

  if (!resumeId) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-subtle">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-56px-44px)] flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t("editor.allCvs")}</span>
            </Button>
          </Link>
          <span className="truncate text-sm font-medium text-fg">
            {title || t("editor.untitled")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <UndoRedoButtons />
          <SaveIndicator />
          <SaveNowButton resumeId={resumeId} />
        </div>
      </div>

      {/* Two-pane layout (desktop) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left pane */}
        <div
          className={`flex w-full flex-col border-r border-border bg-surface-hover md:w-[40%] md:max-w-[520px] ${mobilePane === "edit" ? "" : "hidden md:flex"}`}
        >
          <Tabs tab={tab} onChange={setTab} />
          <div className="flex-1 overflow-auto p-3">
            {tab === "content" && <SectionList />}
            {tab === "design" && (
              <DesignTab
                scrollTo={pendingDesignScroll}
                onScrolled={handleDesignScrolled}
              />
            )}
            {tab === "add" && <ToolshelfTab />}
            {tab === "layers" && <LayersPanel />}
            {tab === "templates" && <TemplatesTab />}
            {tab === "settings" && <SettingsTab />}
          </div>
        </div>

        {/* Right pane (preview) */}
        <div
          className={`flex flex-1 flex-col bg-surface-hover ${mobilePane === "preview" ? "" : "hidden md:flex"}`}
        >
          <Preview />
        </div>
      </div>

      {/* Mobile pane toggle. `aria-pressed` exposes the active state to
          screen readers; the visual text-fg/text-subtle distinction is
          invisible to AT without it. `pb-[env(safe-area-inset-bottom)]`
          adds breathing room above the iOS home indicator so the
          buttons aren't touched by accident. */}
      <div className="flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <button
          type="button"
          aria-pressed={mobilePane === "edit"}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium ${mobilePane === "edit" ? "text-fg" : "text-subtle"}`}
          onClick={() => setMobilePane("edit")}
        >
          <Wand2 className="h-4 w-4" /> {t("editor.mobile.edit")}
        </button>
        <button
          type="button"
          aria-pressed={mobilePane === "preview"}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium ${mobilePane === "preview" ? "text-fg" : "text-subtle"}`}
          onClick={() => setMobilePane("preview")}
        >
          <Eye className="h-4 w-4" /> {t("editor.mobile.preview")}
        </button>
      </div>
    </div>
  );
}

function Tabs({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  const { t: trans } = useLanguage();
  const items: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "content", label: trans("editor.tab.content"), icon: FileText },
    { id: "design", label: trans("editor.tab.design"), icon: Wand2 },
    { id: "add", label: trans("editor.tab.add"), icon: Plus },
    { id: "layers", label: trans("editor.tab.layers"), icon: Layers },
    { id: "templates", label: trans("editor.tab.templates"), icon: Eye },
    { id: "settings", label: trans("editor.tab.settings"), icon: Settings2 },
  ];
  // The Linear-style "magic ink" tab bar. Each button hosts a relative
  // motion.div on the active tab; framer-motion's layoutId animates the
  // SAME virtual element from button to button using a transform-only
  // 200ms slide. Inactive tabs render plain (no underline element), so
  // there's only ever one visible indicator at a time.
  //
  // Layout: flex with min-width:0 + flex-1 per item so each tab gets
  // equal share but content can shrink to fit. Fixed-width equal
  // columns (grid-cols-6) crammed Danish "Indstillinger" against the
  // right edge with no breathing room while shorter labels ("Lag")
  // had empty space on either side. flex also handles add/remove of
  // tabs without grid recalculation noise.
  return (
    <div className="relative flex border-b border-border bg-surface">
      {items.map((it) => {
        const Icon = it.icon;
        const active = tab === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={`relative flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1.5 py-2.5 text-[11px] font-medium transition-colors ${
              active ? "text-fg" : "text-muted hover:text-fg"
            }`}
            aria-label={it.label}
            title={it.label}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {/* Hide label on narrow viewports — at 393px, 6 cells +
                icon + label wraps awkwardly. The `aria-label` and
                `title` above keep accessibility + tooltip discoverability
                intact. Show again at sm: (640px). `truncate` avoids
                overflow on the longest Danish label (Indstillinger). */}
            <span className="hidden truncate sm:inline">{it.label}</span>
            {active && (
              // 2px slab at the bottom edge. layoutId="editor-tab-active"
              // means framer-motion treats every render of this element
              // (across all five buttons) as the same node, animating
              // its position with the in-out-cubic 200ms slide.
              <motion.span
                layoutId="editor-tab-active"
                className="absolute inset-x-0 bottom-0 h-[2px] bg-fg"
                transition={{
                  type: "tween",
                  duration: 0.2,
                  ease: [0.65, 0, 0.35, 1],
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** UndoRedoButtons — paired Undo/Redo controls in the editor header.
 *  Reads canUndo/canRedo from the store so the buttons disable when the
 *  history pointer is at an end. Also catches the Ctrl+Z chord — the
 *  preview's keyboard handler already invokes the same store actions,
 *  so the buttons + keyboard are in sync. */
function UndoRedoButtons() {
  // Subscribe to historyIndex so the buttons re-render when state moves.
  const historyIndex = useEditorStore((s) => s.historyIndex);
  const historyLength = useEditorStore((s) => s.history.length);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z / Cmd+Z)"
        aria-label="Undo"
        className="h-9 w-9 p-0"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z / Cmd+Shift+Z)"
        aria-label="Redo"
        className="h-9 w-9 p-0"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** Has the user explicitly saved this CV before? Tracked per-CV in
 *  localStorage so the title prompt only fires the first time and
 *  survives reloads. Reset = clearing the key. */
function readSavedFlag(resumeId: string | null): boolean {
  if (!resumeId || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`slothcv.saved.${resumeId}`) === "1";
  } catch {
    return false;
  }
}
function writeSavedFlag(resumeId: string) {
  try {
    window.localStorage.setItem(`slothcv.saved.${resumeId}`, "1");
  } catch {
    // localStorage may be unavailable (private mode); fall through.
  }
}

/** SaveNowButton — the ONLY path to persist a CV's data to Supabase.
 *
 *  Auto-save was removed (see store/editor.ts) because it surprised
 *  users who were experimenting with templates and didn't want their
 *  exploration committed. Saving is now explicit:
 *
 *    - First save in a session: opens a title prompt. The CV becomes
 *      "named" and is written to Supabase.
 *    - Subsequent saves: just flush, no prompt.
 *    - Disabled when nothing to save (status === "saved" / "idle").
 *
 *  The persistent "has been saved" flag lives in localStorage so it
 *  survives reloads. Once a user has named a CV, hitting Save just
 *  saves — they don't get nagged again. They can rename via Settings.
 */
function SaveNowButton({ resumeId }: { resumeId: string | null }) {
  const status = useEditorStore((s) => s.saveStatus);
  const setTitle = useEditorStore((s) => s.setTitle);
  const { t } = useLanguage();
  const prompt = usePrompt();
  const dirtyOrError: SaveStatus[] = ["dirty", "error", "saving"];
  const enabled = dirtyOrError.includes(status) && !!resumeId;
  return (
    <Button
      type="button"
      size="sm"
      variant={status === "dirty" || status === "error" ? "default" : "outline"}
      disabled={!enabled}
      onClick={async () => {
        if (!resumeId) return;
        try {
          // First-save title prompt. We use localStorage as the
          // "has-been-saved" cache because it survives reloads cheaply
          // — this prompt is purely UX, not a security boundary.
          if (!readSavedFlag(resumeId)) {
            const title = await prompt({
              title: t("save.namePromptTitle"),
              description: t("save.namePromptDesc"),
              inputLabel: t("save.namePromptLabel"),
              placeholder: "e.g. Marketing CV — 2026",
              confirmLabel: t("save.namePromptConfirm"),
              cancelLabel: t("common.cancel"),
              required: true,
              maxLength: 120,
            });
            // Cancelled — bail without saving.
            if (!title) return;
            await renameResume(resumeId, title);
            // Mirror the just-named title into the store so the editor
            // header updates immediately (renameResume only touches the DB).
            setTitle(title);
            writeSavedFlag(resumeId);
          }
          await flushPendingSave();
          toast.success(t("save.savedNow"));
        } catch (e) {
          toast.error(translateError(e, t, "save.error"));
        }
      }}
      title={t("save.saveNow")}
    >
      <Save className="h-4 w-4" />
      <span className="hidden md:inline">{t("save.saveNow")}</span>
    </Button>
  );
}

/**
 * Phones get a "use a computer" notice instead of the editor. The two-pane
 * builder (structured form + live A4 preview + drag-to-arrange) is genuinely
 * unusable at phone widths, so we don't render it there at all.
 *
 * The 767px cutoff is one pixel below Tailwind's `md` (768px) — the exact
 * breakpoint the editor's own layout switches on — so there's never a gap
 * where a cramped single-pane editor could leak through.
 *
 * Returns `null` until mounted so the prerendered HTML and the first client
 * render agree (no hydration mismatch); the effect resolves it immediately
 * after, and keeps it live so resizing the window across the breakpoint
 * flips between the editor and the notice.
 */
function useIsPhoneViewport(): boolean | null {
  const [isPhone, setIsPhone] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsPhone(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isPhone;
}

function DesktopOnlyNotice() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface-hover text-fg">
        <Monitor className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="text-lg font-semibold text-fg">
        {t("editor.desktopOnly.title")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {t("editor.desktopOnly.body")}
      </p>
      <Link href="/dashboard" className="mt-6">
        <Button variant="outline">
          <ArrowLeft className="h-4 w-4" />
          {t("editor.backToDashboard")}
        </Button>
      </Link>
    </div>
  );
}

function EditorGate() {
  const isPhone = useIsPhoneViewport();
  const { t } = useLanguage();
  // Pre-hydration placeholder — same neutral "loading" the rest of the app
  // uses, so neither the notice nor the editor flashes before we know the
  // viewport.
  if (isPhone === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-subtle">
        {t("common.loading")}
      </div>
    );
  }
  if (isPhone) return <DesktopOnlyNotice />;
  return (
    <AuthGate>
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-subtle">
            Loading…
          </div>
        }
      >
        <EditorInner />
      </Suspense>
    </AuthGate>
  );
}

export default function EditorPage() {
  return <EditorGate />;
}
