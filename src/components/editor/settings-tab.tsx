/**
 * SettingsTab — rename CV, language picker, export menu, delete CV.
 *
 * Title is the only field that lives outside `data` (it's a top-level column
 * in `resumes`, mirrored in the editor store alongside `resumeId`). The
 * rename field keeps a local draft and commits on blur: it persists via
 * `renameResume` (DB) and then writes the store `title`, so the editor header
 * reflects the new name on the same tick — no refresh needed.
 */

"use client";

import { useEffect, useState } from "react";
import { Download, FileJson, FileText, Trash2 } from "lucide-react";
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

export function SettingsTab() {
  const router = useRouter();
  const resumeId = useEditorStore((s) => s.resumeId);
  const storeTitle = useEditorStore((s) => s.title);
  const setStoreTitle = useEditorStore((s) => s.setTitle);
  const data = useEditorStore((s) => s.data);
  const { t } = useLanguage();
  const confirm = useConfirm();

  // Local draft so each keystroke doesn't rewrite the canonical title (and
  // the header) before the user commits. Re-syncs whenever the canonical
  // title changes from elsewhere (first-save naming prompt, re-hydrate).
  const [title, setTitle] = useState(storeTitle);
  const [savingTitle, setSavingTitle] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => setTitle(storeTitle), [storeTitle]);

  async function commitTitle() {
    const trimmed = title.trim();
    if (!resumeId || !trimmed || trimmed === storeTitle.trim()) return;
    setSavingTitle(true);
    try {
      await renameResume(resumeId, trimmed);
      // Mirror into the single store source so the editor header reflects
      // the rename immediately — renameResume only writes the DB. This is
      // the fix for "rename in Settings doesn't show until I refresh".
      setStoreTitle(trimmed);
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
      // No post-export success toast — window.print() resolves whether
      // the user clicks Print OR Cancel in the browser dialog, so any
      // "PDF exported" toast would fire 100 % of the time including
      // when nothing was actually saved (Philip's bug report 2026-05-
      // 16). The ATS-readable claim that previously lived in this
      // toast moved to the persistent inline hint next to the Export
      // PDF button (visible BEFORE the click) where it can't lie
      // about a cancelled export.
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
