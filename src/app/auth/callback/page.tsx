/**
 * /auth/callback — finishes the email-confirmation / password-recovery /
 * OAuth round-trip.
 *
 * Static export → client component (no Route Handler). Supabase's PKCE flow
 * appends `?code=...`; `exchangeCodeForSession` swaps it for a session, then
 * we hard-nav to `next` (recovery → /reset-password).
 *
 * The critical edge case (rules/pkce-email-confirm-cross-browser.md): the
 * mail link hits GoTrue's /verify FIRST — which CONFIRMS the e-mail — and
 * THEN redirects here with the code. If the exchange then fails (verifier
 * lost: confirm link opened in a different / logged-out browser, or code
 * already used), the account is STILL confirmed. So a failed exchange WITH a
 * code present is NOT an expired link → we send the user to
 * /login?notice=email_confirmed (a positive "log in" notice), never a red
 * "expired" error. "Expired" is only truthful when GoTrue returns
 * error_code=otp_expired with NO code. Recovery is the exception (it needs
 * the live session, so a spent recovery link → request a fresh one).
 */

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { exchangeErrorToCallbackCode } from "@/lib/auth-errors";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;
    const code = params.get("code");
    const next = params.get("next") ?? "/dashboard";
    const errorDescription = params.get("error_description");
    // GoTrue puts the structured reason in `error_code` (PKCE flow → query
    // string). `otp_expired` here, with NO `code`, is the ONLY truthful
    // "link expired" — the verify never ran. See
    // rules/pkce-email-confirm-cross-browser.md.
    const errorCode = params.get("error_code");
    // Password-recovery links carry ?type=recovery. After the code exchange
    // the user holds a temporary recovery session — we send them to
    // /reset-password to pick a new password instead of into the app.
    const isRecovery = params.get("type") === "recovery";
    const recoveryTarget = "/reset-password";

    // Sanitize `next` once. Only relative paths — never honor a full URL,
    // even if it points at our domain (would be an open-redirect waiting to
    // be turned into a phishing template).
    const safeNext =
      next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

    // Provider-side error (e.g. user denied OAuth consent, or identity
    // collision: same email used previously via a different identity and
    // automatic linking is not enabled). Map the most common ones to a
    // short error code so /login can render friendly copy without leaking
    // raw provider strings to the user.
    if (errorDescription) {
      const lower = errorDescription.toLowerCase();
      let mapped = "exchange_failed";
      // Detect prevent_provider_mixing trigger / GoTrue's native collision
      // check. GoTrue wraps Postgres trigger exceptions before passing
      // them to the OAuth redirect — the literal phrase Supabase emits
      // is "Error creating identity" (verified empirically 2026-04-27),
      // NOT the trigger's own message text. The other patterns below
      // cover other wrappings GoTrue uses for related auth-DB failures
      // and our own custom tags.
      if (
        lower.includes("error creating identity") ||
        lower.includes("user already") ||
        lower.includes("identity already") ||
        lower.includes("identity_already_exists") ||
        lower.includes("database error saving new user") ||
        lower.includes("database error saving identity") ||
        lower.includes("database error linking") ||
        lower.includes("error saving new user") ||
        lower.includes("error saving identity") ||
        lower.includes("23505") ||
        lower.includes("duplicate key") ||
        lower.includes("unique_violation") ||
        lower.includes("unique constraint") ||
        lower.includes("account_exists_other_method") ||
        lower.includes("provider_mixing")
      ) {
        // Google OAuth attempted with an email that already belongs to a
        // magic-link account. The only path that reaches /auth/callback
        // with a DB-layer error in SlothCV is the prevent_provider_mixing
        // trigger blocking the identity insert, so we route everything
        // matching the wide net above to the specific "use magic link"
        // toast.
        mapped = "account_exists_use_magic_link";
      } else if (
        lower.includes("user is banned") ||
        lower.includes("user_banned") ||
        lower.includes("user banned") ||
        lower.includes("account suspended") ||
        lower.includes("account_suspended") ||
        lower.includes("suspended")
      ) {
        // Banned user clicked the magic link / completed OAuth. Surface
        // the explicit "suspended" toast instead of the generic
        // "sign-in didn't complete" — the user otherwise has no idea
        // why they're stuck and may keep re-requesting fresh links
        // into a dead end.
        mapped = "account_suspended";
      } else if (
        errorCode === "otp_expired" ||
        lower.includes("expired") ||
        lower.includes("invalid or has expired")
      ) {
        // GoTrue returned an error and issued NO code → the /verify step
        // never confirmed anything, so the link genuinely expired or was
        // malformed. This is the ONLY branch where "expired" is truthful.
        // (A failed exchange WITH a code present is handled below as a
        // CONFIRMED account, never as "expired".) See
        // rules/pkce-email-confirm-cross-browser.md.
        mapped = "link_expired";
      } else if (lower.includes("access_denied") || lower.includes("denied")) {
        // User declined the OAuth consent screen.
        mapped = "oauth_declined";
      }
      // Use a known short-code, never the raw provider string. The old
      // code put the raw description into the URL which then leaked
      // through `decodeURIComponent` on the receiving page.
      router.replace(`/login?error=${mapped}`);
      return;
    }

    if (!code) {
      // No code in URL. Two possibilities:
      //   1. Stale callback bookmark — bounce to /login with a code.
      //   2. User is already signed in (callback re-loaded after success)
      //      — just forward to where they wanted to go.
      (async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        // Already signed in → hard-nav to the gated destination so it loads
        // with fresh auth state. Not signed in → a soft redirect to /login
        // is fine (login is client-reactive; there's no session to reflect).
        if (user) window.location.assign(isRecovery ? recoveryTarget : safeNext);
        else router.replace("/login?error=missing_code");
      })();
      return;
    }

    (async () => {
      const supabase = createClient();

      // ALWAYS attempt the exchange. Supabase replaces any pre-existing
      // session with the one created by this code, which is what we
      // want — it's the C1 mitigation. We do NOT signOut first because
      // signOut({scope:'local'}) wipes localStorage including the PKCE
      // code_verifier that exchangeCodeForSession needs to read; doing
      // so breaks every magic-link AND every OAuth callback.
      //
      // Outcomes:
      //   - exchange succeeds → session is now the link-owner's
      //     (Supabase overwrites). C1 (Bob's link in Alice's browser
      //     replacing Alice with Bob) is the desired behavior.
      //   - exchange fails because code already used (double-click,
      //     refresh on success page) AND there's a valid existing
      //     session → that session was almost certainly created by
      //     the FIRST click of this same link. Forward to safeNext.
      //   - exchange fails for any other reason → bounce to /login
      //     with the specific reason. Do NOT auto-forward using a
      //     pre-existing session, since we can't prove it belongs
      //     to whoever owns this link.
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;

      if (!error) {
        setMessage("Signed in. Redirecting…");
        // HARD navigation, not router.replace: the destination must do a
        // full load so the AuthProvider re-reads the freshly-persisted
        // @supabase/ssr session on mount. A soft nav can land on the gated
        // page before the async SIGNED_IN event commits to context, which
        // makes AuthGate see {loading:false, user:null} and bounce the user
        // back to /login — the "I have to refresh before it logs me in"
        // symptom. See rules/ssr-auth-state-hard-nav.md.
        // Recovery links route to /reset-password (the user is in a
        // temporary recovery session and must set a new password).
        window.location.assign(isRecovery ? recoveryTarget : safeNext);
        return;
      }

      // Exchange failed. Before bouncing to /login with an error, check
      // if the user has a valid session anyway (this happens when:
      //   1. They double-clicked the magic link — first click consumed
      //      the code and gave them a session; second click hits this
      //      branch with "code already used".
      //   2. They refreshed the success page after sign-in.
      //   3. PKCE verifier was lost mid-flow but a parallel tab already
      //      completed the exchange.
      // In any of these cases the user IS signed in. Showing them an
      // error toast then auto-redirecting to /dashboard is confusing —
      // they end up on the dashboard with a red toast for no reason.
      // Just forward silently if a valid session exists.
      const {
        data: { user: existing },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (existing) {
        // Valid session despite the failed exchange (double-clicked link /
        // refreshed success page) — hard-nav so the destination loads
        // logged-in instead of racing the soft-nav. See
        // rules/ssr-auth-state-hard-nav.md.
        window.location.assign(isRecovery ? recoveryTarget : safeNext);
        return;
      }

      // Exchange failed AND there's no session — but a `code` WAS present.
      // Per rules/pkce-email-confirm-cross-browser.md: GoTrue's /verify step
      // (which the mail link hit BEFORE redirecting here with the code)
      // ALREADY confirmed the e-mail. Only local PKCE session creation failed
      // — the code_verifier is gone because the confirm link opened in a
      // different / logged-out browser, or the code was already consumed.
      // So the account IS active; "link expired" would be a lie. Branch:
      const errCode = exchangeErrorToCallbackCode(error);
      if (errCode === "account_exists_use_magic_link" || errCode === "account_suspended") {
        // Provider-mixing collision / banned account keep their truthful,
        // specific messages.
        router.replace(`/login?error=${errCode}`);
        return;
      }
      if (isRecovery) {
        // Recovery genuinely needs the live session to set a new password —
        // a spent recovery link means request a fresh one.
        router.replace("/forgot-password?error=link_expired");
        return;
      }
      // Confirmation flow: the account is confirmed. Send the user to /login
      // with a POSITIVE "your account is confirmed, log in" notice — never a
      // red "expired" error.
      router.replace("/login?notice=email_confirmed");
    })();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-muted">
      {message}
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-muted">
          Loading…
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
