/** References section editor — toggle "on request" or list references. */

"use client";

import { useEditorStore } from "@/lib/store/editor";
import type { ReferencesSection } from "@/types/resume";
import { defaultReferenceItem } from "@/lib/resume-defaults";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddEntryButton, ItemRow, moveItem } from "./shared";

export function ReferencesForm({ section }: { section: ReferencesSection }) {
  const update = useEditorStore((s) => s.updateSection);
  const setItems = (items: ReferencesSection["items"]) =>
    update<ReferencesSection>(section.id, { items });
  const patchItem = (idx: number, patch: Partial<ReferencesSection["items"][number]>) => {
    const next = [...section.items];
    next[idx] = { ...next[idx], ...patch };
    setItems(next);
  };

  return (
    <div className="space-y-2.5">
      <label className="flex items-center gap-2 text-sm text-fg">
        <input
          type="checkbox"
          checked={section.onRequest}
          onChange={(e) =>
            update<ReferencesSection>(section.id, { onRequest: e.target.checked })
          }
        />
        Show &ldquo;References available on request&rdquo; instead of a list
      </label>

      {!section.onRequest && (
        <>
          {section.items.map((it, idx) => (
            <ItemRow
              key={it.id}
              title={it.name || "(name)"}
              subtitle={it.role ? `· ${it.role}` : undefined}
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
                    <Label>Role</Label>
                    <Input
                      value={it.role}
                      onChange={(e) => patchItem(idx, { role: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Company</Label>
                  <Input
                    value={it.company}
                    onChange={(e) => patchItem(idx, { company: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={it.email}
                      onChange={(e) => patchItem(idx, { email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={it.phone}
                      onChange={(e) => patchItem(idx, { phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </ItemRow>
          ))}
          <AddEntryButton
            label="Add reference"
            onClick={() => setItems([...section.items, defaultReferenceItem()])}
          />
        </>
      )}
    </div>
  );
}
