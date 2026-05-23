/** Volunteer section editor — same shape as Experience minus "company". */

"use client";

import { useEditorStore } from "@/lib/store/editor";
import type { VolunteerSection } from "@/types/resume";
import { defaultVolunteerItem } from "@/lib/resume-defaults";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { AddEntryButton, BulletsEditor, ItemRow, moveItem } from "./shared";

export function VolunteerForm({ section }: { section: VolunteerSection }) {
  const { t } = useLanguage();
  const update = useEditorStore((s) => s.updateSection);
  const setItems = (items: VolunteerSection["items"]) =>
    update<VolunteerSection>(section.id, { items });
  const patchItem = (idx: number, patch: Partial<VolunteerSection["items"][number]>) => {
    const next = [...section.items];
    next[idx] = { ...next[idx], ...patch };
    setItems(next);
  };

  return (
    <div className="space-y-2.5">
      {section.items.map((it, idx) => (
        <ItemRow
          key={it.id}
          fieldId={`section.${section.id}.item.${it.id}`}
          title={it.role || "(role)"}
          subtitle={it.organization ? `· ${it.organization}` : undefined}
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
                <Label>{t("form.role")}</Label>
                <Input
                  value={it.role}
                  onChange={(e) => patchItem(idx, { role: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("form.organization")}</Label>
                <Input
                  value={it.organization}
                  onChange={(e) => patchItem(idx, { organization: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>{t("form.location")}</Label>
              <Input
                value={it.location}
                onChange={(e) => patchItem(idx, { location: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>{t("form.start")}</Label>
                <Input
                  value={it.startDate}
                  onChange={(e) => patchItem(idx, { startDate: e.target.value })}
                  placeholder="2022-03"
                />
              </div>
              <div>
                <Label>{t("form.end")}</Label>
                <Input
                  value={it.endDate}
                  onChange={(e) => patchItem(idx, { endDate: e.target.value })}
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
              Currently volunteering
            </label>
            <div>
              <Label>{t("form.bullets")}</Label>
              <BulletsEditor
                bullets={it.bullets}
                onChange={(bullets) => patchItem(idx, { bullets })}
              />
            </div>
          </div>
        </ItemRow>
      ))}
      <AddEntryButton
        label={t("form.addVolunteer")}
        onClick={() => setItems([...section.items, defaultVolunteerItem()])}
      />
    </div>
  );
}
