/** Experience section editor. */

"use client";

import { useEditorStore } from "@/lib/store/editor";
import type { ExperienceSection } from "@/types/resume";
import { defaultExperienceItem } from "@/lib/resume-defaults";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddEntryButton, BulletsEditor, ItemRow, moveItem } from "./shared";

export function ExperienceForm({ section }: { section: ExperienceSection }) {
  const update = useEditorStore((s) => s.updateSection);
  const setItems = (items: ExperienceSection["items"]) =>
    update<ExperienceSection>(section.id, { items });
  const patchItem = (idx: number, patch: Partial<ExperienceSection["items"][number]>) => {
    const next = [...section.items];
    next[idx] = { ...next[idx], ...patch };
    setItems(next);
  };

  return (
    <div className="space-y-2.5">
      {section.items.map((it, idx) => (
        <ItemRow
          key={it.id}
          title={it.role || "(role)"}
          subtitle={it.company ? `· ${it.company}` : undefined}
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
                <Label>Role</Label>
                <Input
                  value={it.role}
                  onChange={(e) => patchItem(idx, { role: e.target.value })}
                  placeholder="Senior Engineer"
                />
              </div>
              <div>
                <Label>Company</Label>
                <Input
                  value={it.company}
                  onChange={(e) => patchItem(idx, { company: e.target.value })}
                  placeholder="Acme Inc."
                />
              </div>
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={it.location}
                onChange={(e) => patchItem(idx, { location: e.target.value })}
                placeholder="Copenhagen, Denmark"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start date</Label>
                <Input
                  value={it.startDate}
                  onChange={(e) => patchItem(idx, { startDate: e.target.value })}
                  placeholder="2022-03"
                />
              </div>
              <div>
                <Label>End date</Label>
                <Input
                  value={it.endDate}
                  onChange={(e) => patchItem(idx, { endDate: e.target.value })}
                  placeholder="2024-08"
                  disabled={it.current}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={it.current}
                onChange={(e) => patchItem(idx, { current: e.target.checked })}
              />
              I currently work here
            </label>
            <div>
              <Label>Bullets</Label>
              <BulletsEditor
                bullets={it.bullets}
                onChange={(bullets) => patchItem(idx, { bullets })}
              />
            </div>
          </div>
        </ItemRow>
      ))}
      <AddEntryButton
        label="Add experience"
        onClick={() => setItems([...section.items, defaultExperienceItem()])}
      />
    </div>
  );
}
