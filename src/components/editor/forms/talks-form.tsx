/** Talks section editor. */

"use client";

import { useEditorStore } from "@/lib/store/editor";
import type { TalksSection } from "@/types/resume";
import { defaultTalkItem } from "@/lib/resume-defaults";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddEntryButton, ItemRow, moveItem } from "./shared";

export function TalksForm({ section }: { section: TalksSection }) {
  const update = useEditorStore((s) => s.updateSection);
  const setItems = (items: TalksSection["items"]) =>
    update<TalksSection>(section.id, { items });
  const patchItem = (idx: number, patch: Partial<TalksSection["items"][number]>) => {
    const next = [...section.items];
    next[idx] = { ...next[idx], ...patch };
    setItems(next);
  };

  return (
    <div className="space-y-2.5">
      {section.items.map((it, idx) => (
        <ItemRow
          key={it.id}
          title={it.title || "(talk)"}
          subtitle={it.venue ? `· ${it.venue}` : undefined}
          visible={it.visible}
          onToggleVisible={() => patchItem(idx, { visible: !it.visible })}
          onMoveUp={() => setItems(moveItem(section.items, idx, idx - 1))}
          onMoveDown={() => setItems(moveItem(section.items, idx, idx + 1))}
          canMoveUp={idx > 0}
          canMoveDown={idx < section.items.length - 1}
          onDelete={() => setItems(section.items.filter((_, i) => i !== idx))}
        >
          <div className="space-y-2">
            <div>
              <Label>Title</Label>
              <Input
                value={it.title}
                onChange={(e) => patchItem(idx, { title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Venue</Label>
                <Input
                  value={it.venue}
                  onChange={(e) => patchItem(idx, { venue: e.target.value })}
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  value={it.date}
                  onChange={(e) => patchItem(idx, { date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>URL</Label>
              <Input
                value={it.url ?? ""}
                onChange={(e) =>
                  patchItem(idx, { url: e.target.value || undefined })
                }
                placeholder="https://…"
              />
            </div>
          </div>
        </ItemRow>
      ))}
      <AddEntryButton
        label="Add talk"
        onClick={() => setItems([...section.items, defaultTalkItem()])}
      />
    </div>
  );
}
