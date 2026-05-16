/**
 * TemplatesTab — gallery of templates. Click swaps the active template
 * INSTANTLY (no modal, no auto-side-effects) and shows a single toast
 * with two opt-in actions: Undo + "Save as variant".
 *
 * Why this shape (and not the previous confirm-modal-+-auto-snapshot):
 *
 *   1. Auto-saving the current state to a NEW variant on every swap
 *      surprised users — they pressed "Switch template" expecting a
 *      template change, then later saw their dashboard cluttered with
 *      "<old template> · <date>" rows they never asked for. The auto
 *      backup was well-intentioned (don't lose decorated work) but
 *      paternalistic — Figma / Canva / Notion all let bold actions go
 *      through instantly with an undo affordance, not a modal + cleanup
 *      cost the user has to discover later.
 *
 *   2. Undo (Cmd-Z / Ctrl-Z) already restores the full pre-swap state
 *      — template + sections + design + custom elements + position
 *      overrides — because the editor store snapshots `data` on every
 *      mutation. So "I picked the wrong template" is a single keystroke
 *      to revert.
 *
 *   3. For the rare power user who DID want both versions kept, the
 *      toast offers a one-click "Save as variant" action. It captures
 *      the pre-swap snapshot at click-time on the gallery card (BEFORE
 *      `setTemplate` mutates the store) and passes it to
 *      `duplicateAsVariant`, so even if auto-save has already flushed
 *      the new template to the master row, the variant clones the OLD
 *      decorated state. Zero data loss when the user explicitly opts in.
 *
 *   4. Per-template absolute-position state (toolshelf shapes,
 *      drag-position overrides, design overrides) gets stripped on
 *      swap — that lives in `setTemplate` already. Carrying it across
 *      layouts produces nonsense (px coords from a single-column flow
 *      land in the middle of a sidebar layout). Undo recovers it; the
 *      "Save as variant" snapshot preserves it.
 */

"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useEditorStore } from "@/lib/store/editor";
import { TEMPLATES, TEMPLATES_BY_ID } from "@/templates/registry";
import { duplicateAsVariant } from "@/lib/resumes";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { translateError } from "@/lib/translatable-error";
import {
  DkBadge,
  EnBadge,
  TemplateFilterTabs,
  filterTemplates,
  type TemplateRegion,
} from "@/components/templates/template-filter";
import { TemplatePreview } from "./template-preview";
import { staggerContainer, staggerItem } from "@/lib/motion";

/** Stable id for the swap toast — passing the same id on every swap
 *  makes Sonner replace the previous toast instead of stacking, so the
 *  user never sees a chain of "Switched to X / Switched to Y / …". */
const SWAP_TOAST_ID = "template-swap";

