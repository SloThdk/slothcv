/**
 * Captcha (Turnstile) helpers shared by LoginForm + SignupForm.
 *
 * The widget caches a token after each successful challenge; if Supabase
 * rejects it (single-use already consumed elsewhere, expired right at the
 * 5-minute boundary, Cloudflare clock skew), we want to transparently
 * fetch a fresh one and retry — not bounce the user back to the form
 * with "I couldn't verify you're human".
 *
 * Pattern:
 *   1. Component owns a ref `captchaResolveRef`.
 *   2. Turnstile's onSuccess callback ALSO calls
 *      `captchaResolveRef.current?.(token)` so a pending waiter unblocks.
 *   3. On `captcha_failed`, the form calls `waitForFreshCaptchaToken(ref)`
 *      which sets the resolver and resolves on the NEXT onSuccess (or
 *      times out after 8s).
 */

import type { MutableRefObject } from "react";

/**
 * Wait for the Turnstile widget to issue its next fresh token and return
 * it. The widget's reset() must already have been called by the caller.
 * Resolves with the token, or `null` if no token arrives within
 * `timeoutMs` (default 8s — managed-mode tokens usually arrive in 1-2s,
 * but interactive challenges can take longer).
 */
export function waitForFreshCaptchaToken(
  resolverRef: MutableRefObject<((token: string) => void) | null>,
  timeoutMs = 8000,
): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: string | null) => {
      if (settled) return;
      settled = true;
      // Only clear the ref if it's still pointing at our resolver — a
      // later attempt may have overwritten it.
      if (resolverRef.current === resolver) {
        resolverRef.current = null;
      }
      clearTimeout(timer);
      resolve(value);
    };
    const resolver = (token: string) => settle(token);
    const timer = setTimeout(() => settle(null), timeoutMs);
    resolverRef.current = resolver;
  });
}
