/** Custom section editor — free-text body + optional bullets. */

"use client";

import { useEditorStore } from "@/lib/store/editor";
import type { CustomSection } from "@/types/resume";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BulletsEditor } from "./shared";

export function CustomForm({ section }: { section: CustomSection }) {
  const update = useEditorStore((s) => s.updateSection);

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={`custom-body-${section.id}`}>Body (optional)</Label>
        <Textarea
          id={`custom-body-${section.id}`}
          value={section.body}
          onChange={(e) =>
            update<CustomSection>(section.id, { body: e.target.value })
          }
          rows={3}
          placeholder="Write anything here…"
        />
      </div>
      <div>
        <Label>Bullets</Label>
        <BulletsEditor
          bullets={section.items}
          onChange={(items) =>
            update<CustomSection>(section.id, { items })
          }
        />
      </div>
    </div>
  );
}
