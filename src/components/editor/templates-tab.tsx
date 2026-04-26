/**
 * TemplatesTab — gallery of templates. Click swaps the active template.
 *
 * The first time a user switches templates we pop a confirm modal so they
 * understand that the *content* is preserved but the *presentation* changes.
 * Subsequent swaps are silent (modal is suppressed for the rest of the
 * session via local state).
 */

"use client";

import { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEditorStore } from "@/lib/store/editor";
import { TEMPLATES, TEMPLATES_BY_ID } from "@/templates/registry";
import { Button } from "@/components/ui/button";
import { TemplatePreview } from "./template-preview";
import {
  backdrop,
  modalPanel,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";

export function TemplatesTab() {
  const current = useEditorStore((s) => s.data.meta.template);
  const setTemplate = useEditorStore((s) => s.setTemplate);
  // Read save status so the swap modal can warn the user when they're
  // about to throw away unsaved work.
  const saveStatus = useEditorStore((s) => s.saveStatus);
  // Always confirm — earlier UX silently swapped after the first time
  // and that surprised users who were just exploring (auto-save then
  // pinned them to whatever they last clicked). Now every swap is
  // explicit; the modal also reminds them what swapping resets.
  const [pending, setPending] = useState<string | null>(null);

  function pick(id: string) {
    if (id === current) return;
    setPending(id);
  }

  function confirm() {
    if (!pending) return;
    setTemplate(pending as Parameters<typeof setTemplate>[0]);
    setPending(null);
  }

  return (
    <div>
      <p className="mb-3 text-xs text-muted">
        Pick a template. Your content stays intact — only the layout changes.
      </p>
      {/* Stagger entrance — when the user opens the Templates tab the
          cards cascade in 30ms apart. Quick enough that 50 templates
          finish in well under a second; just enough to feel alive. */}
      <motion.div
        variants={staggerContainer(0.03)}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3"
      >
        {TEMPLATES.map((t) => (
          <motion.button
            key={t.id}
            type="button"
            variants={staggerItem}
            // Hover scale + ring-fade. Press feedback on tap. Both
            // run on transform/opacity only — no layout shift.
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => pick(t.id)}
            className={`group relative flex flex-col overflow-hidden rounded-lg border bg-surface text-left transition-shadow duration-200 hover:shadow-md ${current === t.id ? "border-fg ring-2 ring-fg" : "border-border"}`}
          >
            <TemplatePreview id={t.id} className="aspect-[3/4] w-full" />
            <div className="p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{t.name}</span>
                {current === t.id && (
                  <Check className="h-4 w-4 text-fg" />
                )}
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted">
                {t.blurb}
              </p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Confirm modal — every swap goes through this. The copy adapts
          based on whether the user has unsaved changes:
            - Clean: warn about positions/overrides resetting
            - Dirty: SHOUT about losing the unsaved edits, prompt them
              to save first
          AnimatePresence lets the modal mount/unmount with the standard
          backdrop-fade + panel scale-rise transitions defined in
          lib/motion. */}
      <AnimatePresence>
        {pending && (
          <motion.div
            {...backdrop}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setPending(null);
            }}
          >
            <motion.div
              {...modalPanel}
              className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-start gap-3">
              {saveStatus === "dirty" && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
              <div className="flex-1">
                <h2 className="text-base font-semibold text-fg">
                  {saveStatus === "dirty"
                    ? "Switch template — unsaved changes will be lost"
                    : `Switch to ${TEMPLATES_BY_ID[pending as keyof typeof TEMPLATES_BY_ID]?.name ?? "this template"}?`}
                </h2>
                {saveStatus === "dirty" ? (
                  <>
                    <p className="mt-1.5 text-sm text-muted">
                      You have <strong className="text-fg">unsaved changes</strong> on
                      this CV. Switching templates without saving will{" "}
                      <strong className="text-fg">discard them</strong>.
                    </p>
                    <p className="mt-2 text-[12px] text-subtle">
                      Click &ldquo;Keep editing&rdquo; below, hit{" "}
                      <kbd className="rounded bg-surface-hover px-1 font-mono text-[10px]">
                        Ctrl
                      </kbd>
                      +
                      <kbd className="rounded bg-surface-hover px-1 font-mono text-[10px]">
                        S
                      </kbd>{" "}
                      or the Save button in the header, then come back to
                      swap templates safely.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-1.5 text-sm text-muted">
                      Your content (name, summary, sections, items) is
                      safe — only the visual layout changes.
                    </p>
                    <p className="mt-2 text-[12px] text-subtle">
                      Per-section nudges (drag positions), per-section
                      design overrides, and toolshelf shape positions
                      reset on swap so they don&rsquo;t land in nonsense
                      spots in the new layout.
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPending(null)}
              >
                {saveStatus === "dirty" ? "Keep editing" : "Keep current"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={saveStatus === "dirty" ? "destructive" : "default"}
                onClick={confirm}
              >
                {saveStatus === "dirty"
                  ? "Discard & switch"
                  : "Switch template"}
              </Button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
