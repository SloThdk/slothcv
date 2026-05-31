/**
 * /login — email + password sign-in, with Google OAuth as the fast path.
 *
 * The actual auth UI lives in <LoginForm>. The wrapper here translates the
 * page heading + subtitle and theme-styles the surrounding card.
 */

"use client";

import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function LoginPage() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--color-text)]">
          {t("login.title")}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
          {t("login.subtitle")}
        </p>
      </div>
      <Suspense
        fallback={
          <p className="text-center text-sm text-[color:var(--color-text-subtle)]">
            {t("common.loading")}
          </p>
        }
      >
        <LoginForm />
      </Suspense>
      <p className="text-center text-sm text-[color:var(--color-text-muted)]">
        {t("login.noAccount")}{" "}
        <Link
          href="/signup"
          className="font-medium text-[color:var(--color-text)] underline underline-offset-2 hover:text-[color:var(--color-accent)]"
        >
          {t("login.signUpLink")}
        </Link>
      </p>
    </div>
  );
}
