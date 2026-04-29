/**
 * LayersPanel — Photoshop-style unified view of every visual layer in
 * the active CV.
 *
 * Why:
 *   In addition to a Content tab (sections form-style) and an Add tab
 *   (toolshelf for new elements), users want a single bird's-eye list
 *   where they can reorder z-index of floating shapes, toggle visibility,
 *   click into any element, and re-stack — exactly like Photoshop /
 *   Figma / Affinity. Without this view, customising z-order required
 *   selecting an element on canvas and using Ctrl+] / Ctrl+[ chord by
 *   chord, which doesn't scale past 3-4 elements.
 *
 * Two stacks:
 *   1. FLOATING ELEMENTS — `data.customElements`, ordered by `z` descending
 *      (topmost first, matches Photoshop). Drag-to-reorder rewrites every
 *      element's z so the visual stack matches the list order.
 *   2. DOCUMENT SECTIONS — `data.sections`, ordered by their array index
 *      (top of CV first). Drag-to-reorder writes the new array order back
 *      via setSections, the same path the Content tab uses, so behaviour
 *      stays identical.
 *
 * Both stacks share:
 *   - Visibility eye icon (toggle)
 *   - Drag handle on the left
 *   - Click anywhere on the row → selects in canvas + jumps to the
 *     element's natural editing surface (form for sections, inspector
 *     for customs)
 *   - Active highlight when the element is currently selected
 *
 * Selection sync:
 *   - Selecting a custom element on the canvas → row highlights here
 *   - Selecting a section in the form → row highlights here (via
 *     `pendingJumpId` from the store)
 *
 * Locks / groups / nested layers:
 *   v1 ships visibility + reorder. Lock + group are listed in the
 *   "Out of scope (intentional)" section in this file's header comment
 *   so future maintainers know they're missing on purpose.
 */

"use client";

import { useMemo } from "react";
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
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Layers as LayersIcon,
  Minus,
  Square,
  Star,
  Type as TypeIcon,
} from "lucide-react";
import { useEditorStore } from "@/lib/store/editor";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type {
  CustomElement,
  CustomElementKind,
  Section,
  SectionType,
} from "@/types/resume";
import type { TranslationKey } from "@/lib/i18n/translations";

// ---------- Section labels ----------

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

// ---------- Per-kind label + icon for floating elements ----------

/** Small lucide icon per element kind so the row reads at a glance like
 *  a Photoshop/Figma layer. We deliberately don't render a thumbnail of
 *  the actual shape — that requires SVG rasterisation per row, costs CPU,
 *  and at 14×14 tells the user nothing they can't get from the icon. */
function elementIcon(kind: CustomElementKind): React.ReactNode {
  switch (kind) {
    case "text":
      return <TypeIcon className="h-3.5 w-3.5" aria-hidden />;
    case "image":
      return <ImageIcon className="h-3.5 w-3.5" aria-hidden />;
    case "line":
      return <Minus className="h-3.5 w-3.5" aria-hidden />;
    case "icon":
      return <Star className="h-3.5 w-3.5" aria-hidden />;
    default:
      return <Square className="h-3.5 w-3.5" aria-hidden />;
  }
}

/** Best-effort display name for a layer row. Text elements show their
 *  first line truncated; images show "Image (filename)" if we can pull
 *  one; icons show the brand name; shapes show their kind. */
