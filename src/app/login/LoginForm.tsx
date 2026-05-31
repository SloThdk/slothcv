/**
 * LoginForm — email + password sign-in, with Google OAuth as the fast path.
 *
 * Strict provider separation (shared/playbooks/supabase-auth-provider-
 * separation.md): before attempting signInWithPassword we probe
 * `public.email_status(email)` so we can give the right message instead of a
 * generic "wrong password":
 *   - !is_registered                 → "no account, sign up first"
 *   - is_registered, has_google only → "use Continue with Google" (the
 *                                       account has no password identity)
 *   - has_email                      → proceed to signInWithPassword
 * A ban pre-check runs in between so a suspended user sees the real reason.
 *
 * On success we HARD-navigate to `next` (window.location.assign) rather than
 * router.push — the gated destination must do a full load so AuthProvider
 * re-reads the freshly-persisted session before AuthGate evaluates, otherwise
 * the soft nav races the SIGNED_IN event and bounces back to /login. See
 * rules/ssr-auth-state-hard-nav.md.
 *
 * Google uses the DIY ID-token flow at /auth/google/init (keeps the consent
 * screen on our own domain); see handleGoogle. The `next` query param is
 * honored so AuthGate-bounced visitors land back where they were headed.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
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
import { GoogleIcon } from "@/components/google-icon";
import { DUR, EASE } from "@/lib/motion";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { t, lang } = useLanguage();
  const next = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error");

  // Positive "your account is confirmed, log in" notice — set by
  // /auth/callback when an email-confirm link's code exchange failed locally
  // but the account was already confirmed server-side (PKCE cross-browser
  // trap). Rendered as a green banner, NOT an error. Read once from the URL
  // via a lazy initializer (the effect below only strips the param). See
  // rules/pkce-email-confirm-cross-browser.md.
  const [confirmedNotice] = useState(
    () => searchParams.get("notice") === "email_confirmed",
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Two distinct submitting states so clicking "Continue with Google" doesn't
  // flip the password button's label, and vice versa.
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [submittingGoogle, setSubmittingGoogle] = useState(false);
  // Cloudflare Turnstile token. null = challenge not yet solved (or expired).
  // Required by Supabase auth (CAPTCHA enabled in the dashboard) — every
  // signInWithPassword call MUST carry captchaToken. Single-use; we reset the
  // widget after each submit so the next attempt gets a fresh one.
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState(false);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const captchaResolveRef = useRef<((token: string) => void) | null>(null);

  // bfcache safety: the Google OAuth redirect navigates away; the back button
  // can restore this page from bfcache with React state intact, leaving the
  // Google button stuck loading. pageshow(persisted) clears the flags.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        setSubmittingPassword(false);
        setSubmittingGoogle(false);
      }
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Strip ?notice=email_confirmed from the URL once on mount (the banner
  // state was already read from it via the lazy initializer above). Uses
  // history.replaceState, not setState — no re-render, no effect-setState.
  useEffect(() => {
    if (confirmedNotice && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("notice");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on mount
  }, []);

  // Hard timeout for a stuck Turnstile widget — if 12 s pass with neither a
  // token nor an error, the widget script is wedged; force captchaError so
  // the Retry button appears instead of a silently greyed-out submit.
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    if (captchaToken || captchaError) return;
    const timer = setTimeout(() => setCaptchaError(true), 12000);
    return () => clearTimeout(timer);
  }, [captchaToken, captchaError]);

  // Forward already-signed-in users so they don't see a confusing login form.
  useEffect(() => {
    if (!loading && user) {
      const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      router.replace(safe);
    }
  }, [loading, user, next, router]);

  // Surface ?error=... once auth state settles (e.g. provider-mixing bounce
  // from /auth/google/finalize). Skip the toast if the user is already signed
  // in — they're being redirected. Strip the param either way so it doesn't
  // re-fire on language toggle.
  useEffect(() => {
    if (loading) return;
    if (!error) return;
    const untilRaw = searchParams.get("until");
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    url.searchParams.delete("until");
    router.replace(url.pathname + url.search);
    if (user) return;
    if (error === "account_suspended" && untilRaw) {
      const until = formatBanUntilExact(untilRaw, lang);
      if (until) {
        toast.error(t("auth.errUserBannedFor", { until }));
        return;
      }
    }
    const key = callbackErrorTranslationKey(error) ?? "login.errExchangeGeneric";
    toast.error(t(key));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- guarded one-shot on first non-loading render
  }, [loading]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) return;

    setSubmittingPassword(true);

    // CAPTCHA gate — race-safe: if the user submits before Turnstile issued
    // its first token, wait up to 8 s for a fresh one before bouncing them.
    let tokenForCall: string | null = captchaToken;
    if (TURNSTILE_SITE_KEY && !tokenForCall) {
      tokenForCall = await waitForFreshCaptchaToken(captchaResolveRef);
      if (!tokenForCall) {
        setSubmittingPassword(false);
        toast.error(t("auth.errCaptchaFailed"));
        return;
      }
      setCaptchaToken(tokenForCall);
    }

    const supabase = createClient();

    // ── Step 1: provider-aware existence probe (no captcha consumed) ──
    const probe = await supabase.rpc("email_status", { check_email: cleanEmail });
    if (probe.error) {
      setSubmittingPassword(false);
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

    if (!status.is_registered) {
      setSubmittingPassword(false);
      toast.error(t("login.errNoAccount"));
      return;
    }

    // ── Step 1.5: ban check (overrides provider routing) ──────────────
    const ban = await supabase.rpc("email_ban_status", { check_email: cleanEmail });
    if (!ban.error) {
      const row = (ban.data as
        | { is_banned: boolean; banned_until: string | null }[]
        | null)?.[0];
      if (row?.is_banned) {
        setSubmittingPassword(false);
        const until = row.banned_until ? formatBanUntilExact(row.banned_until, lang) : null;
        toast.error(until ? t("auth.errUserBannedFor", { until }) : t("auth.errUserBanned"));
        return;
      }
    }

    // ── Step 1.6: OAuth-only account → refuse password, point to Google ──
    if (!status.has_email && status.has_google) {
      setSubmittingPassword(false);
      toast.error(t("login.errOAuthOnlyGoogle"));
      return;
    }

    // ── Step 2: sign in with password ─────────────────────────────────
    // Auto-retry once on captcha_failed (single-use token exhausted /
    // expired at the 5-minute boundary): reset the widget, wait for a
    // fresh token, retry before surfacing any error.
    const callSignIn = (token: string | null) =>
      supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
        options: token ? { captchaToken: token } : {},
      });

    let { error: err } = await callSignIn(tokenForCall);

    if (err?.code === "captcha_failed" && TURNSTILE_SITE_KEY) {
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      const fresh = await waitForFreshCaptchaToken(captchaResolveRef);
      if (fresh) {
        setCaptchaToken(fresh);
        ({ error: err } = await callSignIn(fresh));
      }
    }

    if (err) {
      // Token is spent — reset for the retry.
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      setSubmittingPassword(false);
      const code = err.code;
      const m = (err.message ?? "").toLowerCase();
      if (code === "invalid_credentials" || m.includes("invalid login") || m.includes("invalid credentials")) {
        toast.error(t("login.errInvalidCredentials"));
      } else if (code === "email_not_confirmed" || m.includes("email not confirmed")) {
        toast.error(t("auth.errEmailNotConfirmed"));
      } else {
        toast.error(t(authErrorTranslationKey(err)));
      }
      return;
    }

    // Success → HARD nav so the destination loads with fresh auth state.
    const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    window.location.assign(safe);
  }

  function handleGoogle() {
    // DIY OAuth at our own /auth/google/init Cloudflare Function — keeps
    // Google's consent screen on our domain (not the supabase.co subdomain).
    // Full navigation so the Function can set its httpOnly state cookies.
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
      {confirmedNotice && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-100"
        >
          {t("login.noticeEmailConfirmed")}
        </div>
      )}
      <form onSubmit={handleLogin} className="flex flex-col gap-3">
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
            disabled={submittingPassword || submittingGoogle}
            className="mt-1.5"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="text-sm font-medium text-[color:var(--color-text)]"
          >
            {t("login.password")}
          </label>
          <div className="relative mt-1.5">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder={t("login.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submittingPassword || submittingGoogle}
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
          <div className="mt-1.5 text-right">
            <Link
              href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
              className="text-xs font-medium text-[color:var(--color-text-subtle)] underline-offset-4 hover:text-[color:var(--color-text)] hover:underline"
            >
              {t("login.forgotPassword")}
            </Link>
          </div>
        </div>

        {/* Cloudflare Turnstile — required by Supabase auth on every
            signInWithPassword call when CAPTCHA is enabled. The submit
            button stays disabled until the token is present. */}
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
            submittingPassword ||
            submittingGoogle ||
            !email ||
            !password ||
            (!!TURNSTILE_SITE_KEY && !captchaToken)
          }
        >
          <LogIn className="h-4 w-4" />
          {submittingPassword ? t("login.loggingIn") : t("login.logIn")}
        </Button>
      </form>

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

      {/* Google sign-in — per Google brand guidelines: white bg, full-color G. */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogle}
        disabled={submittingPassword || submittingGoogle}
        className="bg-white text-neutral-800 hover:bg-neutral-50"
      >
        <GoogleIcon size={18} />
        {submittingGoogle ? t("login.googleConnecting") : t("login.googleButton")}
      </Button>
    </motion.div>
  );
}
