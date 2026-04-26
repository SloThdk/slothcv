/**
 * SectionActions — floating ↑ ↓ ✕ overlay that appears on hover over a
 * template section, lets the user reorder + delete sections directly from
 * the live preview without leaving for the left pane.
 *
 * Designed to be embedded as a child of any template's section wrapper.
 * The wrapper MUST:
 *   - have `position: relative` (most do via `break-inside-avoid` already)
 *   - carry the `group` class so `group-hover:` reveals the overlay
 *   - have `data-section-id={section.id}` so the parent <Preview>'s
 *     click delegation can also work
 *
 * Buttons stop click propagation so clicking ↑ doesn't ALSO trigger the
 * "click section to edit" jump.
 */

"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { arrayMove } from "@dnd-kit/sortable";
import { useEditorStore } from "@/lib/store/editor";
import { useConfirm } from "@/components/ui/confirm-modal";
import type { Section } from "@/types/resume";

export function SectionActions({ section }: { section: Section }) {
  const sections = useEditorStore((s) => s.data.sections);
  const setSections = useEditorStore((s) => s.setSections);
  const removeSection = useEditorStore((s) => s.removeSection);
  const confirm = useConfirm();

  const idx = sections.findIndex((s) => s.id === section.id);
  // If the section isn't in the array (rare — race during reorder) bail.
  if (idx < 0) return null;
  const canUp = idx > 0;
  const canDown = idx < sections.length - 1;

  function stop(e: React.MouseEvent) {
    e.stopPropagation();
  }

  async function onDelete(e: React.MouseEvent) {
    stop(e);
    const ok = await confirm({
      title: `Delete "${section.title}"?`,
      description:
        "This removes the section and all its content. You can add a new one later, but this content will be gone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (ok) removeSection(section.id);
  }

  return (
    <div
      // Floats just inside the top-right corner. Hidden by default; visible
      // when the section is hovered (handled by the parent's `group` class).
      // pointer-events-auto here override the templates' click delegation.
      className="pointer-events-none absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100"
      onClick={stop}
    >
      <ActionBtn
        label="Move up"
        disabled={!canUp}
        onClick={(e) => {
          stop(e);
          if (canUp) setSections(arrayMove(sections, idx, idx - 1));
        }}
      >
        <ArrowUp className="h-3 w-3" />
      </ActionBtn>
      <ActionBtn
        label="Move down"
        disabled={!canDown}
        onClick={(e) => {
          stop(e);
          if (canDown) setSections(arrayMove(sections, idx, idx + 1));
        }}
      >
        <ArrowDown className="h-3 w-3" />
      </ActionBtn>
      <ActionBtn label={`Delete ${section.title}`} tone="danger" onClick={onDelete}>
        <X className="h-3 w-3" />
      </ActionBtn>
    </div>
  );
}

function ActionBtn({
  label,
  disabled,
  onClick,
  tone,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: (e: React.MouseEvent) => void;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface/95 shadow-sm backdrop-blur transition-all hover:scale-110 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${
        tone === "danger"
          ? "text-red-600 hover:border-red-200 hover:bg-red-50"
          : "text-fg hover:border-strong"
      }`}
    >
      {children}
    </button>
  );
}
