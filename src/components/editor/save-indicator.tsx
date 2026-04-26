/**
 * SaveIndicator — header pill that reflects the auto-save state machine.
 *
 * Reads `saveStatus` and `lastSavedAt` directly from the editor store so
 * mutations from anywhere in the tree are visible without prop-plumbing.
 *
 *   dirty   → "● Unsaved" (warning amber)
 *   saving  → "… Saving"   (neutral)
 *   saved   → "✓ Saved Xs ago" (green)
 *   error   → "⚠ Save failed — retry" (red, click to flush)
 *   idle    → empty
 */

"use client";

import { useEffect, useState } from "react";
import { Check, AlertCircle, Loader2, Circle } from "lucide-react";
import { useEditorStore, flushPendingSave } from "@/lib/store/editor";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { cn } from "@/lib/utils";

/** Format an ISO timestamp as a human-friendly relative duration. */
function relativeTime(iso: string | null, lang: "en" | "da"): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 5_000) return lang === "da" ? "lige nu" : "just now";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ${lang === "da" ? "siden" : "ago"}`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${lang === "da" ? "siden" : "ago"}`;
  return `${Math.floor(ms / 3_600_000)}h ${lang === "da" ? "siden" : "ago"}`;
}

export function SaveIndicator() {
  const status = useEditorStore((s) => s.saveStatus);
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);
  const error = useEditorStore((s) => s.saveError);
  const { t, lang } = useLanguage();

  // Re-render every 5 seconds while idle, just so the "saved Xs ago" string
  // doesn't go stale during a long edit pause.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (status !== "saved") return;
    const tt = setInterval(() => forceTick((n) => n + 1), 5_000);
    return () => clearInterval(tt);
  }, [status]);

  if (status === "idle") return null;

  if (status === "dirty") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        <Circle className="h-3 w-3 fill-amber-500 text-amber-500" />
        {t("save.dirty")}
      </div>
    );
  }
  if (status === "saving") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-hover px-2.5 py-1 text-xs font-medium text-muted">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t("save.saving")}
      </div>
    );
  }
  if (status === "saved") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <Check className="h-3 w-3" />
        {t("save.saved")} {relativeTime(lastSavedAt, lang)}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => void flushPendingSave()}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100",
      )}
      title={error ?? undefined}
    >
      <AlertCircle className="h-3 w-3" />
      {t("save.error")}
    </button>
  );
}
