/**
 * /signup — first-time account creation entrypoint.
 *
 * Mirrors /login visually but the underlying call is different:
 *   - Form collects first + last name in addition to email.
 *   - signInWithOtp is called with `shouldCreateUser: true` (default) AND
 *     a `data` payload carrying `full_name`, which Supabase persists to
 *     auth.users.raw_user_meta_data on first signup. The handle_new_user
 *     trigger (migration 0005) then writes it to the profiles row, so the
 *     user lands on /dashboard with their real name pre-populated — same
 *     end-state as Google OAuth.
 *
 * /login by contrast uses `shouldCreateUser: false` so a typo'd email
 * during sign-in doesn't silently create a fresh empty account.
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
