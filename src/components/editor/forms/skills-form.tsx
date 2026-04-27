/** Skills section editor — name + group + (conditional) 0–5 level + drag-reorder.
 *
 *  The 0–5 level slider is only meaningful for templates that VISUALIZE
 *  the level (`bar`, `dots`, `circles`, `stars`). For `pills` and
 *  `text-only` skill bar styles the level isn't drawn anywhere — so we
 *  hide the slider in that case to remove the dead control. Switching
 *  back to a level-aware style brings the slider back automatically.
 *
 *  Items are drag-to-reorder via @dnd-kit/sortable (already used by the
 *  section list). Without this, moving "TypeScript" above "JavaScript"
 *  meant clearing both fields and retyping — frustrating once you have
 *  10+ skills. */

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
import type { Section, SkillsSection } from "@/types/resume";
import { resolveDesign } from "@/templates/shared";
import { defaultSkillItem } from "@/lib/resume-defaults";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddEntryButton } from "./shared";

/** Bar styles that ACTUALLY use the level value (so the slider is meaningful).
 *  Kept as a const set to make the intent explicit at the call site. */
const LEVEL_STYLES = new Set(["bar", "dots", "circles", "stars"]);

export function SkillsForm({ section }: { section: SkillsSection }) {
  const update = useEditorStore((s) => s.updateSection);
  // Read the live design so the level slider hides/shows in real time
  // when the user flips bar style (globally or via per-section override).
  const design = useEditorStore((s) => s.data.design);
  const resolved = resolveDesign(design, section as Section);
  const showLevel = LEVEL_STYLES.has(resolved.skillBarStyle);
  const setItems = (items: SkillsSection["items"]) =>
    update<SkillsSection>(section.id, { items });

  // Drag-reorder via @dnd-kit. 5 px activation distance keeps single-
  // click on the trash / slider from triggering an accidental drag.
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
            <SortableSkillRow
              key={it.id}
              item={it}
              showLevel={showLevel}
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
        label="Add skill"
        onClick={() => setItems([...section.items, defaultSkillItem()])}
      />
      <p className="text-[11px] text-subtle">
        {showLevel
          ? "Level 0 hides the bar/dots — useful when you just want a skill name. Drag the handle on the left to reorder."
          : "This template's skill style (" +
            resolved.skillBarStyle +
            ") doesn't show levels. Switch to bar / dots / circles / stars in Design to enable the level slider. Drag the handle on the left to reorder."}
      </p>
    </div>
  );
}

/** One sortable skill row. Uses dnd-kit's `useSortable` to wire up the
 *  drag handle. The handle is a small grip icon on the left; clicking
 *  the row body or any field doesn't drag. */
function SortableSkillRow({
  item,
  showLevel,
  onChange,
  onRemove,
}: {
  item: SkillsSection["items"][number];
  showLevel: boolean;
  onChange: (patch: Partial<SkillsSection["items"][number]>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-1.5"
    >
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
        placeholder="Skill"
        className="flex-1 h-9 text-sm"
      />
      <Input
        value={item.group}
        onChange={(e) => onChange({ group: e.target.value })}
        placeholder="Group"
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
        aria-label="Remove skill"
        className="h-8 w-8"
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5 text-subtle" />
      </Button>
    </div>
  );
}
