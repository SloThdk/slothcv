/**
 * Dashboard row actions — Duplicate / Delete buttons that wrap the
 * corresponding Server Actions. Client component so we can show a confirm
 * dialog and toast feedback without a full page round-trip.
 */

"use client";

import { useTransition } from "react";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteResume, duplicateResume } from "./actions";

export function ResumeRowActions({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function onDuplicate() {
    startTransition(async () => {
      try {
        await duplicateResume(id);
        toast.success("Duplicated.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed.");
      }
    });
  }

  function onDelete() {
    // Browser confirm() is fine for Phase 1 — it's accessible by default,
    // works without extra dependencies, and matches user expectations for
    // a destructive action.
    if (!confirm("Delete this CV permanently?")) return;
    startTransition(async () => {
      try {
        await deleteResume(id);
        toast.success("Deleted.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed.");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDuplicate}
        disabled={isPending}
        aria-label="Duplicate CV"
        title="Duplicate"
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={isPending}
        aria-label="Delete CV"
        title="Delete"
        className="text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
