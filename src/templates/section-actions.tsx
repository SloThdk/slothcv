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

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { arrayMove } from "@dnd-kit/sortable";
import { useEditorStore } from "@/lib/store/editor";
import { useConfirm } from "@/components/ui/confirm-modal";
import type { Section } from "@/types/resume";

/** Section types that carry an items[] list — they get the "+ Add entry"
 *  button on hover. summary and custom omit the button: summary has a
 *  single body string, custom uses bullets that the form already
 *  manages explicitly with a different mental model. */
const ITEMS_BEARING_TYPES = new Set<Section["type"]>([
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
]);

/** Human-readable labels for the "+ Add {entry}" tooltip. Keeping the
 *  word "entry" out of the visible UI — each section gets its own
 *  domain noun so the affordance feels purpose-built ("Add education",
 *  "Add skill") rather than generic ("Add entry"). */
const ADD_LABELS: Record<Section["type"], string> = {
  summary: "Edit summary",
  experience: "Add experience",
  careerBreak: "Add career break",
  education: "Add education",
  skills: "Add skill",
  languages: "Add language",
  projects: "Add project",
  certifications: "Add certification",
  awards: "Add award",
  publications: "Add publication",
  volunteer: "Add volunteer role",
  talks: "Add talk",
  hobbies: "Add hobby",
  references: "Add reference",
  custom: "Edit custom",
};

export function SectionActions({ section }: { section: Section }) {
  const sections = useEditorStore((s) => s.data.sections);
  const setSections = useEditorStore((s) => s.setSections);
  const removeSection = useEditorStore((s) => s.removeSection);
  const addItemToSection = useEditorStore((s) => s.addItemToSection);
  const confirm = useConfirm();

  const idx = sections.findIndex((s) => s.id === section.id);
  // If the section isn't in the array (rare — race during reorder) bail.
  if (idx < 0) return null;
  const canUp = idx > 0;
  const canDown = idx < sections.length - 1;
  const canAddItem = ITEMS_BEARING_TYPES.has(section.type);
  const addLabel = ADD_LABELS[section.type];

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
      {canAddItem && (
        // "+ Add" — the missing affordance that prompted Philip's "I
        // don't see a + button to add more education" complaint. Lives
        // alongside Move up / Move down / Delete on the section's
        // hover overlay so users never have to leave the live preview
        // to grow a section. Backs onto the same default-item
        // factories the form's own "+ Add entry" button calls, so
        // both code paths produce identical-shaped items.
        <ActionBtn
          label={addLabel}
          tone="primary"
          onClick={(e) => {
            stop(e);
            addItemToSection(section.id);
          }}
        >
          <Plus className="h-3 w-3" />
        </ActionBtn>
      )}
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
  tone?: "danger" | "primary";
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
          : tone === "primary"
            ? "text-blue-600 hover:border-blue-200 hover:bg-blue-50"
            : "text-fg hover:border-strong"
      }`}
    >
      {children}
    </button>
  );
}
