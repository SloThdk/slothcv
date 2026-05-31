/**
 * ForgotPasswordForm — single email field → Supabase password-recovery link.
 *
 * Provider-aware: a Google-only account has no password to reset, so we bail
 * with a friendly "use Continue with Google" message instead of sending a
 * useless link (email_status RPC). For every other case we show the same
 * "check your inbox" state whether or not the email exists — Supabase
 * intentionally returns success either way to avoid leaking which emails are
 * registered.
 *
 * The recovery link lands on /auth/callback?type=recovery, which exchanges
 * the code and forwards to /reset-password where the user picks a new
 * password (see callback page + ResetPasswordForm).
 */

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { waitForFreshCaptchaToken } from "@/lib/captcha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DUR, EASE } from "@/lib/motion";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState(false);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const captchaResolveRef = useRef<((token: string) => void) | null>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    if (captchaToken || captchaError) return;
    const timer = setTimeout(() => setCaptchaError(true), 12000);
    return () => clearTimeout(timer);
  }, [captchaToken, captchaError]);

  // A spent recovery link bounces here as ?error=link_expired (see
  // /auth/callback). Surface it once, then strip the param. history.replaceState
  // (not setState) so there's no effect-setState churn.
  useEffect(() => {
    if (searchParams.get("error") === "link_expired") {
      toast.error(t("login.errExpiredLink"));
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on mount
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    setSubmitting(true);

    let tokenForCall: string | null = captchaToken;
    if (TURNSTILE_SITE_KEY && !tokenForCall) {
      tokenForCall = await waitForFreshCaptchaToken(captchaResolveRef);
      if (!tokenForCall) {
        setSubmitting(false);
        toast.error(t("auth.errCaptchaFailed"));
        return;
      }
      setCaptchaToken(tokenForCall);
    }

    const supabase = createClient();

    // Provider-aware: a Google-only account has no password to reset.
    const probe = await supabase.rpc("email_status", { check_email: cleanEmail });
    const status = (probe.data as
      | { is_registered: boolean; has_email: boolean; has_google: boolean }[]
      | null)?.[0];
    if (status?.is_registered && !status.has_email && status.has_google) {
      setSubmitting(false);
      toast.error(t("forgot.errGoogleOnly"));
      return;
    }

    // Recovery link routes through /auth/callback?type=recovery →
    // /reset-password (see callback page).
    const redirectTo =
      typeof window !== "undefined"
        ? new URL("/auth/callback?type=recovery", window.location.origin).toString()
        : "/auth/callback?type=recovery";

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
      ...(tokenForCall ? { captchaToken: tokenForCall } : {}),
    });

    turnstileRef.current?.reset();
    setCaptchaToken(null);
    setSubmitting(false);

    if (error) {
      toast.error(t("auth.errUnexpected"));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: DUR.base, ease: EASE.out }}
        className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-100"
      >
        <p className="font-medium">{t("forgot.sentTitle")}</p>
        <p className="mt-2">{t("forgot.sentBody", { email })}</p>
        <p className="mt-3 text-xs text-emerald-800 dark:text-emerald-300/90">
          {t("forgot.sentSpamHint")}{" "}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="font-medium underline underline-offset-2 hover:text-emerald-700 dark:hover:text-emerald-200"
          >
            {t("forgot.tryAnotherEmail")}
          </button>
          .
        </p>
        <p className="mt-4">
          <Link
            href="/login"
            className="text-xs font-medium text-emerald-900 underline underline-offset-2 hover:text-emerald-700 dark:text-emerald-100 dark:hover:text-emerald-300"
          >
            {t("forgot.backToLogin")}
          </Link>
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.base, ease: EASE.out }}
      className="flex flex-col gap-6"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label
            htmlFor="email"
            className="text-sm font-medium text-[color:var(--color-text)]"
          >
            {t("login.email")}
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t("login.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className="mt-1.5"
          />
        </div>

        {TURNSTILE_SITE_KEY && (
          <div className="flex flex-col items-center gap-2">
            <Turnstile
              ref={turnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={(token) => {
                setCaptchaToken(token);
                setCaptchaError(false);
                if (captchaResolveRef.current) {
                  captchaResolveRef.current(token);
                  captchaResolveRef.current = null;
                }
              }}
              onError={() => {
                setCaptchaToken(null);
                setCaptchaError(true);
              }}
              onExpire={() => setCaptchaToken(null)}
              options={{ theme: "auto", size: "normal" }}
            />
            {captchaError ? (
              <p className="text-center text-xs text-red-600 dark:text-red-400">
                {t("login.captchaFailed")}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setCaptchaError(false);
                    setCaptchaToken(null);
                    turnstileRef.current?.reset();
                  }}
                  className="font-medium underline underline-offset-2 hover:text-red-700 dark:hover:text-red-300"
                >
                  {t("login.captchaRetry")}
                </button>
              </p>
            ) : !captchaToken ? (
              <p className="text-center text-[11px] text-[color:var(--color-text-subtle)]">
                {t("login.captchaWaiting")}
              </p>
            ) : null}
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting || !email || (!!TURNSTILE_SITE_KEY && !captchaToken)}
        >
          <Mail className="h-4 w-4" />
          {submitting ? t("login.sending") : t("forgot.send")}
        </Button>
      </form>

      <p className="text-center text-sm text-[color:var(--color-text-subtle)]">
        {t("forgot.rememberedPassword")}{" "}
        <Link
          href="/login"
          className="font-medium text-[color:var(--color-text)] underline-offset-4 hover:underline"
        >
          {t("signup.signInLink")}
        </Link>
      </p>
    </motion.div>
  );
}
