/** Custom section editor — free-text body + optional bullets. */

"use client";

import { useEditorStore } from "@/lib/store/editor";
import type { CustomSection } from "@/types/resume";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BulletsEditor } from "./shared";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function CustomForm({ section }: { section: CustomSection }) {
  const update = useEditorStore((s) => s.updateSection);
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      {/* Custom sections render their body as `section.<id>.body` —
          clicking the body in the preview flashes this textarea. */}
      <div data-field-id={`section.${section.id}.body`}>
        <Label htmlFor={`custom-body-${section.id}`}>{t("form.body")}</Label>
        <Textarea
          id={`custom-body-${section.id}`}
          value={section.body}
          onChange={(e) =>
            update<CustomSection>(section.id, { body: e.target.value })
          }
          rows={3}
          placeholder="Write anything here…"
        />
      </div>
      <div>
        <Label>{t("form.bullets")}</Label>
        <BulletsEditor
          bullets={section.items}
          onChange={(items) =>
            update<CustomSection>(section.id, { items })
          }
        />
      </div>
    </div>
  );
}
