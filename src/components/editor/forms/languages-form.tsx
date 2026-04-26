/** Languages section editor — name + proficiency text + 0–5 level. */

"use client";

import { Trash2 } from "lucide-react";
import { useEditorStore } from "@/lib/store/editor";
import type { LanguagesSection } from "@/types/resume";
import { defaultLanguageItem } from "@/lib/resume-defaults";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddEntryButton } from "./shared";

export function LanguagesForm({ section }: { section: LanguagesSection }) {
  const update = useEditorStore((s) => s.updateSection);
  const setItems = (items: LanguagesSection["items"]) =>
    update<LanguagesSection>(section.id, { items });

  return (
    <div className="space-y-1.5">
      {section.items.map((it, idx) => (
        <div key={it.id} className="flex items-center gap-1.5">
          <Input
            value={it.name}
            onChange={(e) => {
              const next = [...section.items];
              next[idx] = { ...it, name: e.target.value };
              setItems(next);
            }}
            placeholder="Language"
            className="flex-1 h-9 text-sm"
          />
          <Input
            value={it.proficiency}
            onChange={(e) => {
              const next = [...section.items];
              next[idx] = { ...it, proficiency: e.target.value };
              setItems(next);
            }}
            placeholder="C1 / Fluent"
            className="h-9 max-w-[110px] text-sm"
          />
          <input
            type="range"
            min={0}
            max={5}
            value={it.level}
            onChange={(e) => {
              const next = [...section.items];
              next[idx] = { ...it, level: Number(e.target.value) };
              setItems(next);
            }}
            className="w-20"
            aria-label="Level"
            title={`Level ${it.level}/5`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove language"
            className="h-8 w-8"
            onClick={() => setItems(section.items.filter((_, i) => i !== idx))}
          >
            <Trash2 className="h-3.5 w-3.5 text-subtle" />
          </Button>
        </div>
      ))}
      <AddEntryButton
        label="Add language"
        onClick={() => setItems([...section.items, defaultLanguageItem()])}
      />
    </div>
  );
}
