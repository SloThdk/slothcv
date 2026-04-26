/** Summary section editor — single textarea. */

"use client";

import { useEditorStore } from "@/lib/store/editor";
import type { SummarySection } from "@/types/resume";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function SummaryForm({ section }: { section: SummarySection }) {
  const update = useEditorStore((s) => s.updateSection);
  return (
    <div>
      <Label htmlFor={`sum-${section.id}`}>Summary text</Label>
      <Textarea
        id={`sum-${section.id}`}
        value={section.body}
        onChange={(e) => update<SummarySection>(section.id, { body: e.target.value })}
        rows={5}
        placeholder="Three or four sentences. Who you are, what you do, what you're after."
      />
    </div>
  );
}
