/**
 * SectionList — left-pane Content tab body.
 *
 * Renders the ordered list of sections with drag-to-reorder, visibility
 * toggle, delete, and click-to-expand into a per-type edit form. The "Add
 * section" menu lets the user introduce any of the 14 supported types.
 *
 * State lives in the editor store; we only hold local UI state here
 * (which row is expanded).
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEditorStore } from "@/lib/store/editor";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Section, SectionType } from "@/types/resume";
import type { TranslationKey } from "@/lib/i18n/translations";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-modal";
import { PersonalForm } from "./forms/personal-form";
import { SectionEditor } from "./forms/section-editor";

/** Map a SectionType to its translation key. */
const SECTION_TKEY: Record<SectionType, TranslationKey> = {
  summary: "section.summary",
  experience: "section.experience",
  careerBreak: "section.careerBreak",
  education: "section.education",
  skills: "section.skills",
  languages: "section.languages",
  projects: "section.projects",
  certifications: "section.certifications",
  awards: "section.awards",
  publications: "section.publications",
  volunteer: "section.volunteer",
  talks: "section.talks",
  hobbies: "section.hobbies",
  references: "section.references",
  custom: "section.custom",
};

const SECTION_OPTIONS: SectionType[] = [
  "summary",
  "experience",
  "careerBreak",
  "education",
  "skills",
  "languages",
  "projects",
  "certifications",
  "awards",
  "publications",
  "volunteer",
  "talks",
  "hobbies",
  "references",
  "custom",
];

