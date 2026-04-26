/**
 * EditorClient — Phase 1 placeholder.
 *
 * Provides:
 *   - Editable title (saved via `renameResume`).
 *   - Big "editor coming soon" canvas placeholder.
 *   - Save button that writes (currently empty / stub) data via
 *     `saveResumeData`. Proves the persistence loop end-to-end.
 *
 * Phase 2 will replace the placeholder canvas with the drag-and-drop
 * editor, design controls panel, and PDF export trigger.
 */

"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { renameResume, saveResumeData } from "@/app/dashboard/actions";

interface Props {
  id: string;
  initialTitle: string;
  initialData: unknown;
  updatedAt: string;
}

export function EditorClient({
  id,
  initialTitle,
  initialData,
  updatedAt,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [pending, startTransition] = useTransition();
  const [lastSavedAt, setLastSavedAt] = useState(updatedAt);

  // The "editor state" — for Phase 1 this is just an opaque blob round-tripped
  // through Supabase. Phase 2 wires this to a real editor model.
  const [editorState] = useState<unknown>(initialData ?? {});

  function onSaveTitle() {
    if (title.trim() === savedTitle.trim() || !title.trim()) return;
    startTransition(async () => {
      try {
        await renameResume(id, title);
        setSavedTitle(title);
        toast.success("Title saved.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed.");
      }
    });
  }

  function onSaveAll() {
    startTransition(async () => {
      try {
        if (title.trim() && title.trim() !== savedTitle.trim()) {
          await renameResume(id, title);
          setSavedTitle(title);
        }
        await saveResumeData(id, editorState);
        setLastSavedAt(new Date().toISOString());
        toast.success("Saved.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              All CVs
            </Button>
          </Link>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={onSaveTitle}
            maxLength={120}
            className="max-w-md text-base font-medium"
            aria-label="CV title"
          />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-neutral-400">
            Last saved {new Date(lastSavedAt).toLocaleTimeString()}
          </p>
          <Button onClick={onSaveAll} disabled={pending}>
            <Save className="h-4 w-4" />
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Phase 2 canvas placeholder */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex aspect-[3/4] items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-white p-8 text-center">
          <div className="max-w-md">
            <p className="text-sm font-medium uppercase tracking-wider text-neutral-400">
              Phase 2
            </p>
            <h2 className="mt-2 text-xl font-semibold text-neutral-900">
              Drag-and-drop editor coming next
            </h2>
            <p className="mt-3 text-sm text-neutral-500">
              The canvas, blocks, design controls, and PDF export ship in the
              next pass. For now, your title and (empty) state save to the
              database — try the Save button, then refresh to confirm.
            </p>
          </div>
        </div>

        {/* Side panel placeholder — design controls land here in Phase 2. */}
        <aside className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Design
          </h3>
          <p className="text-sm text-neutral-400">
            Font, palette, spacing, and column controls arrive in Phase 2.
          </p>
        </aside>
      </div>
    </div>
  );
}
