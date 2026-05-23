/** Projects section editor. */

"use client";

import { useEditorStore } from "@/lib/store/editor";
import type { ProjectsSection } from "@/types/resume";
import { defaultProjectItem } from "@/lib/resume-defaults";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { AddEntryButton, BulletsEditor, ItemRow, moveItem } from "./shared";

export function ProjectsForm({ section }: { section: ProjectsSection }) {
  const { t } = useLanguage();
  const update = useEditorStore((s) => s.updateSection);
  const setItems = (items: ProjectsSection["items"]) =>
    update<ProjectsSection>(section.id, { items });
  const patchItem = (idx: number, patch: Partial<ProjectsSection["items"][number]>) => {
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
          title={it.name || `(${t("form.projectName").toLowerCase()})`}
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
            <div>
              <Label>{t("form.projectName")}</Label>
              <Input
                value={it.name}
                onChange={(e) => patchItem(idx, { name: e.target.value })}
                placeholder="My great project"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>{t("form.role")}</Label>
                <Input
                  value={it.role}
                  onChange={(e) => patchItem(idx, { role: e.target.value })}
                  placeholder="Lead developer"
                />
              </div>
              <div>
                <Label>URL (optional)</Label>
                <Input
                  value={it.url ?? ""}
                  onChange={(e) =>
                    patchItem(idx, { url: e.target.value || undefined })
                  }
                  placeholder="https://…"
                />
              </div>
            </div>
            <div>
              <Label>{t("form.techStack")}</Label>
              <Input
                value={it.techStack}
                onChange={(e) => patchItem(idx, { techStack: e.target.value })}
                placeholder="TypeScript, Postgres, Cloudflare"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>{t("form.start")}</Label>
                <Input
                  value={it.startDate}
                  onChange={(e) => patchItem(idx, { startDate: e.target.value })}
                  placeholder="2024-01"
                />
              </div>
              <div>
                <Label>{t("form.end")}</Label>
                <Input
                  value={it.endDate}
                  onChange={(e) => patchItem(idx, { endDate: e.target.value })}
                  placeholder="2024-06"
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
              Ongoing
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
        label={t("form.addProject")}
        onClick={() => setItems([...section.items, defaultProjectItem()])}
      />
    </div>
  );
}
