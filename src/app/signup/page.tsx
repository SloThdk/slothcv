/**
 * /signup — first-time account creation entrypoint.
 *
 * Mirrors /login visually but collects more:
 *   - First + last name + email + password (Google OAuth as the alternative).
 *   - supabase.auth.signUp() carries the name in `options.data`
 *     (full_name / first_name / last_name) → auth.users.raw_user_meta_data;
 *     the handle_new_user trigger (migration 0005) writes it onto the
 *     profiles row, same end-state as Google OAuth.
 *   - Email confirmation is required (mailer_autoconfirm = false): the user
 *     must click the link in the confirmation email before they can log in.
 *
 * Provider separation: the email_status probe blocks signup for an email
 * that already has a confirmed Google or password account (see SignupForm).
 */

"use client";

import { Suspense } from "react";
import Link from "next/link";
import { SignupForm } from "./SignupForm";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function SignupPage() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--color-text)]">
          {t("signup.title")}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
          {t("signup.subtitle")}
        </p>
      </div>
      <Suspense
        fallback={
          <p className="text-center text-sm text-[color:var(--color-text-subtle)]">
            {t("common.loading")}
          </p>
        }
      >
        <SignupForm />
      </Suspense>
      <p className="text-center text-sm text-[color:var(--color-text-muted)]">
        {t("signup.haveAccount")}{" "}
        <Link
          href="/login"
          className="font-medium text-[color:var(--color-text)] underline underline-offset-2 hover:text-[color:var(--color-accent)]"
        >
          {t("signup.signInLink")}
        </Link>
      </p>
    </div>
  );
}
