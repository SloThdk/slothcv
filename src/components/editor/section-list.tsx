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
    // lands on the *expanded* size, not the collapsed one.
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
        }
        // Clear the pending jump so a re-render doesn't re-scroll.
        requestJumpToSection(null);
      });
    });
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

  return (
    <div ref={listRef} className="space-y-1.5">
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
              {SECTION_OPTIONS.map((typ) => (
                <Button
                  key={typ}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const id = addSection(typ);
                    setShowAdd(false);
                    setExpanded(id);
                  }}
                >
                  {t(SECTION_TKEY[typ])}
                </Button>
              ))}
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
