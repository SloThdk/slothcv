/**
 * LoginForm — magic-link email + Google OAuth.
 *
 * Both flows complete at `/auth/callback`. The `next` query param is honored
 * so when AuthGate bounces an anonymous visitor here, they land back on the
 * page they were trying to reach after sign-in. Already-signed-in users are
 * forwarded to `next` immediately so the back button doesn't strand them on
 * the login page.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  authErrorTranslationKey,
  callbackErrorTranslationKey,
} from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleIcon } from "@/components/google-icon";
import { DUR, EASE } from "@/lib/motion";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const next = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  // Two distinct submitting states — earlier we shared one `submitting`
  // flag across both buttons, so clicking "Continue with Google" flipped
  // the email button's label to "Sending…" too. The two flows have nothing
  // to do with each other; keep them in their own slots so each button
  // only reflects its own pending work.
  const [submittingMagic, setSubmittingMagic] = useState(false);
  const [submittingGoogle, setSubmittingGoogle] = useState(false);
  const [sent, setSent] = useState(false);
  // Cloudflare Turnstile token. null = challenge not yet solved (or expired).
  // Required by Supabase auth (we enabled SECURITY_CAPTCHA_PROVIDER=turnstile
  // in dashboard) — every signInWithOtp / signInWithOAuth call MUST include
  // captchaToken or Supabase returns "captcha_failed". Token is single-use;
  // we reset the widget after each submit so the next attempt gets a fresh
  // one. Tokens expire after 5 minutes per Cloudflare default.
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  // bfcache safety: when the user starts the Google OAuth redirect, the
  // browser navigates away — but pressing the back arrow can restore this
  // page from the back-forward cache with React state preserved verbatim.
  // That left the Google button stuck on its loading state forever (no
  // code path ran to reset after navigation-away-then-back). Listen for
  // `pageshow` with `event.persisted=true` (= "this page came from
  // bfcache") and clear both submitting flags. React effects don't re-run
  // on bfcache restores, so this listener is the only safe place.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        setSubmittingMagic(false);
        setSubmittingGoogle(false);
      }
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Forward already-signed-in users so they don't see a confusing login form.
  useEffect(() => {
    if (!loading && user) {
      const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      router.replace(safe);
    }
  }, [loading, user, next, router]);

  // Surface ?error=... once on mount so the user knows the previous attempt
  // failed. Two important guards:
  //   1. Wait for `loading` to settle so we know whether the user is
  //      actually signed in. Firing before then races the auto-redirect
  //      effect above and shows a toast on the dashboard.
  //   2. If the user IS signed in, clear the error param silently and
  //      let the redirect happen — they don't need to see an error for
  //      a flow that already succeeded (typical case: double-click of a
  //      magic link → exchange fails on 2nd click but session is valid
  //      from the 1st).
  // Mapping lives in lib/auth-errors so SignupForm + future callers stay
  // in sync. Unknown / tampered codes fall back to generic copy — we
  // never render raw error strings to the user.
  //
  // No decodeURIComponent: useSearchParams.get() already URI-decodes once.
  // Decoding twice throws URIError on bare `?error=%`.
  useEffect(() => {
    if (loading) return;
    if (!error) return;
    // Strip the param either way so it doesn't re-fire on language toggle.
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    router.replace(url.pathname + url.search);
    // Only TOAST if the user is anonymous. Signed-in users with a stale
    // ?error= param just get the silent cleanup — they're being redirected.
    if (user) return;
    const key = callbackErrorTranslationKey(error) ?? "login.errExchangeGeneric";
    toast.error(t(key));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- guarded one-shot on first non-loading render
  }, [loading]);

  // Build the absolute callback URL on the client so we hit the same origin
  // we're running on (works in localhost AND on every Pages preview URL).
  const callback = (() => {
    if (typeof window === "undefined") return "/auth/callback";
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("next", next);
    return url.toString();
  })();

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Trim whitespace from the email — copy-pasted addresses often carry
    // leading/trailing spaces that Supabase's email validator rejects.
    const cleanEmail = email.trim();
    if (!cleanEmail) return;
    // CAPTCHA gate: Supabase rejects with `captcha_failed` if missing.
    // Refuse early so the user sees the specific "couldn't verify human"
    // toast instead of the generic backend error. The managed-mode
    // widget auto-passes for low-risk users (no visible UI), so this
    // rarely blocks honest visitors. Only enforce if sitekey configured.
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      toast.error(t("auth.errCaptchaFailed"));
      return;
    }
    setSubmittingMagic(true);
    const supabase = createClient();
    // shouldCreateUser:false makes /login a STRICT sign-in flow:
    //   - If the email matches an existing user → magic link is sent.
    //   - If it doesn't → Supabase returns "Signups not allowed for otp",
    //     which we map to a friendly "no account found, sign up instead?"
    //     copy. This prevents typo'd emails from silently creating empty
    //     accounts (which was the prior behavior and would inflate the
    //     auth.users table with abandoned ghost accounts).
    const { error: err } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: callback,
        shouldCreateUser: false,
        // Pass token if present, omit otherwise. When Supabase CAPTCHA
        // re-enabled, an absent token returns captcha_failed → friendly
        // toast. When disabled, token is ignored either way.
        ...(captchaToken ? { captchaToken } : {}),
      },
    });
    // Reset Turnstile so the next attempt has a fresh single-use token.
    turnstileRef.current?.reset();
    setCaptchaToken(null);
    setSubmittingMagic(false);
    if (err) {
      // Render the SPECIFIC reason — authErrorTranslationKey reads
      // err.code first (stable Supabase contract) so we surface the
      // actual cause (rate-limited THIS email vs general request limit
      // vs validation failure) instead of a generic stock message.
      toast.error(t(authErrorTranslationKey(err)));
      return;
    }
    setSent(true);
    toast.success(t("login.linkSentSuccess"));
  }

  async function handleGoogle() {
    // No captcha gate: Supabase's signInWithOAuth doesn't take captchaToken
    // and GoTrue doesn't enforce CAPTCHA on the /authorize endpoint —
    // Google handles bot detection at its own consent screen. The
    // Turnstile widget on this page is for the magic-link flow only.
    setSubmittingGoogle(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback },
    });
    if (err) {
      setSubmittingGoogle(false);
      toast.error(t("login.errGoogleFailed"));
    }
    // On success the browser is redirected away — no further state to set.
  }

  if (loading || user) {
    return (
      <p className="text-center text-sm text-[color:var(--color-text-subtle)]">
        {t("login.loading")}
      </p>
    );
  }

  return (
    // Mount entrance: 250ms fade+rise so the form settles in after the
    // route transition. Mode="wait" on the inner AnimatePresence ensures
    // the form fully exits before the success card enters — looks
    // intentional, not chaotic.
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.base, ease: EASE.out }}
      className="flex flex-col gap-6"
    >
      <AnimatePresence mode="wait">
      {sent ? (
        <motion.div
          key="sent"
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -4 }}
          transition={{ duration: DUR.base, ease: EASE.out }}
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <p>
            {t("login.linkSentTo")} <strong>{email}</strong>. {t("login.linkSentBody")}
          </p>
          {/* Escape hatch: typo'd email = stuck without this. */}
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
            className="mt-3 text-xs font-medium text-emerald-900 underline underline-offset-2 hover:text-emerald-700 dark:text-emerald-100 dark:hover:text-emerald-300"
          >
            {t("login.sentWrongEmail")}
          </button>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: EASE.out }}
          onSubmit={handleMagicLink}
          className="flex flex-col gap-3"
        >
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
            disabled={submittingMagic || submittingGoogle}
          />
          {/* Cloudflare Turnstile widget. Managed mode auto-passes for
              low-risk users (no UI shown), shows a checkbox or interstitial
              for suspicious traffic. Required by Supabase auth on every
              signInWithOtp call when CAPTCHA is enabled in dashboard.
              The Send-link button stays disabled until captchaToken !==
              null so users physically can't bypass. Only renders if
              sitekey is configured (graceful degradation if env var
              missing). */}
          {TURNSTILE_SITE_KEY && (
            <div className="flex justify-center">
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => setCaptchaToken(token)}
                onError={() => setCaptchaToken(null)}
                onExpire={() => setCaptchaToken(null)}
                options={{ theme: "auto", size: "normal" }}
              />
            </div>
          )}
          <Button
            type="submit"
            disabled={
              submittingMagic ||
              submittingGoogle ||
              !email ||
              (!!TURNSTILE_SITE_KEY && !captchaToken)
            }
          >
            <Mail className="h-4 w-4" />
            {submittingMagic ? t("login.sending") : t("login.sendLink")}
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

      {/* Google sign-in button. Styled per Google's brand guidelines:
          white background, neutral-300 border, full-color "G" mark.
          Disabled until Turnstile is solved — Supabase requires
          captchaToken on signInWithOAuth too when CAPTCHA is enabled. */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogle}
        disabled={submittingMagic || submittingGoogle}
        className="bg-white text-neutral-800 hover:bg-neutral-50"
      >
        <GoogleIcon size={18} />
        {submittingGoogle ? t("login.googleConnecting") : t("login.googleButton")}
      </Button>
    </motion.div>
  );
}