export function TemplatesTab() {
  const { t } = useLanguage();
  const current = useEditorStore((s) => s.data.meta.template);
  const setTemplate = useEditorStore((s) => s.setTemplate);
  const resumeId = useEditorStore((s) => s.resumeId);
  // The user's full resume data — passed to each thumbnail so the
  // gallery shows what their actual CV will look like in each layout.
  // WYSIWYG: card thumbnail must match what the editor will render
  // post-swap, so per-card sample personas are out.
  const userData = useEditorStore((s) => s.data);

  // Region filter — local state only, no URL sync. The editor URL
  // already carries `?id=<resume-id>` and we don't want to clobber
  // that when toggling pills. Default initialised to the current
  // template's pool so DA users editing a Danish CV land on the
  // Danish pool first; everyone else lands on Alle.
  const initialRegion: TemplateRegion =
    TEMPLATES.find((tpl) => tpl.id === current)?.language === "da"
      ? "da"
      : "all";
  const [region, setRegion] = useState<TemplateRegion>(initialRegion);
  const counts = useMemo(() => {
    const da = TEMPLATES.filter((tpl) => tpl.language === "da").length;
    return { all: TEMPLATES.length, da, en: TEMPLATES.length - da };
  }, []);
  const visibleTemplates = useMemo(
    () => filterTemplates(TEMPLATES, region),
    [region],
  );

  function handlePick(newTplId: string) {
    if (newTplId === current) return;

    // Capture the pre-swap state IMMEDIATELY, before setTemplate mutates
    // the store. structuredClone deep-copies so subsequent edits don't
    // bleed into the toast's "Save as variant" payload.
    const preSwapData = structuredClone(userData);
    const oldTpl = current;
    const oldTplName =
      TEMPLATES_BY_ID[oldTpl as keyof typeof TEMPLATES_BY_ID]?.name ??
      "Previous";
    const newTplName =
      TEMPLATES_BY_ID[newTplId as keyof typeof TEMPLATES_BY_ID]?.name ??
      "the new template";

    // Whether there's anything visually distinctive about the pre-swap
    // state worth preserving. If there are no custom elements / drag
    // overrides / design overrides, "Save as variant" would just clone a
    // near-empty CV and clutter the dashboard — so we suppress the
    // action in that case. Same guard as the old modal used.
    const hasDecoration =
      (preSwapData.customElements ?? []).length > 0 ||
      Object.keys(preSwapData.elementOverrides ?? {}).length > 0 ||
      preSwapData.sections.some((s) => s.position || s.overrides);

    // Apply the swap. Auto-save (800 ms debounce) will flush the new
    // template state to the live row shortly. Undo, if invoked, rolls
    // the store back to the pre-swap snapshot which the next debounced
    // save then re-flushes — so undo also "untransfers" in the DB.
    setTemplate(newTplId as Parameters<typeof setTemplate>[0]);

    // Single toast with up to two actions. We don't gate on
    // saveStatus === "dirty" any more — auto-save has already (or
    // will shortly) persist whatever the user typed. There's no
    // "discard the unsaved part" semantics in an autosaving editor;
    // the only mental model that's true is "everything is always
    // saved, undo to revert". Saying "unsaved changes will be lost"
    // would be a lie.
    toast(t("templates.swap.switched", { name: newTplName }), {
      id: SWAP_TOAST_ID,
      duration: 8000, // 8s — long enough to read, short enough to not nag.
      description: hasDecoration
        ? t("templates.swap.shapesCleared", { name: oldTplName })
        : undefined,
      action: {
        label: t("templates.swap.undo"),
        onClick: () => {
          // Editor store's undo() rolls back one history step. It
          // restores `data` (which includes template + customElements
          // + overrides), so a single click reverses everything the
          // swap touched.
          useEditorStore.getState().undo();
          toast.success(t("templates.swap.reverted", { name: oldTplName }), {
            id: SWAP_TOAST_ID,
            duration: 3000,
          });
        },
      },
      // Sonner only supports a single `action`. The "Save as variant"
      // affordance is wired as a `cancel` button — Sonner renders it
      // alongside `action`, and we hijack the onClick to do work
      // instead of dismissing. Only shown when there's something
      // worth preserving.
      cancel: hasDecoration
        ? {
            label: t("templates.swap.saveAsVariant"),
            onClick: () => {
              if (!resumeId) {
                toast.error(t("templates.swap.cantSaveBeforeLoad"));
                return;
              }
              const stamp = new Date().toLocaleDateString();
              const label = `${oldTplName} · ${stamp}`;
              // Async fire-and-forget. The toast itself is the
              // progress indicator — show "saving" then resolve to
              // success / error in place.
              toast.loading(
                t("templates.swap.savingVariant", { name: oldTplName }),
                { id: SWAP_TOAST_ID },
              );
              duplicateAsVariant(resumeId, label, { snapshot: preSwapData })
                .then(() => {
                  toast.success(
                    t("templates.swap.savedVariant", { name: oldTplName }),
                    { id: SWAP_TOAST_ID, duration: 4000 },
                  );
                })
                .catch((e: unknown) => {
                  // Use the i18n-aware reason mapping. translateError
                  // resolves TranslatableError keys; plain Errors
                  // surface their message verbatim (typical Supabase
                  // path). Fall back to the generic save-failed copy
                  // when there's no message at all.
                  const reason = translateError(
                    e,
                    t,
                    "templates.swap.saveFailed",
                  );
                  // If translateError returned the fallback, use the
                  // longer copy as-is. Otherwise prepend the localised
                  // "Couldn't save variant: " prefix.
                  const message =
                    reason === t("templates.swap.saveFailed")
                      ? reason
                      : t("templates.swap.saveFailedReason", { reason });
                  toast.error(message, {
                    id: SWAP_TOAST_ID,
                    duration: 6000,
                  });
                });
            },
          }
        : undefined,
    });
  }

  return (
    <div>
      <p className="mb-3 text-xs text-muted">{t("templates.swap.intro")}</p>
      {/* Region filter — sits between the intro line and the gallery.
          Compact (no counts here — the panel is narrow) so the pills
          don't fight for space with the card grid below. */}
      <div className="mb-3">
        <TemplateFilterTabs active={region} onChange={setRegion} counts={counts} />
      </div>
      {visibleTemplates.length === 0 && (
        <p className="mt-6 text-center text-xs text-muted">
          {t("templates.filter.empty")}
        </p>
      )}
      {/* Stagger entrance — when the user opens the Templates tab the
          cards cascade in 30ms apart. Quick enough that 50 templates
          finish in well under a second; just enough to feel alive.
          Map var renamed `tpl` so it doesn't shadow the outer `t`
          translation function. */}
      <motion.div
        variants={staggerContainer(0.03)}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3"
      >
        {visibleTemplates.map((tpl) => (
          <motion.button
            key={tpl.id}
            type="button"
            variants={staggerItem}
            // Hover scale + ring-fade. Press feedback on tap. Both
            // run on transform/opacity only — no layout shift.
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => handlePick(tpl.id)}
            className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-surface text-left transition-shadow duration-200 hover:shadow-md ${current === tpl.id ? "border-fg ring-2 ring-fg" : "border-border"}`}
          >
            {/* Thumbnail wrapper made `relative` so the DK badge can
                position absolutely top-right inside it. Aspect MUST
                match the real A4 page ratio (210/297) — see history
                comment below the wrapper. */}
            <div className="relative">
              {/* Aspect MUST match the real A4 page ratio (210/297). Earlier
                  code overrode this to aspect-[3/4] to make cards more compact,
                  but that clips the bottom 6% of every template — users picked
                  a template that looked one way in the thumbnail, then saw
                  content they hadn't seen in the gallery once selected. The
                  A4 ratio is also what TemplatePreview's internal width-based
                  scale loop assumes; any other ratio either clips the page
                  (taller-than-A4 ratio) or wastes horizontal space (wider).
                  Passing `data={userData}` ensures every card renders the
                  user's REAL content with the card's layout — no surprise
                  personas / stock avatars in the thumbnail that vanish on
                  selection. */}
              <TemplatePreview
                id={tpl.id}
                className="aspect-[210/297] w-full"
                data={userData}
              />
              {tpl.language === "da" ? <DkBadge /> : <EnBadge />}
            </div>
            <div className="p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{tpl.name}</span>
                {current === tpl.id && (
                  <Check className="h-4 w-4 text-fg" />
                )}
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted">
                {tpl.blurb}
              </p>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