export function SectionList() {
  const sections = useEditorStore((s) => s.data.sections);
  const setSections = useEditorStore((s) => s.setSections);
  const addSection = useEditorStore((s) => s.addSection);
  const removeSection = useEditorStore((s) => s.removeSection);
  const toggleVisible = useEditorStore((s) => s.toggleSectionVisible);
  // Active template — Blank intentionally renders no personal block + no
  // sections (it's a design-from-scratch canvas). Showing the Personal
  // form and the section list while on Blank misled users into typing
  // into fields that produced nothing in the preview. We branch here and
  // render a callout pointing to the Add tab instead. Underlying data
  // stays in the store, so swapping to any other template restores the
  // sidebar exactly as the user left it.
  const template = useEditorStore((s) => s.data.meta.template);
  const isBlank = template === "blank";
  const { t } = useLanguage();
  const confirm = useConfirm();

  const [expanded, setExpanded] = useState<string | null>("personal");
  const [showAdd, setShowAdd] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Pull the pending-jump id from the store. Two reasons we use the
  // store instead of a window event:
  //   1. Mount-race-proof — if the user is on the Design tab and clicks a
  //      section in the preview, the editor switches to Content tab and
  //      mounts SectionList. The store value is already set, so the
  //      effect below picks it up on first render.
  //   2. Survives StrictMode double-mount in dev — the store is the
  //      source of truth, no listener bookkeeping required.
  const pendingJumpId = useEditorStore((s) => s.pendingJumpId);
  const requestJumpToSection = useEditorStore((s) => s.requestJumpToSection);

  useEffect(() => {
    if (!pendingJumpId) return;
    setExpanded(pendingJumpId);
    // Two RAF passes: the first lets React render the newly-expanded
    // row's body; the second lets the layout settle so scrollIntoView
    // lands on the *expanded* size, not the collapsed one. After the
    // scroll lands, apply the slothcv-bg-flash class imperatively so
    // the user sees a brief accent-ring pulse confirming this row is
    // the one their canvas click matched. Without the flash the
    // scroll happened silently and (per Philip 2026-05-16 UX brief)
    // users couldn't tell WHICH row corresponded to their click.
    let flashTimeoutId: number | undefined;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = listRef.current?.querySelector(
          `[data-row-id="${pendingJumpId}"]`,
        );
        if (el && "scrollIntoView" in el) {
          (el as HTMLElement).scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
          (el as HTMLElement).classList.add("slothcv-bg-flash");
          flashTimeoutId = window.setTimeout(() => {
            (el as HTMLElement).classList.remove("slothcv-bg-flash");
          }, 1400);
        }
        // Clear the pending jump so a re-render doesn't re-scroll.
        requestJumpToSection(null);
      });
    });
    return () => {
      if (flashTimeoutId !== undefined) window.clearTimeout(flashTimeoutId);
    };
  }, [pendingJumpId, requestJumpToSection]);

  // Pointer sensor only triggers after 5px of movement so plain clicks on
  // child controls (eye, trash) don't accidentally start a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setSections(arrayMove(sections, oldIndex, newIndex));
  }

  // Blank template has no concept of "Personal info" or "Sections" — it's
  // a free-form canvas the user populates via the Add tab. Render an
  // explanatory callout instead of the form fields that won't surface
  // anywhere in the preview. Existing data is preserved (swap back to any
  // other template to recover it).
  if (isBlank) {
    return (
      <div ref={listRef} className="space-y-3">
        <div className="rounded-lg border border-dashed border-strong bg-surface p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-hover text-fg ring-1 ring-border">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-fg">
                {t("sections.blankTitle")}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {t("sections.blankBody")}
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-surface-hover px-2 py-1 text-[11px] font-medium text-fg">
                <Plus className="h-3 w-3" aria-hidden="true" />
                {t("sections.blankCta")}
              </p>
            </div>
          </div>
        </div>
        <p className="px-1 text-[11px] leading-relaxed text-subtle">
          {t("sections.blankPreserveHint")}
        </p>
      </div>
    );
  }

  return (
    <div ref={listRef} className="space-y-1.5">
      {/* Co-located keyframe for the jump-flash. Same shape as the one
          in design-tab.tsx — outline pulses twice in the accent colour
          6 px outside the row's bounding box so it never overlaps the
          row's own border. prefers-reduced-motion users get the
          animation collapsed by the globals.css guard. */}
      <style>{`
        @keyframes slothcv-bg-flash {
          0%, 100% { outline-color: transparent; }
          50%      { outline-color: var(--color-accent); }
        }
        .slothcv-bg-flash {
          outline: 2px solid transparent;
          outline-offset: 6px;
          border-radius: 10px;
          animation: slothcv-bg-flash 0.7s ease-in-out 2;
        }
      `}</style>
      {/* Personal info — fixed top, can't be dragged or removed. */}
      <div
        data-row-id="personal"
        className={`rounded-lg border ${expanded === "personal" ? "border-strong bg-surface" : "border-border bg-surface/60 hover:bg-surface"} `}
      >
        <button
          type="button"
          onClick={() =>
            setExpanded(expanded === "personal" ? null : "personal")
          }
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        >
          {expanded === "personal" ? (
            <ChevronDown className="h-4 w-4 text-subtle" />
          ) : (
            <ChevronRight className="h-4 w-4 text-subtle" />
          )}
          <span className="flex-1 text-sm font-medium">
            {t("sections.personal")}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-subtle">
            {t("sections.alwaysShown")}
          </span>
        </button>
        {/* Personal form expand/collapse — height animates from 0 to
            measured-auto (and back), opacity crossfades the inner
            content. This is the one place we deliberately animate
            height per spec; without it, expand looks like a hard cut.
            Animation runs ~200ms with the standard out-expo curve. */}
        <AnimatePresence initial={false}>
          {expanded === "personal" && (
            <motion.div
              key="personal-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div className="border-t border-border p-3">
                <PersonalForm />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sortable sections */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section) => (
            <SortableRow
              key={section.id}
              section={section}
              expanded={expanded === section.id}
              onExpand={() =>
                setExpanded(expanded === section.id ? null : section.id)
              }
              onToggleVisible={() => toggleVisible(section.id)}
              onDelete={async () => {
                const ok = await confirm({
                  title: t("sections.confirmDeleteTitle", {
                    name: section.title,
                  }),
                  description: t("sections.confirmDeleteDesc"),
                  confirmLabel: t("common.delete"),
                  cancelLabel: t("common.cancel"),
                  variant: "danger",
                });
                if (ok) removeSection(section.id);
              }}
              labelOverride={t(SECTION_TKEY[section.type])}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add-section CTA */}
      <div className="pt-2">
        {showAdd ? (
          <div className="rounded-lg border border-strong bg-surface p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              {t("sections.add")}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {SECTION_OPTIONS.map((typ) => {
                // Detect existing section of the same type. Skipped for
                // "custom" since users frequently want multiple custom
                // sections (e.g. "Volunteer", "Languages spoken", "Hobbies"),
                // each with a distinct user-supplied title.
                const existing =
                  typ === "custom"
                    ? null
                    : sections.find((s) => s.type === typ);
                return (
                  <Button
                    key={typ}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (existing) {
                        // Singleton dedup: expand the existing section
                        // and scroll to it instead of creating a
                        // duplicate. Without this, clicking "+ Skills"
                        // twice produces two Skills sections — the
                        // common pitfall users have reported.
                        setShowAdd(false);
                        setExpanded(existing.id);
                        requestJumpToSection(existing.id);
                        toast.message(
                          t("sections.alreadyExists", {
                            type: t(SECTION_TKEY[typ]),
                          }),
                        );
                        return;
                      }
                      const id = addSection(typ);
                      setShowAdd(false);
                      setExpanded(id);
                    }}
                    title={
                      existing
                        ? t("sections.alreadyExistsHint", {
                            type: t(SECTION_TKEY[typ]),
                          })
                        : undefined
                    }
                    className={
                      existing
                        ? "border-dashed text-muted opacity-80"
                        : undefined
                    }
                  >
                    {t(SECTION_TKEY[typ])}
                    {existing && <span className="ml-1 text-[10px]">✓</span>}
                  </Button>
                );
              })}
            </div>
            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdd(false)}
              >
                {t("sections.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="h-4 w-4" />
            {t("sections.add")}
          </Button>
        )}
      </div>
    </div>
  );
}

