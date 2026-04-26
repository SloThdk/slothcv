/** Awards section editor. */

"use client";

import { useEditorStore } from "@/lib/store/editor";
import type { AwardsSection } from "@/types/resume";
import { defaultAwardItem } from "@/lib/resume-defaults";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddEntryButton, ItemRow, moveItem } from "./shared";

export function AwardsForm({ section }: { section: AwardsSection }) {
  const update = useEditorStore((s) => s.updateSection);
  const setItems = (items: AwardsSection["items"]) =>
    update<AwardsSection>(section.id, { items });
  const patchItem = (idx: number, patch: Partial<AwardsSection["items"][number]>) => {
    const next = [...section.items];
    next[idx] = { ...next[idx], ...patch };
    setItems(next);
  };

  return (
    <div className="space-y-2.5">
      {section.items.map((it, idx) => (
        <ItemRow
          key={it.id}
          title={it.name || "(award)"}
          subtitle={it.issuer ? `· ${it.issuer}` : undefined}
          visible={it.visible}
          onToggleVisible={() => patchItem(idx, { visible: !it.visible })}
          onMoveUp={() => setItems(moveItem(section.items, idx, idx - 1))}
          onMoveDown={() => setItems(moveItem(section.items, idx, idx + 1))}
          canMoveUp={idx > 0}
          canMoveDown={idx < section.items.length - 1}
          onDelete={() => setItems(section.items.filter((_, i) => i !== idx))}
        >
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={it.name}
                  onChange={(e) => patchItem(idx, { name: e.target.value })}
                />
              </div>
              <div>
                <Label>Issuer</Label>
                <Input
                  value={it.issuer}
                  onChange={(e) => patchItem(idx, { issuer: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                value={it.date}
                onChange={(e) => patchItem(idx, { date: e.target.value })}
                placeholder="2024-05"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={it.description}
                onChange={(e) => patchItem(idx, { description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        </ItemRow>
      ))}
      <AddEntryButton
        label="Add award"
        onClick={() => setItems([...section.items, defaultAwardItem()])}
      />
    </div>
  );
}
