/**
 * SignupForm — create an account with first/last name + email + password, or
 * continue with Google. Email/password signups require email confirmation
 * (Supabase mailer_autoconfirm = false): supabase.auth.signUp() sends a
 * confirmation link the user must click before they can log in.
 *
 * Strict provider separation (shared/playbooks/supabase-auth-provider-
 * separation.md): before creating anything we probe
 * `public.email_status(email)`:
 *   - is_registered + is_confirmed → BLOCK, show the "account exists" banner
 *     with provider-specific copy (Google vs email/password vs both).
 *   - is_registered + !confirmed   → fall through; signUp resends the
 *     confirmation link to the still-pending account (same UX as first-time).
 *   - not registered               → proceed.
 * A ban pre-check runs first so a suspended email gets the real reason.
 * The `prevent_provider_mixing` trigger (migration 0020) is the hard backstop
 * for the Google-side direction.
 *
 * Name metadata rides along in signUp options.data ({full_name, first_name,
 * last_name}) → auth.users.raw_user_meta_data → the handle_new_user trigger
 * writes it onto the profiles row.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  authErrorTranslationKey,
  callbackErrorTranslationKey,
} from "@/lib/auth-errors";
import { waitForFreshCaptchaToken } from "@/lib/captcha";
import { formatBanUntilExact } from "@/lib/ban-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "@/components/google-icon";
import {
  PasswordStrength,
  passwordMeetsPolicy,
  PASSWORD_MIN_LENGTH,
} from "@/components/password-strength";
import { DUR, EASE } from "@/lib/motion";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { t, lang } = useLanguage();
  const next = searchParams.get("next") ?? "/dashboard";
  const queryError = searchParams.get("error");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [submittingGoogle, setSubmittingGoogle] = useState(false);
  // Confirmation-email-sent state ("check your inbox to activate").
  const [sent, setSent] = useState(false);
  // Set when the probe detects an existing CONFIRMED account — renders a
  // banner pointing the user at /login with provider-specific copy.
  const [existingAccount, setExistingAccount] = useState(false);
  const [existingHasEmail, setExistingHasEmail] = useState(false);
  const [existingHasGoogle, setExistingHasGoogle] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState(false);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const captchaResolveRef = useRef<((token: string) => void) | null>(null);

  // bfcache safety — same as LoginForm.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        setSubmittingEmail(false);
        setSubmittingGoogle(false);
      }
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Stuck-Turnstile timeout — mirrors LoginForm.
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    if (captchaToken || captchaError) return;
    const timer = setTimeout(() => setCaptchaError(true), 12000);
    return () => clearTimeout(timer);
  }, [captchaToken, captchaError]);

  // Forward already-signed-in users.
  useEffect(() => {
    if (!loading && user) {
      const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      router.replace(safe);
    }
  }, [loading, user, next, router]);

  // Surface ?error=... once auth state settles.
  useEffect(() => {
    if (loading) return;
    if (!queryError) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    router.replace(url.pathname + url.search);
    if (user) return;
    const key = callbackErrorTranslationKey(queryError) ?? "login.errExchangeGeneric";
    toast.error(t(key));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- guarded one-shot on first non-loading render
  }, [loading]);

  // Absolute callback URL on the client (works on localhost + every Pages URL).
  const callback = useMemo(() => {
    if (typeof window === "undefined") return "/auth/callback";
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("next", next);
    return url.toString();
  }, [next]);

  function fullNameFrom(first: string, last: string): string {
    const f = first.trim().replace(/\s+/g, " ");
    const l = last.trim().replace(/\s+/g, " ");
    return [f, l].filter(Boolean).join(" ");
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;
    if (!firstName.trim()) {
      toast.error(t("signup.errFirstNameRequired"));
      return;
    }
    if (!passwordMeetsPolicy(password)) {
      toast.error(t("auth.pwTooWeak", { n: PASSWORD_MIN_LENGTH }));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t("auth.errPasswordMismatch"));
      return;
    }

    setSubmittingEmail(true);

    // CAPTCHA gate — race-safe wait for the first token.
    let tokenForCall: string | null = captchaToken;
    if (TURNSTILE_SITE_KEY && !tokenForCall) {
      tokenForCall = await waitForFreshCaptchaToken(captchaResolveRef);
      if (!tokenForCall) {
        setSubmittingEmail(false);
        toast.error(t("auth.errCaptchaFailed"));
        return;
      }
      setCaptchaToken(tokenForCall);
    }

    const supabase = createClient();

    // ── Step 1: provider-aware existence probe (no captcha consumed) ──
    const probe = await supabase.rpc("email_status", { check_email: cleanEmail });
    if (probe.error) {
      // Fail closed — a duplicate account is worse than a retry.
      setSubmittingEmail(false);
      toast.error(t("auth.errUnexpected"));
      return;
    }
    const status = (probe.data as
      | { is_registered: boolean; is_confirmed: boolean; has_email: boolean; has_google: boolean }[]
      | null)?.[0] ?? {
      is_registered: false,
      is_confirmed: false,
      has_email: false,
      has_google: false,
    };

    // ── Ban check first (overrides every other branch) ────────────────
    if (status.is_registered) {
      const ban = await supabase.rpc("email_ban_status", { check_email: cleanEmail });
      if (!ban.error) {
        const row = (ban.data as
          | { is_banned: boolean; banned_until: string | null }[]
          | null)?.[0];
        if (row?.is_banned) {
          setSubmittingEmail(false);
          const until = row.banned_until ? formatBanUntilExact(row.banned_until, lang) : null;
          toast.error(until ? t("auth.errUserBannedFor", { until }) : t("auth.errUserBanned"));
          return;
        }
      }
    }

    // Block only CONFIRMED accounts. An unconfirmed pending signup falls
    // through so signUp resends the confirmation link to the same user.
    if (status.is_registered && status.is_confirmed) {
      setSubmittingEmail(false);
      setExistingAccount(true);
      setExistingHasEmail(status.has_email);
      setExistingHasGoogle(status.has_google);
      toast.error(t("signup.errAccountExists"));
      return;
    }

    // ── Step 2: create the account (email confirmation required) ──────
    const fullName = fullNameFrom(firstName, lastName);
    const callSignUp = (token: string | null) =>
      supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: callback,
          ...(token ? { captchaToken: token } : {}),
          data: {
            full_name: fullName,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        },
      });

    let { data, error: err } = await callSignUp(tokenForCall);

    if (err?.code === "captcha_failed" && TURNSTILE_SITE_KEY) {
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      const fresh = await waitForFreshCaptchaToken(captchaResolveRef);
      if (fresh) {
        setCaptchaToken(fresh);
        ({ data, error: err } = await callSignUp(fresh));
      }
    }

    turnstileRef.current?.reset();
    setCaptchaToken(null);
    setSubmittingEmail(false);

    if (err) {
      // email_exists / identity_already_exists → existing-account banner.
      if (err.code === "email_exists" || err.code === "user_already_exists") {
        setExistingAccount(true);
        setExistingHasEmail(true);
        setExistingHasGoogle(false);
        return;
      }
      toast.error(t(authErrorTranslationKey(err)));
      return;
    }

    // Supabase obfuscates a signUp for an already-registered confirmed
    // email by returning a user with an EMPTY identities array and no
    // error (anti-enumeration). Treat that as "account exists" so the
    // user is pointed at /login rather than waiting for an email that
    // will never arrive.
    const identities = (data?.user as { identities?: unknown[] } | null)?.identities;
    if (data?.user && Array.isArray(identities) && identities.length === 0) {
      setExistingAccount(true);
      setExistingHasEmail(true);
      setExistingHasGoogle(false);
      toast.error(t("signup.errAccountExists"));
      return;
    }

    // Confirmation email sent — show the "check your email to confirm" state.
    // No toast: the banner communicates it, and a "sign-in link" toast would
    // be wrong (this is a confirmation email, not a magic link).
    setSent(true);
  }

  function handleGoogle() {
    // DIY OAuth — see LoginForm.handleGoogle.
    setSubmittingGoogle(true);
    const initParams = new URLSearchParams();
    if (next) initParams.set("next", next);
    const initPath = `/auth/google/init${
      initParams.toString() ? `?${initParams.toString()}` : ""
    }`;
    window.location.href = initPath;
  }

  if (loading || user) {
    return (
      <p className="text-center text-sm text-[color:var(--color-text-subtle)]">
        {t("login.loading")}
      </p>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.base, ease: EASE.out }}
      className="flex flex-col gap-6"
    >
      <AnimatePresence mode="wait">
        {existingAccount ? (
          <motion.div
            key="existing"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <p className="font-medium">
              {t("signup.existingAccountTitle")} <strong>{email}</strong>
            </p>
            <p className="mt-2">
              {existingHasEmail && existingHasGoogle
                ? t("signup.existingAccountBodyBoth")
                : existingHasGoogle
                  ? t("signup.existingAccountBodyGoogle")
                  : existingHasEmail
                    ? t("signup.existingAccountBodyMagic")
                    : t("signup.existingAccountBody")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-md bg-[color:var(--color-text)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-bg)] hover:opacity-90"
              >
                {t("signup.existingAccountGoToLogin")}
              </a>
              <button
                type="button"
                onClick={() => {
                  setExistingAccount(false);
                  setEmail("");
                }}
                className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-transparent px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/30"
              >
                {t("signup.existingAccountTryAnother")}
              </button>
            </div>
          </motion.div>
        ) : sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-100"
          >
            <p className="font-medium">{t("signup.confirmTitle")}</p>
            <p className="mt-2">
              {t("signup.confirmBody", { email })}
            </p>
            <p className="mt-3 text-xs text-emerald-800 dark:text-emerald-300/90">
              {t("signup.confirmSpamHint")}
            </p>
            <a
              href="/login"
              className="mt-3 inline-flex text-xs font-medium text-emerald-900 underline underline-offset-2 hover:text-emerald-700 dark:text-emerald-100 dark:hover:text-emerald-300"
            >
              {t("signup.confirmGoToLogin")}
            </a>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE.out }}
            onSubmit={handleSignup}
            className="flex flex-col gap-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="first_name">{t("signup.firstName")}</Label>
                <Input
                  id="first_name"
                  type="text"
                  autoComplete="given-name"
                  required
                  placeholder={t("signup.firstNamePlaceholder")}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={submittingEmail || submittingGoogle}
                  maxLength={40}
                />
              </div>
              <div>
                <Label htmlFor="last_name">{t("signup.lastName")}</Label>
                <Input
                  id="last_name"
                  type="text"
                  autoComplete="family-name"
                  placeholder={t("signup.lastNamePlaceholder")}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={submittingEmail || submittingGoogle}
                  maxLength={40}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder={t("login.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submittingEmail || submittingGoogle}
              />
            </div>
            <div>
              <Label htmlFor="password">{t("login.password")}</Label>
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
                  disabled={submittingEmail || submittingGoogle}
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
              <p className="mt-1.5 text-xs text-[color:var(--color-text-subtle)]">
                {t("signup.passwordHint", { n: PASSWORD_MIN_LENGTH })}
              </p>
              <div className="mt-2">
                <PasswordStrength password={password} />
              </div>
            </div>
            <div>
              <Label htmlFor="confirm_password">{t("auth.repeatPassword")}</Label>
              <Input
                id="confirm_password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                placeholder={t("auth.repeatPasswordPlaceholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submittingEmail || submittingGoogle}
              />
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {t("auth.errPasswordMismatch")}
                </p>
              )}
            </div>
            {/* Cloudflare Turnstile — required on every signUp call. */}
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
              disabled={
                submittingEmail ||
                submittingGoogle ||
                !email ||
                !firstName.trim() ||
                !passwordMeetsPolicy(password) ||
                password !== confirmPassword ||
                (!!TURNSTILE_SITE_KEY && !captchaToken)
              }
            >
              <UserPlus className="h-4 w-4" />
              {submittingEmail ? t("signup.creatingAccount") : t("signup.createAccount")}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[color:var(--color-border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[color:var(--color-bg)] px-2 text-[color:var(--color-text-subtle)]">
            {t("login.or")}
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogle}
        disabled={submittingEmail || submittingGoogle}
        className="bg-white text-neutral-800 hover:bg-neutral-50"
      >
        <GoogleIcon size={18} />
        {submittingGoogle ? t("login.googleConnecting") : t("signup.googleButton")}
      </Button>
      {(firstName.trim() || lastName.trim()) && !existingAccount && !sent && (
        <p className="-mt-2 text-center text-xs text-[color:var(--color-text-subtle)]">
          {t("signup.googleOverridesName")}
        </p>
      )}
    </motion.div>
  );
}
