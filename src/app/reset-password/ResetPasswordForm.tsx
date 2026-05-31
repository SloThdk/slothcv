/**
 * ResetPasswordForm — set a new password using the temporary recovery
 * session established by /auth/callback?type=recovery.
 *
 * The recovery link already exchanged its code for a session before
 * redirecting here, so the user arrives authenticated. We gate on that
 * session (useAuth): no session → the link expired or was already used, show
 * a "request a new link" state rather than a dead form.
 *
 * On submit we updateUser({ password }) — no captcha (authenticated call) —
 * then HARD-navigate to /dashboard so the app loads with the now-permanent
 * session (rules/ssr-auth-state-hard-nav).
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { authErrorTranslationKey } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PasswordStrength,
  passwordMeetsPolicy,
  PASSWORD_MIN_LENGTH,
} from "@/components/password-strength";
import { DUR, EASE } from "@/lib/motion";

export function ResetPasswordForm() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!passwordMeetsPolicy(password)) {
      toast.error(t("auth.pwTooWeak", { n: PASSWORD_MIN_LENGTH }));
      return;
    }
    if (password !== confirm) {
      toast.error(t("auth.errPasswordMismatch"));
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSubmitting(false);
      toast.error(t(authErrorTranslationKey(error)));
      return;
    }
    toast.success(t("reset.success"));
    // Hard nav so the dashboard loads with the upgraded session.
    window.location.assign("/dashboard");
  }

  // Resolving the recovery session.
  if (loading) {
    return (
      <p className="text-center text-sm text-[color:var(--color-text-subtle)]">
        {t("reset.checking")}
      </p>
    );
  }

  // No session → expired / already-used link.
  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.base, ease: EASE.out }}
        className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200"
      >
        <p>{t("reset.errNoSession")}</p>
        <Link
          href="/forgot-password"
          className="mt-3 inline-flex items-center justify-center rounded-md bg-[color:var(--color-text)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-bg)] hover:opacity-90"
        >
          {t("reset.requestNew")}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.base, ease: EASE.out }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <Label htmlFor="password">{t("reset.newPassword")}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              placeholder={t("login.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-[color:var(--color-text-subtle)] transition-colors hover:text-[color:var(--color-text)]"
            >
              {showPassword ? t("login.hidePassword") : t("login.showPassword")}
            </button>
          </div>
          <div className="mt-2">
            <PasswordStrength password={password} />
          </div>
        </div>

        <div>
          <Label htmlFor="confirm">{t("auth.repeatPassword")}</Label>
          <Input
            id="confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder={t("login.passwordPlaceholder")}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={submitting}
          />
          {confirm.length > 0 && confirm !== password && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {t("auth.errPasswordMismatch")}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={
            submitting ||
            !passwordMeetsPolicy(password) ||
            password !== confirm
          }
        >
          <KeyRound className="h-4 w-4" />
          {submitting ? t("reset.submitting") : t("reset.submit")}
        </Button>
      </form>
    </motion.div>
  );
}
