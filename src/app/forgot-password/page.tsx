/**
 * /forgot-password — request a password-recovery link.
 *
 * The UI lives in <ForgotPasswordForm>; this wrapper translates the heading
 * + subtitle and theme-styles the surrounding card, mirroring /login.
 */

"use client";

import { Suspense } from "react";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--color-text)]">
          {t("forgot.title")}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
          {t("forgot.subtitle")}
        </p>
      </div>
      <Suspense
        fallback={
          <p className="text-center text-sm text-[color:var(--color-text-subtle)]">
            {t("common.loading")}
          </p>
        }
      >
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
