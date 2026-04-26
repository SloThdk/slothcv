/** Hobbies section editor — flat list of strings. */

"use client";

import { Trash2 } from "lucide-react";
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

  return (
    <div className="space-y-1.5">
      {section.items.map((it, idx) => (
        <div key={it.id} className="flex items-center gap-1.5">
          <Input
            value={it.text}
            onChange={(e) => {
              const next = [...section.items];
              next[idx] = { ...it, text: e.target.value };
              setItems(next);
            }}
            placeholder="Photography, woodwork, …"
            className="flex-1 h-9 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove hobby"
            className="h-8 w-8"
            onClick={() => setItems(section.items.filter((_, i) => i !== idx))}
          >
            <Trash2 className="h-3.5 w-3.5 text-subtle" />
          </Button>
        </div>
      ))}
      <AddEntryButton
        label="Add hobby"
        onClick={() => setItems([...section.items, defaultHobbyItem()])}
      />
    </div>
  );
}
