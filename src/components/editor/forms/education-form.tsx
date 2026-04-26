/** Education section editor. */

"use client";

import { useEditorStore } from "@/lib/store/editor";
import type { EducationSection } from "@/types/resume";
import { defaultEducationItem } from "@/lib/resume-defaults";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddEntryButton, BulletsEditor, ItemRow, moveItem } from "./shared";

export function EducationForm({ section }: { section: EducationSection }) {
  const update = useEditorStore((s) => s.updateSection);
  const setItems = (items: EducationSection["items"]) =>
    update<EducationSection>(section.id, { items });
  const patchItem = (idx: number, patch: Partial<EducationSection["items"][number]>) => {
    const next = [...section.items];
    next[idx] = { ...next[idx], ...patch };
    setItems(next);
  };

  return (
    <div className="space-y-2.5">
      {section.items.map((it, idx) => (
        <ItemRow
          key={it.id}
          title={it.degree || "(degree)"}
          subtitle={it.institution ? `· ${it.institution}` : undefined}
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
                <Label>Degree</Label>
                <Input
                  value={it.degree}
                  onChange={(e) => patchItem(idx, { degree: e.target.value })}
                  placeholder="MSc"
                />
              </div>
              <div>
                <Label>Field</Label>
                <Input
                  value={it.field}
                  onChange={(e) => patchItem(idx, { field: e.target.value })}
                  placeholder="Computer Science"
                />
              </div>
            </div>
            <div>
              <Label>Institution</Label>
              <Input
                value={it.institution}
                onChange={(e) => patchItem(idx, { institution: e.target.value })}
                placeholder="University of Copenhagen"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Location</Label>
                <Input
                  value={it.location}
                  onChange={(e) => patchItem(idx, { location: e.target.value })}
                  placeholder="Copenhagen"
                />
              </div>
              <div>
                <Label>GPA (optional)</Label>
                <Input
                  value={it.gpa ?? ""}
                  onChange={(e) =>
                    patchItem(idx, { gpa: e.target.value || undefined })
                  }
                  placeholder="11.8"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start</Label>
                <Input
                  value={it.startDate}
                  onChange={(e) => patchItem(idx, { startDate: e.target.value })}
                  placeholder="2018-09"
                />
              </div>
              <div>
                <Label>End</Label>
                <Input
                  value={it.endDate}
                  onChange={(e) => patchItem(idx, { endDate: e.target.value })}
                  placeholder="2020-06"
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
              Currently studying
            </label>
            <div>
              <Label>Bullets (coursework, achievements)</Label>
              <BulletsEditor
                bullets={it.bullets}
                onChange={(bullets) => patchItem(idx, { bullets })}
              />
            </div>
          </div>
        </ItemRow>
      ))}
      <AddEntryButton
        label="Add education"
        onClick={() => setItems([...section.items, defaultEducationItem()])}
      />
    </div>
  );
}
