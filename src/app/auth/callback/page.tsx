/**
 * /auth/callback — finishes the magic-link / OAuth round-trip.
 *
 * Phase 1 ships as a static export, so this is a client component (no
 * Route Handler). Supabase's PKCE flow appends `?code=...` to the redirect;
 * `exchangeCodeForSession` swaps it for a session cookie/local-storage token,
 * after which we navigate to the `next` param the login form passed in.
 *
 * If anything goes wrong, we send the user back to /login with an error
 * flag — never leave them on a blank screen.
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
        router.replace(user ? safeNext : "/login?error=missing_code");
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
        router.replace(safeNext);
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
        router.replace(safeNext);
        return;
      }

      // Genuinely no session — bounce with the specific error code so
      // /login can render the right copy.
      const errCode = exchangeErrorToCallbackCode(error);
      router.replace(`/login?error=${errCode}`);
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
