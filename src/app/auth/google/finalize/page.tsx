/**
 * /auth/google/finalize — client-side completion of the DIY Google
 * OAuth flow.
 *
 * The Cloudflare Pages Function `/auth/google/callback` exchanged the
 * Google authorization code for an ID token, stored the ID token +
 * nonce in short-lived httpOnly cookies, and redirected the browser
 * here. This page can't read httpOnly cookies, so it `fetch()`-es
 * `/auth/google/finalize-data` (a sibling Function) which:
 *
 *   1. Reads the two cookies (`g_id_token`, `g_id_nonce`)
 *   2. Returns them in a JSON response body
 *   3. Clears both cookies in the response (one-shot consumption)
 *
 * Earlier revision passed the ID token through the URL HASH FRAGMENT
 * (`#id_token=...`) — textbook OAuth implicit-flow handoff. In
 * practice the fragment didn't survive the CF Pages → browser redirect
 * (some browsers / proxies silently strip it), and the page saw an
 * empty `window.location.hash` → bounced to /login with an error.
 * The cookie+fetch handoff is bulletproof on every browser.
 *
 * After getting the ID token + nonce, this page calls
 * `supabase.auth.signInWithIdToken({ provider: "google", token,
 * nonce })`. Supabase verifies the token signature against Google's
 * JWKS, checks aud / iss / exp / nonce, and mints a Supabase session
 * whose cookies @supabase/ssr persists across page loads.
 *
 * Errors map to short codes the existing `/login` error renderer
 * already handles — the user gets the same toasts they'd see via the
 * broker flow. No new copy needed.
 */

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface PendingSession {
  id_token: string;
  nonce: string;
}

interface FinalizeError {
  error: string;
}

/**
 * Best-effort extraction of the `email` claim from a Google ID token's
 * payload. We do NOT verify the signature — Supabase already verified it
 * a moment ago via signInWithIdToken (and rejected it with user_banned).
 * The email is read here for the sole purpose of looking up
 * `public.email_ban_status(email)` so we can pass the exact unban
 * timestamp through to /login. If decoding fails for any reason, we
 * fall through to a non-enriched redirect (LoginForm renders the
 * generic suspended toast instead of the exact-timestamp one).
 */
function extractEmailFromIdToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    // base64url → standard base64, with padding to multiple of 4.
    let p = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (p.length % 4) p += "=";
    const json = atob(p);
    const payload = JSON.parse(json) as { email?: unknown };
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

function FinalizeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;
    const next = params.get("next") ?? "/dashboard";
    const safeNext =
      next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

    (async () => {
      // Fetch the pending OAuth session from the bridge Function. It
      // reads the httpOnly cookies set by the callback, returns them
      // in JSON, and clears them in the response (one-shot).
      let pending: PendingSession | null = null;
      try {
        const resp = await fetch("/auth/google/finalize-data", {
          method: "GET",
          // credentials: "same-origin" is the default but explicit
          // here so that any future global fetch wrapper doesn't
          // silently drop the cookies.
          credentials: "same-origin",
          // Don't cache — each fetch should hit the Function so the
          // cookies are consumed exactly once.
          cache: "no-store",
        });
        if (cancelled) return;
        if (resp.status === 410) {
          // Cookies expired or already consumed — user landed here
          // without a fresh callback. Bounce to login.
          router.replace("/login/?error=missing_code");
          return;
        }
        if (!resp.ok) {
          router.replace("/login/?error=exchange_failed");
          return;
        }
        const json = (await resp.json()) as PendingSession | FinalizeError;
        if ("error" in json) {
          router.replace("/login/?error=exchange_failed");
          return;
        }
        pending = json;
      } catch {
        if (cancelled) return;
        router.replace("/login/?error=exchange_failed");
        return;
      }
      if (cancelled || !pending) return;

      // Hand the ID token to Supabase. signInWithIdToken verifies
      // signature against Google's JWKS, checks aud / iss / exp,
      // verifies the nonce we generated server-side, and mints a
      // Supabase session whose cookies @supabase/ssr persists.
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: pending.id_token,
        nonce: pending.nonce,
      });
      if (cancelled) return;

      if (error) {
        // Map provider-mixing collision to the existing toast that
        // tells the user "your account already exists, use magic
        // link instead". Same wide-net pattern the `/auth/callback`
        // page uses for the broker flow — kept verbatim so the error
        // language stays consistent across both auth paths.
        const lower = error.message.toLowerCase();
        let mapped = "exchange_failed";
        if (
          lower.includes("user already") ||
          lower.includes("identity already") ||
          lower.includes("identity_already_exists") ||
          lower.includes("error creating identity") ||
          lower.includes("database error saving") ||
          lower.includes("database error linking") ||
          lower.includes("provider_mixing") ||
          lower.includes("23505") ||
          lower.includes("duplicate key") ||
          lower.includes("unique constraint")
        ) {
          mapped = "account_exists_use_magic_link";
        } else if (
          // Ban detection — kept in sync with /auth/callback's matcher
          // and exchangeErrorToCallbackCode in lib/auth-errors.ts. A
          // banned user completing Continue-with-Google must see the
          // "suspended" toast, not the generic exchange-failed one.
          (error as { code?: string }).code === "user_banned" ||
          lower.includes("user is banned") ||
          lower.includes("user_banned") ||
          lower.includes("user banned") ||
          lower.includes("account suspended") ||
          lower.includes("account_suspended") ||
          lower.includes("suspended")
        ) {
          mapped = "account_suspended";
        }

        // For account_suspended, enrich the redirect with the exact
        // unban timestamp so /login renders the dynamic
        // auth.errUserBannedFor toast ("until 17 May 2026 05:24
        // (+0200)") instead of the generic auth.errUserBanned copy.
        // Best-effort: decode the ID token to extract email, then
        // call public.email_ban_status(email) to read banned_until
        // from auth.users directly. If anything fails (decode error,
        // RPC error, banned_until missing), we fall back to the
        // un-enriched redirect — the user still sees the suspended
        // toast, just without the exact time.
        let untilParam = "";
        if (mapped === "account_suspended" && pending) {
          const email = extractEmailFromIdToken(pending.id_token);
          if (email) {
            const supabase2 = createClient();
            const { data: banData, error: banErr } = await supabase2.rpc(
              "email_ban_status",
              { check_email: email },
            );
            if (!banErr) {
              const row = (banData as
                | { is_banned: boolean; banned_until: string | null }[]
                | null)?.[0];
              if (row?.banned_until) {
                untilParam = `&until=${encodeURIComponent(row.banned_until)}`;
              }
            }
          }
        }

        router.replace(`/login/?error=${mapped}${untilParam}`);
        return;
      }

      setMessage("Signed in. Redirecting…");
      router.replace(safeNext);
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

export default function FinalizePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-muted">
          Loading…
        </div>
      }
    >
      <FinalizeInner />
    </Suspense>
  );
}