function elementLabel(
  el: CustomElement,
  fallback: { shape: string; text: string; image: string; line: string; icon: string },
): string {
  if (el.kind === "text") {
    const t = (el as { text?: string }).text?.trim() ?? "";
    if (t) {
      // Take the first line so the row stays single-height.
      const firstLine = t.split(/\r?\n/)[0]!;
      return firstLine.length > 32 ? `${firstLine.slice(0, 30)}…` : firstLine;
    }
    return fallback.text;
  }
  if (el.kind === "image") {
    // ImageElement has `url`. Try to pull the filename out of the URL
    // as a hint; otherwise fall back to the i18n label.
    const url = (el as { url?: string }).url ?? "";
    if (url) {
      const last = url.split("/").pop() ?? "";
      const noQs = last.split("?")[0]!;
      if (noQs && noQs.length < 32) return noQs;
    }
    return fallback.image;
  }
  if (el.kind === "icon") {
    const iconName = (el as { iconName?: string }).iconName ?? "";
    if (iconName) {
      // Title-case "linked-in" → "Linked in".
      return iconName.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return fallback.icon;
  }
  if (el.kind === "line") return fallback.line;
  // Polygon-family shapes — use the kind as the visible label so users
  // can tell "Hexagon" from "Triangle" at a glance.
  return el.kind.charAt(0).toUpperCase() + el.kind.slice(1);
}

// ---------- LayersPanel ----------

export function LayersPanel() {
  const { t } = useLanguage();
  const customElements = useEditorStore((s) => s.data.customElements ?? []);
  const sections = useEditorStore((s) => s.data.sections);
  const selectedElementId = useEditorStore((s) => s.selectedElementId);
  const selectElement = useEditorStore((s) => s.selectElement);
  const updateCustomElement = useEditorStore((s) => s.updateCustomElement);
  const setSections = useEditorStore((s) => s.setSections);
  const toggleSectionVisible = useEditorStore((s) => s.toggleSectionVisible);
  const requestJumpToSection = useEditorStore((s) => s.requestJumpToSection);

  // Floating elements — sorted by z descending so the topmost layer
  // (highest z, nearest to the viewer) appears at the TOP of the list,
  // matching Photoshop / Figma / Sketch / Affinity convention. Reverse
  // of how `customElements` is stored (which is insertion order).
  const floatingSorted = useMemo(
    () => [...customElements].sort((a, b) => b.z - a.z),
    [customElements],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Drag-to-reorder for floating elements. We rewrite every element's
   *  `z` so the visible stack matches the new visual order. Higher index
   *  in the sorted list (closer to top of the panel) means HIGHER z.
   *  We assign descending integers from the highest existing z so the
   *  numeric distances stay sane on repeated reorders. */
  function onFloatingDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = floatingSorted.findIndex((el) => el.id === active.id);
    const newIndex = floatingSorted.findIndex((el) => el.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(floatingSorted, oldIndex, newIndex);
    // Assign z values: top of list (index 0) gets the highest z.
    // We use `reordered.length - i` so indices map to monotone-decreasing
    // positive integers — keeps z values bounded and predictable across
    // reorders. Existing z values get fully replaced; we don't try to
    // preserve old gaps (which had no semantic meaning anyway).
    const total = reordered.length;
    for (let i = 0; i < total; i++) {
      const el = reordered[i]!;
      const newZ = total - i;
      if (el.z !== newZ) {
        updateCustomElement(el.id, { z: newZ });
      }
    }
  }

  /** Drag-to-reorder sections. Mirrors what the Content tab's
   *  SectionList does — same setSections call, same arrayMove utility,
   *  so reorder via Layers panel and reorder via Content tab produce
   *  identical store outcomes. */
  function onSectionDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setSections(arrayMove(sections, oldIndex, newIndex));
  }

  // Empty state — when neither stack has anything, point users to the
  // Add tab so they understand where to go. Sections always exist on
  // hydrate (default sections seed the data), so this fires only on the
  // pathological "everything deleted" path; we handle it for completeness.
  if (floatingSorted.length === 0 && sections.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-strong bg-surface p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-hover text-fg ring-1 ring-border">
            <LayersIcon className="h-4 w-4" aria-hidden />
          </span>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-fg">{t("layers.title")}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {t("layers.empty")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Floating elements (z-ordered top-to-bottom = top-z-first) ─── */}
      {floatingSorted.length > 0 && (
        <section>
          <div className="mb-1.5 flex items-center justify-between px-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {t("layers.floating")}
            </h3>
            <span className="text-[10px] text-subtle">
              {floatingSorted.length}
            </span>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onFloatingDragEnd}
          >
            <SortableContext
              items={floatingSorted.map((el) => el.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {floatingSorted.map((el) => (
                  <FloatingRow
                    key={el.id}
                    element={el}
                    selected={selectedElementId === el.id}
                    onSelect={() => selectElement(el.id)}
                    onToggleVisible={() =>
                      updateCustomElement(el.id, { visible: !el.visible })
                    }
                    label={elementLabel(el, {
                      shape: t("layers.unnamedShape"),
                      text: t("layers.unnamedText"),
                      image: t("layers.unnamedImage"),
                      line: t("layers.unnamedLine"),
                      icon: t("layers.unnamedIcon"),
                    })}
                    visibleHint={t("layers.visible")}
                    hiddenHint={t("layers.hidden")}
                    dragHint={t("layers.dragHint")}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>
      )}

      {/* ─── Document sections (flow order, top of CV first) ─── */}
      {sections.length > 0 && (
        <section>
          <div className="mb-1.5 flex items-center justify-between px-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {t("layers.sections")}
            </h3>
            <span className="text-[10px] text-subtle">{sections.length}</span>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onSectionDragEnd}
          >
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {sections.map((s) => (
                  <SectionRow
                    key={s.id}
                    section={s}
                    label={t(SECTION_TKEY[s.type])}
                    onSelect={() => {
                      // Clear any custom selection so the inspector
                      // closes, then jump the Content tab's section list
                      // to this section. The page-level effect that
                      // listens for `pendingJumpId` will switch tabs.
                      selectElement(null);
                      requestJumpToSection(s.id);
                    }}
                    onToggleVisible={() => toggleSectionVisible(s.id)}
                    visibleHint={t("layers.visible")}
                    hiddenHint={t("layers.hidden")}
                    dragHint={t("layers.dragHint")}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>
      )}
    </div>
  );
}

// ---------- Row components ----------

function FloatingRow({
  element,
  selected,
  onSelect,
  onToggleVisible,
  label,
  visibleHint,
  hiddenHint,
  dragHint,
}: {
  element: CustomElement;
  selected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  label: string;
  visibleHint: string;
  hiddenHint: string;
  dragHint: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 rounded-md border px-1.5 py-1 transition-colors ${selected ? "border-fg bg-surface ring-1 ring-fg" : "border-border bg-surface/60 hover:bg-surface"}`}
    >
      <button
        type="button"
        aria-label={dragHint}
        title={dragHint}
        className="flex h-7 w-5 cursor-grab items-center justify-center text-subtle hover:text-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={element.visible ? visibleHint : hiddenHint}
        title={element.visible ? visibleHint : hiddenHint}
        onClick={onToggleVisible}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-subtle hover:bg-surface-hover hover:text-fg"
      >
        {element.visible ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5 opacity-60" />
        )}
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 items-center gap-1.5 truncate text-left"
      >
        <span className="text-subtle">{elementIcon(element.kind)}</span>
        <span
          className={`truncate text-[12px] ${element.visible ? "text-fg" : "text-subtle line-through"}`}
        >
          {label}
        </span>
      </button>
    </div>
  );
}

function SectionRow({
  section,
  label,
  onSelect,
  onToggleVisible,
  visibleHint,
  hiddenHint,
  dragHint,
}: {
  section: Section;
  label: string;
  onSelect: () => void;
  onToggleVisible: () => void;
  visibleHint: string;
  hiddenHint: string;
  dragHint: string;
}) {
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
      style={style}
      className="flex items-center gap-1.5 rounded-md border border-border bg-surface/60 px-1.5 py-1 transition-colors hover:bg-surface"
    >
      <button
        type="button"
        aria-label={dragHint}
        title={dragHint}
        className="flex h-7 w-5 cursor-grab items-center justify-center text-subtle hover:text-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={section.visible ? visibleHint : hiddenHint}
        title={section.visible ? visibleHint : hiddenHint}
        onClick={onToggleVisible}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-subtle hover:bg-surface-hover hover:text-fg"
      >
        {section.visible ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5 opacity-60" />
        )}
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 items-center gap-1.5 truncate text-left"
      >
        <span
          className={`truncate text-[12px] ${section.visible ? "text-fg" : "text-subtle line-through"}`}
        >
          {section.title || label}
        </span>
        <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-subtle">
          {label}
        </span>
      </button>
    </div>
  );
}
