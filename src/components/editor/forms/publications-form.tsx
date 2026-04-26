/** Publications section editor. */

"use client";

import { useEditorStore } from "@/lib/store/editor";
import type { PublicationsSection } from "@/types/resume";
import { defaultPublicationItem } from "@/lib/resume-defaults";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddEntryButton, ItemRow, moveItem } from "./shared";

export function PublicationsForm({ section }: { section: PublicationsSection }) {
  const update = useEditorStore((s) => s.updateSection);
  const setItems = (items: PublicationsSection["items"]) =>
    update<PublicationsSection>(section.id, { items });
  const patchItem = (idx: number, patch: Partial<PublicationsSection["items"][number]>) => {
    const next = [...section.items];
    next[idx] = { ...next[idx], ...patch };
    setItems(next);
  };

  return (
    <div className="space-y-2.5">
      {section.items.map((it, idx) => (
        <ItemRow
          key={it.id}
          title={it.title || "(publication)"}
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
            <div>
              <Label>Authors</Label>
              <Input
                value={it.authors}
                onChange={(e) => patchItem(idx, { authors: e.target.value })}
                placeholder="Doe, J., Smith, A."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Venue</Label>
                <Input
                  value={it.venue}
                  onChange={(e) => patchItem(idx, { venue: e.target.value })}
                  placeholder="Journal / Conference"
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  value={it.date}
                  onChange={(e) => patchItem(idx, { date: e.target.value })}
                  placeholder="2024"
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
                placeholder="https://doi.org/…"
              />
            </div>
          </div>
        </ItemRow>
      ))}
      <AddEntryButton
        label="Add publication"
        onClick={() => setItems([...section.items, defaultPublicationItem()])}
      />
    </div>
  );
}
