"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Handles Supabase auth tokens that come back in the URL HASH (implicit flow).
 *
 * SlothCV's e-mail links (`{{ .ConfirmationURL }}` → GoTrue's `/auth/v1/verify`)
 * redirect back with the session in the FRAGMENT, e.g.
 * `https://slothcv.pages.dev/#access_token=…&refresh_token=…&type=signup`.
 *
 * The server can NEVER read a `#fragment` (browsers don't send it), so the
 * `/auth/callback` route can't see it — the tokens just land on whatever page
 * GoTrue dropped the user (usually the homepage). With `detectSessionInUrl`
 * turned OFF in the browser client (lib/supabase/client.ts), THIS component is
 * the single, deterministic place that reads the fragment and routes:
 *
 *   • type=signup (e-mail CONFIRMATION) → the account is ALREADY confirmed at
 *     GoTrue's /verify step before this redirect, so we deliberately do NOT
 *     open a session (no flaky auto-login) → hard-nav to
 *     /login?notice=email_confirmed, where a toast + green banner say
 *     "Din konto er bekræftet — log ind", then they sign in.
 *
 *   • type=recovery (password RESET) → this one NEEDS a live session so
 *     /reset-password can call updateUser, so we setSession() from the fragment
 *     tokens and forward to /reset-password.
 *
 * Both use a FULL document load (window.location.assign), not a soft router
 * push: the /login notice banner + the auth state only re-evaluate on a fresh
 * mount, and /reset-password must read the session we just wrote.
 *
 * See rules/auth-link-tokens-in-url-hash.md + rules/pkce-email-confirm-cross-browser.md.
 * Mounted once in the root layout.
 */
export function AuthHashHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) return;
    const params = new URLSearchParams(raw);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    // No access_token → not an implicit-flow session hash (could be a plain
    // anchor, or an #error= which the callback/login handle). Do nothing.
    if (!accessToken) return;

    const type = params.get("type");

    // Scrub the fragment immediately so tokens don't linger in the address bar,
    // history, or a copy-paste, and a refresh can't reprocess them.
    const clean = window.location.pathname + window.location.search;
    window.history.replaceState(null, "", clean);

    if (type === "recovery") {
      // Password reset needs the session LIVE so /reset-password can call
      // updateUser. Set it from the fragment tokens, then hard-load the form.
      const supabase = createClient();
      if (!refreshToken) {
        window.location.assign("/forgot-password?error=link_expired");
        return;
      }
      void supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          window.location.assign(
            error ? "/forgot-password?error=link_expired" : "/reset-password",
          );
        })
        .catch(() => {
          // A network-level reject (not a returned {error}) must not strand the
          // user on the scrubbed page — send them to request a fresh link.
          window.location.assign("/forgot-password?error=link_expired");
        });
      return;
    }

    // type=signup (or any non-recovery confirmation): the e-mail is ALREADY
    // confirmed server-side at GoTrue's /verify before this redirect. We do NOT
    // consume the tokens (no auto-login) — the user goes to /login with the
    // "konto bekræftet" notice and signs in. The account is fully active.
    window.location.assign("/login?notice=email_confirmed");
  }, []);

  return null;
}
