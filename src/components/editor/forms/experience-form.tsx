/** Experience section editor. */

"use client";

import { useEditorStore } from "@/lib/store/editor";
import type { CareerBreakSection, ExperienceSection } from "@/types/resume";
import { defaultExperienceItem } from "@/lib/resume-defaults";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddEntryButton, BulletsEditor, ItemRow, moveItem } from "./shared";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Accepts both Experience and CareerBreak sections — both carry
// `items: ExperienceItem[]`, so the form's surface is identical. The
// CareerBreak discriminator only affects how the section is labeled
// and (eventually) how individual templates may want to style it.
type SectionLike = ExperienceSection | CareerBreakSection;

export function ExperienceForm({ section }: { section: SectionLike }) {
  const update = useEditorStore((s) => s.updateSection);
  const { t } = useLanguage();
  const setItems = (items: SectionLike["items"]) =>
    update<SectionLike>(section.id, { items });
  const patchItem = (idx: number, patch: Partial<SectionLike["items"][number]>) => {
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
          title={it.role || `(${t("form.role").toLowerCase()})`}
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
                <Label>{t("form.role")}</Label>
                <Input
                  value={it.role}
                  onChange={(e) => patchItem(idx, { role: e.target.value })}
                  placeholder="Senior Engineer"
                />
              </div>
              <div>
                <Label>{t("form.company")}</Label>
                <Input
                  value={it.company}
                  onChange={(e) => patchItem(idx, { company: e.target.value })}
                  placeholder="Acme Inc."
                />
              </div>
            </div>
            <div>
              <Label>{t("form.location")}</Label>
              <Input
                value={it.location}
                onChange={(e) => patchItem(idx, { location: e.target.value })}
                placeholder="Copenhagen, Denmark"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>{t("form.startDate")}</Label>
                <Input
                  value={it.startDate}
                  onChange={(e) => patchItem(idx, { startDate: e.target.value })}
                  placeholder="2022-03"
                />
              </div>
              <div>
                <Label>{t("form.endDate")}</Label>
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
              {t("form.currentlyWorkHere")}
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
        label={t("form.addExperience")}
        onClick={() => setItems([...section.items, defaultExperienceItem()])}
      />
    </div>
  );
}
