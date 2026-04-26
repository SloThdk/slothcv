/**
 * SignupForm — first-time account creation via magic link or Google OAuth.
 *
 * Differs from LoginForm in two substantive ways:
 *   1. Collects first + last name. These get joined into `full_name` and
 *      passed via signInWithOtp's `options.data` so Supabase stores them on
 *      auth.users.raw_user_meta_data — the handle_new_user trigger
 *      (migration 0005) then writes them to the profiles row.
 *   2. Detects the "you already have an account" case BEFORE sending a
 *      magic link, by probing with a `shouldCreateUser:false` call first.
 *      If the probe succeeds (email exists), we abort the signup and
 *      direct the user to /login. If the probe fails with "user not
 *      found", we proceed with the real signup that creates the account.
 *
 * Why the two-call probe pattern (instead of just sending the magic link
 * and hoping for the best):
 *   Supabase doesn't expose a "does this email exist" check from the
 *   client (deliberately — would be an enumeration attack vector). The
 *   probe technique is the standard workaround:
 *     - Probe call:  signInWithOtp({email, shouldCreateUser:false})
 *         · If user EXISTS → success (a magic link is sent — see below)
 *         · If user is NEW → error "Signups not allowed for otp"
 *     - Branch on that result:
 *         · Existing user → show "account already exists, use Google or
 *           the link we just sent you (from /login)"
 *         · New user → run the actual signup with the name metadata
 *
 * Side effect we accept:
 *   When an existing user tries to sign up, the probe DOES send them an
 *   unsolicited magic link before we tell them to stop. This is
 *   unavoidable without a server-side check. Acceptable because:
 *     · The link goes to their own verified email — no privacy leak
 *     · The link works (signs them into their existing account)
 *     · We surface a clear message explaining what happened
 *     · It happens at most once per signup attempt; not abuse-prone
 *
 * Identity-collision matrix:
 *
 *   ┌───────────────────────────┬─────────────────────────────────────────┐
 *   │ Existing account state    │ What happens when they submit /signup    │
 *   ├───────────────────────────┼─────────────────────────────────────────┤
 *   │ Google OAuth account for  │ Probe succeeds → we abort signup and    │
 *   │ this email                │ show "account exists, sign in with       │
 *   │                           │ Google" (with link to /login).           │
 *   ├───────────────────────────┼─────────────────────────────────────────┤
 *   │ Magic-link account for    │ Probe succeeds → we abort signup and    │
 *   │ this email                │ tell user to use the link we just sent  │
 *   │                           │ (or visit /login).                       │
 *   ├───────────────────────────┼─────────────────────────────────────────┤
 *   │ No account                │ Probe errors → we proceed with real     │
 *   │                           │ signup carrying the name metadata.       │
 *   └───────────────────────────┴─────────────────────────────────────────┘
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  classifyAuthError,
} from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "@/components/google-icon";
import { DUR, EASE } from "@/lib/motion";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const next = searchParams.get("next") ?? "/dashboard";
  const queryError = searchParams.get("error");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  // Per-button submitting flags so clicking Google doesn't flip the email
  // button's label to "Sending…" (and vice versa). Same pattern as
  // LoginForm — both flows are independent.
  const [submittingMagic, setSubmittingMagic] = useState(false);
  const [submittingGoogle, setSubmittingGoogle] = useState(false);
  const [sent, setSent] = useState(false);
  // Distinct from `sent`: set when the probe detected an existing account.
  // Renders a different message that points the user at /login instead of
  // the generic "check your inbox" success state.
  const [existingAccount, setExistingAccount] = useState(false);
  // Cloudflare Turnstile token. Required by Supabase auth (CAPTCHA enabled
  // in dashboard). Mitigates the user-enumeration vector inherent to the
  // probe pattern (Supabase issues #1547, #1955) by forcing every probe
  // through a CAPTCHA challenge.
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  // bfcache safety: same as LoginForm — Google OAuth navigates away, back
  // button restores from bfcache with React state preserved. Reset the
  // submitting flags on bfcache restore so the buttons aren't stuck loading.
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

  // Forward already-signed-in users so they don't see a confusing signup form.
  useEffect(() => {
    if (!loading && user) {
      const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      router.replace(safe);
    }
  }, [loading, user, next, router]);

  // Surface ?error=... once auth state has settled. Skip the toast if
  // the user is already signed in — they're about to be redirected, no
  // point flashing an error for a flow that already succeeded. Strip
  // the param either way so it doesn't re-fire on re-render.
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

  // Build the absolute callback URL on the client so we hit the same origin
  // we're running on (works in localhost AND on every Pages preview URL).
  const callback = useMemo(() => {
    if (typeof window === "undefined") return "/auth/callback";
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("next", next);
    return url.toString();
  }, [next]);

  // Trim + collapse whitespace before storing — defense against users
  // typing extra spaces.
  function fullNameFrom(first: string, last: string): string {
    const f = first.trim().replace(/\s+/g, " ");
    const l = last.trim().replace(/\s+/g, " ");
    return [f, l].filter(Boolean).join(" ");
  }

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Trim whitespace from the email — copy-pasted addresses often carry
    // leading/trailing spaces that Supabase's email validator rejects.
    const cleanEmail = email.trim();
    if (!cleanEmail) return;
    if (!firstName.trim()) {
      toast.error(t("signup.errFirstNameRequired"));
      return;
    }
    // CAPTCHA gate — same as LoginForm. Refuse early if no token.
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      toast.error(t("auth.errCaptchaFailed"));
      return;
    }
    setSubmittingMagic(true);
    const supabase = createClient();

    // ── Step 1: probe for existing account ─────────────────────────────
    // shouldCreateUser:false → succeeds (sends a magic link) ONLY if the
    // email already has an account. If the email is unknown, Supabase
    // refuses with "Signups not allowed for otp" without sending anything.
    const probe = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: callback,
        shouldCreateUser: false,
        ...(captchaToken ? { captchaToken } : {}),
      },
    });
    // Token used — reset for next call regardless of branch.
    turnstileRef.current?.reset();
    setCaptchaToken(null);

    if (!probe.error) {
      // Account exists. The probe also sent a magic link to their inbox —
      // we tell the user that, AND point them at /login for the alternate
      // method (Google) in case they originally used that.
      setSubmittingMagic(false);
      setExistingAccount(true);
      toast.error(t("signup.errAccountExists"));
      return;
    }

    // Use classifyAuthError ONLY here because we need to BRANCH on intent
    // ("is this email new? then proceed to step 2"). For the actual error
    // toast we use authErrorTranslationKey to get the specific message.
    const kind = classifyAuthError(probe.error);
    if (kind !== "user_not_found") {
      setSubmittingMagic(false);
      toast.error(t(authErrorTranslationKey(probe.error)));
      return;
    }

    // ── Step 2: real signup ────────────────────────────────────────────
    // Probe returned "user not found" → email is genuinely new. The probe
    // consumed our captcha token; we need a fresh one for the actual
    // signup call. The managed-mode widget auto-reissues a token in
    // <1-2s for low-risk users (no UI shown), so poll the widget's
    // getResponse() up to 6s. If still empty, ask the user to solve.
    let freshToken: string | null = captchaToken;
    if (TURNSTILE_SITE_KEY) {
      for (let i = 0; i < 30 && !freshToken; i++) {
        await new Promise((r) => setTimeout(r, 200));
        freshToken = turnstileRef.current?.getResponse() ?? null;
      }
      if (!freshToken) {
        setSubmittingMagic(false);
        toast.error(t("auth.errCaptchaFailed"));
        return;
      }
    }

    const fullName = fullNameFrom(firstName, lastName);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: callback,
        ...(freshToken ? { captchaToken: freshToken } : {}),
        data: {
          full_name: fullName,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    });
    turnstileRef.current?.reset();
    setCaptchaToken(null);
    setSubmittingMagic(false);
    if (err) {
      // Render the SPECIFIC reason — same precise mapping as login.
      // "user_not_found" race-falling-through here (email deleted between
      // probe and step 2) renders the standard "no account" message,
      // which is honest about what just happened.
      toast.error(t(authErrorTranslationKey(err)));
      return;
    }
    setSent(true);
    toast.success(t("login.linkSentSuccess"));
  }

  async function handleGoogle() {
    // No captcha gate: signInWithOAuth doesn't take captchaToken and
    // GoTrue doesn't enforce CAPTCHA on the OAuth /authorize endpoint
    // (Google does its own bot detection). Turnstile on this page is
    // for the magic-link probe only.
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
    // On success the browser is redirected away — if the user comes back
    // via the browser's back button, the `pageshow` bfcache listener at
    // the top of this component clears `submittingGoogle` so the button
    // isn't stuck on "Connecting…" with no path to recover.
  }

  if (loading || user) {
    return (
      <p className="text-center text-sm text-[color:var(--color-text-subtle)]">
        {t("login.loading")}
      </p>
    );
  }

  return (
    // Mount entrance: 250ms fade+rise mirrors LoginForm so the two pages
    // feel symmetric. AnimatePresence with mode="wait" cycles between
    // the three possible states (existing-account banner, sent banner,
    // form) without overlap.
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.base, ease: EASE.out }}
      className="flex flex-col gap-6"
    >
      <AnimatePresence mode="wait">
      {existingAccount ? (
        // Probe found an existing account. Tell the user clearly: their
        // email is already registered, and direct them at /login. They
        // also got an unsolicited magic link in their inbox — surface that
        // so they're not confused if they spot it.
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
          <p className="mt-2">{t("signup.existingAccountBody")}</p>
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
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <p>
            {t("login.linkSentTo")} <strong>{email}</strong>. {t("login.linkSentBody")}
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setEmail("");
              // Keep firstName/lastName — user likely just typo'd email.
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
          {/* Stack name fields on narrow phones — two side-by-side inputs
              get cramped under ~360px. Switch to a 2-col grid at sm. */}
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
                disabled={submittingMagic || submittingGoogle}
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
                disabled={submittingMagic || submittingGoogle}
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
              disabled={submittingMagic || submittingGoogle}
            />
          </div>
          {/* Cloudflare Turnstile widget. Managed mode auto-passes for
              low-risk users (no UI shown). Required by Supabase auth on
              every signInWithOtp call when CAPTCHA is enabled. The probe
              consumes the first token; handleMagicLink polls for a fresh
              one before the real-signup call. */}
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
              !firstName.trim() ||
              (!!TURNSTILE_SITE_KEY && !captchaToken)
            }
          >
            <Mail className="h-4 w-4" />
            {submittingMagic ? t("login.sending") : t("signup.createAccount")}
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

      {/* Google sign-in button. Per Google's brand guidelines:
          white background, neutral border, full-color "G" mark. */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogle}
        disabled={submittingMagic || submittingGoogle}
        className="bg-white text-neutral-800 hover:bg-neutral-50"
      >
        <GoogleIcon size={18} />
        {submittingGoogle ? t("login.googleConnecting") : t("signup.googleButton")}
      </Button>
      {/* I5 fix: when user has typed a name, warn that Google overrides it
          with the name from their Google profile. Hidden when fields are
          empty so we don't add noise to the no-input default state. */}
      {(firstName.trim() || lastName.trim()) && !existingAccount && !sent && (
        <p className="-mt-2 text-center text-xs text-[color:var(--color-text-subtle)]">
          {t("signup.googleOverridesName")}
        </p>
      )}
    </motion.div>
  );
}
