/** Hobbies section editor — flat list of strings + drag-to-reorder.
 *
 *  Same drag-to-reorder pattern as skills / languages. The only field
 *  per row is the hobby text, so the row is simpler.
 */

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
import type { HobbiesSection } from "@/types/resume";
import { defaultHobbyItem } from "@/lib/resume-defaults";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddEntryButton } from "./shared";

export function HobbiesForm({ section }: { section: HobbiesSection }) {
  const update = useEditorStore((s) => s.updateSection);
  const setItems = (items: HobbiesSection["items"]) =>
    update<HobbiesSection>(section.id, { items });

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
            <SortableHobbyRow
              key={it.id}
              item={it}
              onChange={(text) => {
                const next = [...section.items];
                next[idx] = { ...it, text };
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
        label="Add hobby"
        onClick={() => setItems([...section.items, defaultHobbyItem()])}
      />
    </div>
  );
}

function SortableHobbyRow({
  item,
  onChange,
  onRemove,
}: {
  item: HobbiesSection["items"][number];
  onChange: (text: string) => void;
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
        value={item.text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Photography, woodwork, …"
        className="flex-1 h-9 text-sm"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Remove hobby"
        className="h-8 w-8"
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5 text-subtle" />
      </Button>
    </div>
  );
}