function SortableRow({
  section,
  expanded,
  onExpand,
  onToggleVisible,
  onDelete,
  labelOverride,
}: {
  section: Section;
  expanded: boolean;
  onExpand: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
  labelOverride: string;
}) {
  const { t } = useLanguage();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      data-row-id={section.id}
      style={style}
      className={`rounded-lg border ${expanded ? "border-strong bg-surface" : "border-border bg-surface/60 hover:bg-surface"}`}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          aria-label={t("sections.dragToReorder")}
          className="flex h-8 w-6 cursor-grab items-center justify-center text-subtle hover:text-muted active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onExpand}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-subtle" />
          ) : (
            <ChevronRight className="h-4 w-4 text-subtle" />
          )}
          <span className="text-sm font-medium">
            {section.title || labelOverride}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-subtle">
            {labelOverride}
          </span>
        </button>
        <button
          type="button"
          aria-label={
            section.visible ? t("sections.hide") : t("sections.show")
          }
          onClick={onToggleVisible}
          className="flex h-8 w-8 items-center justify-center rounded text-subtle hover:bg-surface-hover hover:text-fg"
          title={
            section.visible ? t("sections.hide") : t("sections.show")
          }
        >
          {section.visible ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          aria-label={t("sections.delete")}
          onClick={onDelete}
          className="flex h-8 w-8 items-center justify-center rounded text-subtle hover:bg-red-50 hover:text-red-600"
          title={t("sections.delete")}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {/* Section editor expand/collapse — same contract as the personal
          form above. Drag/reorder is handled by dnd-kit (untouched);
          this just animates the show/hide. */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key={`section-body-${section.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="border-t border-border p-3">
              <SectionEditor section={section} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
