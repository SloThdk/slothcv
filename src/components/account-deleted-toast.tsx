"use client";

/**
 * AccountDeletedToast — fires the "Konto slettet!" confirmation AFTER the
 * account-deletion hard-nav lands on "/?deleted=1".
 *
 * Why a marker + post-nav toast (and not a toast on /account before navigating):
 * account deletion hard-navigates home — the user is logged out and the header
 * must re-render logged-out (rules/ssr-auth-state-hard-nav). A toast fired
 * before a full document load is wiped by the reload, so the /account handler
 * carries the intent across the navigation in the URL (`?deleted=1`) and THIS
 * reader, mounted in the root layout next to the Toaster, renders it once and
 * strips the marker so a refresh / back-button can't re-toast.
 *
 * Reads window.location.search directly (not useSearchParams) so it needs no
 * Suspense boundary in the static export. See rules/account-delete-confirm-toast.md.
 */

import { useEffect } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function AccountDeletedToast() {
  const { t } = useLanguage();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("deleted") !== "1") return;

    toast.success(t("account.toastAccountDeleted"), {
      description: t("account.toastAccountDeletedBody"),
    });

    // Strip the marker so a refresh / back-nav can't re-fire the toast.
    params.delete("deleted");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (qs ? `?${qs}` : ""),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on mount
  }, []);

  return null;
}
