/** Languages section editor — name + proficiency text + (conditional) 0–5 level + drag-reorder.
 *
 *  The 0–5 level slider is only meaningful for templates that VISUALIZE
 *  the level — `bar` and `dots`. The `cefr-badges` style draws the
 *  proficiency text in a colored chip and ignores level; `text` just
 *  shows the proficiency text. In both cases the slider was a dead
 *  control before this change. We now hide it and surface a hint that
 *  the language style needs to change for level to render.
 *
 *  Drag-to-reorder via @dnd-kit/sortable mirrors the skills form so the
 *  user can reshuffle without clearing fields. */

"use client";

import { GripVertical, Trash2 } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEditorStore } from "@/lib/store/editor";
import type { LanguagesSection, Section } from "@/types/resume";
import { resolveDesign } from "@/templates/shared";
import { defaultLanguageItem } from "@/lib/resume-defaults";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddEntryButton } from "./shared";

/** Language styles that ACTUALLY use the level value. */
const LEVEL_STYLES = new Set(["bar", "dots"]);

/** CEFR self-assessment ladder + the conventional "Native" peak. Order
 *  matters: this is the order the chips render in (A1 → C2 → Native),
 *  matching the official CEFR scale + the universal "best at the end"
 *  reading direction. Clicking a chip writes its label into
 *  `proficiency`; free text in the input is preserved if the user
 *  types something off-ladder ("Conversational", "Bilingual"). */
const CEFR_QUICK_PICKS = ["A1", "A2", "B1", "B2", "C1", "C2", "Native"] as const;

/** CEFR label → 0-5 level mapping for templates that visualise level
 *  alongside (or instead of) the text. A1 = 1 (lowest non-zero), C2 = 5
 *  (highest before Native), Native = 5 (also max). Picked from CEFR's
 *  self-assessment scale: A* = basic, B* = independent, C* = proficient. */
const CEFR_TO_LEVEL: Record<string, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 4,
  C2: 5,
  Native: 5,
};

export function LanguagesForm({ section }: { section: LanguagesSection }) {
  const update = useEditorStore((s) => s.updateSection);
  const design = useEditorStore((s) => s.data.design);
  const resolved = resolveDesign(design, section as Section);
  const showLevel = LEVEL_STYLES.has(resolved.languageStyle);
  const setItems = (items: LanguagesSection["items"]) =>
    update<LanguagesSection>(section.id, { items });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = section.items.findIndex((i) => i.id === active.id);
    const newIdx = section.items.findIndex((i) => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    setItems(arrayMove(section.items, oldIdx, newIdx));
  }

  return (
    <div className="space-y-1.5">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={section.items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {section.items.map((it, idx) => (
            <SortableLanguageRow
              key={it.id}
              item={it}
              showLevel={showLevel}
              fieldId={`section.${section.id}.item.${it.id}`}
              onChange={(patch) => {
                const next = [...section.items];
                next[idx] = { ...it, ...patch };
                setItems(next);
              }}
              onRemove={() =>
                setItems(section.items.filter((_, i) => i !== idx))
              }
            />
          ))}
        </SortableContext>
      </DndContext>
      <AddEntryButton
        label="Add language"
        onClick={() => setItems([...section.items, defaultLanguageItem()])}
      />
      <p className="text-[11px] text-subtle">
        {showLevel
          ? "Drag the handle on the left to reorder."
          : "This template's language style (" +
            resolved.languageStyle +
            ") shows the proficiency text only — switch to bar / dots in Design to enable the level slider. Drag the handle on the left to reorder."}
      </p>
    </div>
  );
}

function SortableLanguageRow({
  item,
  showLevel,
  onChange,
  onRemove,
  fieldId,
}: {
  item: LanguagesSection["items"][number];
  showLevel: boolean;
  onChange: (patch: Partial<LanguagesSection["items"][number]>) => void;
  onRemove: () => void;
  /** Click-to-jump target matching the chip's template element-id. */
  fieldId?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const trimmedProf = item.proficiency.trim();
  return (
    <div
      ref={setNodeRef}
      data-field-id={fieldId}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="space-y-1.5 rounded-md border border-transparent px-1 py-1 hover:border-border"
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Drag to reorder"
          title="Drag to reorder"
          className="cursor-grab touch-none rounded p-1 text-subtle hover:bg-surface-hover hover:text-fg active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <Input
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Language"
          className="flex-1 h-9 text-sm"
        />
        <Input
          value={item.proficiency}
          onChange={(e) => onChange({ proficiency: e.target.value })}
          placeholder="C1 / Fluent"
          className="h-9 max-w-[110px] text-sm"
        />
        {showLevel && (
          <input
            type="range"
            min={0}
            max={5}
            value={item.level}
            onChange={(e) => onChange({ level: Number(e.target.value) })}
            className="w-20"
            aria-label="Level"
            title={`Level ${item.level}/5`}
          />
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Remove language"
          className="h-8 w-8"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5 text-subtle" />
        </Button>
      </div>
      {/* CEFR quick-pick chips. Click sets proficiency text + matching
          0-5 level in one undo step. Active chip is highlighted so the
          user knows which level is currently set. Free-text in the
          input still wins — users typing "Conversational" or
          "Bilingual" keep their custom label and no chip lights up. */}
      <div className="flex flex-wrap items-center gap-1 pl-7">
        {CEFR_QUICK_PICKS.map((label) => {
          const active = trimmedProf === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() =>
                onChange({
                  proficiency: label,
                  level: CEFR_TO_LEVEL[label] ?? item.level,
                })
              }
              title={
                active
                  ? `${label} — current proficiency`
                  : `Set proficiency to ${label}`
              }
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "bg-surface-hover text-muted hover:bg-surface hover:text-fg"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
