/**
 * SettingsTab — rename CV, language picker, export menu, delete CV.
 *
 * Title is the only field that lives outside `data` (it's a top-level column
 * in `resumes`). We update it via the resumes helper and keep a local
 * editable copy + a debounced save mirror so the indicator pill works the
 * same way as the rest of the editor.
 */

"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, FileJson, FileText, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEditorStore } from "@/lib/store/editor";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { translateError } from "@/lib/translatable-error";
import { deleteResume, renameResume } from "@/lib/resumes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-modal";
import { exportPdf } from "@/lib/pdf-export";

export function SettingsTab({ initialTitle }: { initialTitle: string }) {
  const router = useRouter();
  const resumeId = useEditorStore((s) => s.resumeId);
  const data = useEditorStore((s) => s.data);
  const { t } = useLanguage();
  const confirm = useConfirm();

  const [title, setTitle] = useState(initialTitle);
  const [savingTitle, setSavingTitle] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => setTitle(initialTitle), [initialTitle]);

  async function commitTitle() {
    if (!resumeId || title.trim() === initialTitle.trim() || !title.trim()) return;
    setSavingTitle(true);
    try {
      await renameResume(resumeId, title);
    } catch (e) {
      toast.error(translateError(e, t, "settings.cvTitleSavingFailed"));
    } finally {
      setSavingTitle(false);
    }
  }

  async function onDelete() {
    if (!resumeId) return;
    const ok = await confirm({
      title: t("dashboard.confirmDeleteTitle"),
      description: title
        ? t("dashboard.confirmDeleteDescNamed", { name: title })
        : t("dashboard.confirmDeleteDesc"),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteResume(resumeId);
      toast.success(t("dashboard.toastDeleted"));
      router.push("/dashboard");
    } catch (e) {
      toast.error(translateError(e, t, "dashboard.toastDeleteFailed"));
    }
  }

  async function onExportPdf() {
    setExporting(true);
    try {
      await exportPdf(data, title || "resume");
      // ATS-readable confirmation. SlothCV renders the PDF via
      // window.print() on the live DOM — selectable text + embedded
      // fonts come for free, which is the property ATS parsers
      // (Workday / Greenhouse / Lever / Taleo) need to extract
      // structured data. We surface that to the user explicitly so
      // they know the export they just downloaded clears the bar
      // that "free PDF builder + paid version for ATS" competitors
      // gate behind a paywall. (Week 1 feature per Scout research
      // 2026-05-16: turn existing technical truth into the only
      // verified-ATS claim in the category.)
      toast.success(t("settings.exportPdfAtsTitle"), {
        description: t("settings.exportPdfAtsBody"),
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        duration: 6000,
      });
    } catch (e) {
      toast.error(translateError(e, t, "settings.exportPdfFailed"));
    } finally {
      setExporting(false);
    }
  }

  function onExportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "resume").replace(/[^a-z0-9-_]+/gi, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <Group title={t("settings.cvTitle")}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          maxLength={120}
          disabled={savingTitle}
        />
      </Group>

      {/* Language picker lives in the site header (top right) and writes
          to both the UI language AND `data.meta.language` via the language
          context — so a duplicate selector here would be redundant and
          out of sync with the global toggle. The previous "Display
          language" group has been removed; the header switch is the
          single source of truth. */}

      <Group title={t("settings.export")}>
        <Button
          type="button"
          variant="default"
          className="w-full"
          onClick={onExportPdf}
          disabled={exporting}
        >
          <Download className="h-4 w-4" />
          {exporting ? t("settings.exportPdfGenerating") : t("settings.exportPdf")}
        </Button>
        {/* Browser-print quirk users hit on dark templates: Chrome/Edge
            ship with "Background graphics" OFF by default, which turns
            an Aurora/Carbon/Midnight CV into a white page with light
            text on white. Surface this once next to the export button
            so the user has the answer before they get the surprise. */}
        <p className="text-[11px] leading-snug text-subtle">
          {t("settings.exportBgGraphicsHint")}
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onExportJson}
        >
          <FileJson className="h-4 w-4" />
          {t("settings.exportJson")}
        </Button>
      </Group>

      <Group title={t("settings.navigate")}>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => router.push("/dashboard")}
        >
          <FileText className="h-4 w-4" />
          {t("settings.backToDashboard")}
        </Button>
      </Group>

      <Group title={t("settings.dangerZone")}>
        <Button
          type="button"
          variant="destructive"
          className="w-full"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          {t("settings.deleteCv")}
        </Button>
      </Group>
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
