/**
 * /reset-password — pick a new password after following a recovery link.
 *
 * Reached from /auth/callback?type=recovery once the recovery code has been
 * exchanged for a temporary session. The UI lives in <ResetPasswordForm>;
 * this wrapper translates the heading + subtitle, mirroring /login.
 */

"use client";

import { Suspense } from "react";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--color-text)]">
          {t("reset.title")}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
          {t("reset.subtitle")}
        </p>
      </div>
      <Suspense
        fallback={
          <p className="text-center text-sm text-[color:var(--color-text-subtle)]">
            {t("common.loading")}
          </p>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
