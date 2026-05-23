/** References section editor — toggle "on request" or list references. */

"use client";

import { useEditorStore } from "@/lib/store/editor";
import type { ReferencesSection } from "@/types/resume";
import { defaultReferenceItem } from "@/lib/resume-defaults";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { AddEntryButton, ItemRow, moveItem } from "./shared";

export function ReferencesForm({ section }: { section: ReferencesSection }) {
  const { t } = useLanguage();
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
      {/* When `onRequest` is true, templates render a single
          `section.<id>.body` line ("Available on request."). Clicking
          it in the preview lands here on the toggle that controls it. */}
      <label
        data-field-id={`section.${section.id}.body`}
        className="flex items-center gap-2 text-sm text-fg"
      >
        <input
          type="checkbox"
          checked={section.onRequest}
          onChange={(e) =>
            update<ReferencesSection>(section.id, { onRequest: e.target.checked })
          }
        />
        {t("form.referencesOnRequestToggle")}
      </label>

      {!section.onRequest && (
        <>
          {section.items.map((it, idx) => (
            <ItemRow
              key={it.id}
              fieldId={`section.${section.id}.item.${it.id}`}
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
                    <Label>{t("form.name")}</Label>
                    <Input
                      value={it.name}
                      onChange={(e) => patchItem(idx, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t("form.role")}</Label>
                    <Input
                      value={it.role}
                      onChange={(e) => patchItem(idx, { role: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t("form.company")}</Label>
                  <Input
                    value={it.company}
                    onChange={(e) => patchItem(idx, { company: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>{t("form.email")}</Label>
                    <Input
                      type="email"
                      value={it.email}
                      onChange={(e) => patchItem(idx, { email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t("form.phone")}</Label>
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
            label={t("form.addReference")}
            onClick={() => setItems([...section.items, defaultReferenceItem()])}
          />
        </>
      )}
    </div>
  );
}
