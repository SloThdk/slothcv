/**
 * /auth/callback — the `?code=` (query) landing for email-confirmation and
 * password-recovery links. The `#access_token` (fragment) landing is handled
 * separately by <AuthHashHandler> in the root layout — the server/this route
 * can't see a `#fragment`. See rules/auth-link-tokens-in-url-hash.md.
 *
 * Static export → client component. Routing (rules/pkce-email-confirm-cross-browser):
 *   - EMAIL CONFIRMATION (`?code=`, no type): the e-mail is ALREADY verified at
 *     GoTrue's /verify step BEFORE this redirect. We do NOT exchange the code /
 *     open a session — that auto-login is flaky (works only in the same browser
 *     that started signup) and lands people inconsistently. Always route to
 *     /login?notice=email_confirmed (green "konto bekræftet — log ind" banner),
 *     consistent every time. NEVER show "expired" — the account is active.
 *   - PASSWORD RECOVERY (`?type=recovery`): this one NEEDS a live session to set
 *     the new password, so we exchange the code → /reset-password (a spent link
 *     → /forgot-password?error=link_expired).
 *   - GoTrue error with NO code (e.g. error_code=otp_expired) → the ONLY truthful
 *     "expired" → /login?error=link_expired (recovery → /forgot-password).
 *
 * Google OAuth does NOT land here — it runs the DIY id-token flow
 * (/auth/google/{init,callback,finalize}).
 */

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [message] = useState("Et øjeblik…");

  useEffect(() => {
    let cancelled = false;
    const code = params.get("code");
    const errorDescription = params.get("error_description");
    const errorCode = params.get("error_code");
    const isRecovery = params.get("type") === "recovery";

    // ── 1. GoTrue / provider error in the QUERY (no usable token) ──────
    if (errorDescription) {
      const lower = errorDescription.toLowerCase();
      let mapped = "exchange_failed";
      if (
        lower.includes("error creating identity") ||
        lower.includes("identity already") ||
        lower.includes("identity_already_exists") ||
        lower.includes("23505") ||
        lower.includes("duplicate key") ||
        lower.includes("unique constraint") ||
        lower.includes("account_exists_other_method") ||
        lower.includes("provider_mixing")
      ) {
        mapped = "account_exists_use_magic_link";
      } else if (
        lower.includes("banned") ||
        lower.includes("suspend")
      ) {
        mapped = "account_suspended";
      } else if (
        errorCode === "otp_expired" ||
        lower.includes("expired") ||
        lower.includes("invalid or has expired")
      ) {
        // GoTrue returned an error and NO code → /verify never ran → the link
        // genuinely expired. This is the ONLY truthful "expired". See
        // rules/pkce-email-confirm-cross-browser.md.
        mapped = "link_expired";
      } else if (lower.includes("access_denied") || lower.includes("denied")) {
        mapped = "oauth_declined";
      }
      router.replace(
        isRecovery
          ? `/forgot-password?error=${mapped}`
          : `/login?error=${mapped}`,
      );
      return;
    }

    // ── 2. No code (stale/direct hit) ──────────────────────────────────
    if (!code) {
      (async () => {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (user) {
          window.location.assign(isRecovery ? "/reset-password" : "/dashboard");
        } else {
          // Neutral — no false "confirmed", no scary error.
          router.replace(isRecovery ? "/forgot-password?error=link_expired" : "/login");
        }
      })();
      return;
    }

    // ── 3. PASSWORD RECOVERY (?code= + type=recovery) ──────────────────
    // Recovery NEEDS a live session so /reset-password can call updateUser.
    if (isRecovery) {
      (async () => {
        const supabase = createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        window.location.assign(
          error ? "/forgot-password?error=link_expired" : "/reset-password",
        );
      })();
      return;
    }

    // ── 4. EMAIL CONFIRMATION (?code=, no type) ────────────────────────
    // Already verified at GoTrue's /verify before this redirect. Do NOT
    // exchange the code (no flaky auto-login) — route to /login with the
    // positive notice, consistently every time. See
    // rules/pkce-email-confirm-cross-browser.md.
    router.replace("/login?notice=email_confirmed");

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
