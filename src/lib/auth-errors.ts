/**
 * Auth error classification + callback-error → translation-key mapping.
 *
 * Two distinct concerns live here:
 *
 *   1. authErrorTranslationKey(error) — Maps a Supabase AuthError directly
 *      to the translation key the UI should render. Reads the structured
 *      `error.code` field first (stable contract since auth-js v2; see
 *      node_modules/@supabase/auth-js/dist/main/lib/error-codes.d.ts for
 *      the canonical union). Falls back to substring matching ONLY if the
 *      code field is absent (very old SDK or non-API error). This means
 *      we render the *real* reason (e.g. "we sent too many emails to this
 *      address" vs "you sent too many requests"), not a generic stock
 *      message that happens to share keywords.
 *
 *   2. callbackErrorTranslationKey(code) — Maps the curated short codes
 *      that /auth/callback bounces with (link_expired, link_used, etc.)
 *      to the translation key the page should render. Centralized so a
 *      new error code added on the callback side propagates to every
 *      consumer (LoginForm, SignupForm, future pages) without drift.
 *
 * Anything that isn't recognized falls back to a generic translation key.
 * We never expose a raw error code or backend string to the user.
 */

import type { AuthError } from "@supabase/supabase-js";
import type { TranslationKey } from "@/lib/i18n/translations";

/**
 * Coarse bucket exposed for callers that need to branch on intent (e.g.
 * SignupForm probe → "is this email new?" check). Only callers that
 * actually need to switch behavior should use this; for rendering the
 * error to the user, use authErrorTranslationKey instead.
 */
export type AuthErrorKind =
  | "user_not_found" // email not on file (used by signup probe to detect new vs existing)
  | "rate_limit"
  | "invalid_email"
  | "captcha_failed" // Turnstile / hCaptcha rejected
  | "other";

/**
 * Branch-on-intent classifier. Reads `error.code` first; falls back to
 * substring matching for messages without a code (older SDK or non-API
 * errors thrown locally before a response).
 */
export function classifyAuthError(
  errorOrMessage: AuthError | string,
): AuthErrorKind {
  const code = typeof errorOrMessage === "string" ? undefined : errorOrMessage.code;
  const message = (typeof errorOrMessage === "string" ? errorOrMessage : errorOrMessage.message ?? "").toLowerCase();

  // Prefer the structured code when present — it's a stable API contract.
  if (code) {
    if (code === "user_not_found" || code === "signup_disabled" || code === "otp_disabled") {
      return "user_not_found";
    }
    if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || code === "over_sms_send_rate_limit") {
      return "rate_limit";
    }
    if (code === "email_address_invalid" || code === "validation_failed") {
      return "invalid_email";
    }
    if (code === "captcha_failed") {
      return "captcha_failed";
    }
    return "other";
  }

  // Substring fallback for errors without a code (rare). Tightened to
  // avoid false positives on "endpoint not found" / "resource not found".
  if (
    message.includes("signups not allowed") ||
    message.includes("signup is disabled") ||
    message.includes("user not found")
  ) {
    return "user_not_found";
  }
  if (
    message.includes("rate limit") ||
    message.includes("too many") ||
    message.includes("rate-limit")
  ) {
    return "rate_limit";
  }
  if (message.includes("invalid") && message.includes("email")) {
    return "invalid_email";
  }
  if (message.includes("captcha")) {
    return "captcha_failed";
  }
  return "other";
}

/**
 * Map a Supabase AuthError directly to the translation key that should
 * render. This is the "render-this-reason" path — granular, code-driven,
 * never falls back to a generic stock message when a more specific one
 * exists.
 *
 * Code coverage matrix (see error-codes.d.ts for the full union):
 *
 *   Code                              → Key                              Real-world cause
 *   ─────────────────────────────────────────────────────────────────────────────
 *   over_email_send_rate_limit        → errOverEmailRateLimit            same address spammed
 *   over_request_rate_limit           → errOverRequestRateLimit          IP / general spam
 *   email_address_invalid             → errInvalidEmail                  RFC-invalid format
 *   validation_failed                 → errValidationFailed              missing/bad field
 *   email_address_not_authorized      → errEmailNotAuthorized            allowlist block
 *   email_provider_disabled           → errEmailProviderDisabled         email auth off in dashboard
 *   captcha_failed                    → errCaptchaFailed                 Turnstile rejected
 *   user_not_found / signup_disabled  → errNoAccount                     /login strict mode
 *   email_exists / user_already_exists → errAccountExists                /signup conflict
 *   identity_already_exists           → errAccountExistsOtherMethod      OAuth↔magic-link clash
 *   user_banned                       → errUserBanned                    moderation action
 *   email_not_confirmed               → errEmailNotConfirmed             magic link not yet clicked
 *   bad_code_verifier                 → errDifferentBrowser              PKCE mismatch
 *   otp_expired                       → errExpiredLink                   1h+ old link
 *   flow_state_expired                → errFlowExpired                   auth state stale
 *   flow_state_not_found              → errFlowMissing                   localStorage cleared
 *   refresh_token_not_found           → errSessionGone                   stale tab
 *   refresh_token_already_used        → errSessionGone                   replay
 *   provider_disabled                 → errProviderDisabled              specific OAuth disabled
 *   request_timeout                   → errNetworkTimeout                slow network
 *   unexpected_failure                → errUnexpected                    server bug
 *   bad_json / bad_jwt / bad_oauth_*  → errCorrupted                     bad data
 *   ANY OTHER known code              → errUnexpectedWithCode            "Something went wrong (CODE)"
 *   No code at all                    → errSendFailed (legacy generic)
 */
export function authErrorTranslationKey(
  error: AuthError | { message?: string; code?: string },
): TranslationKey {
  const code = (error as AuthError).code;
  const message = (error.message ?? "").toLowerCase();

  // Prefer code. If absent, fall back to a tiny substring map below.
  if (code) {
    switch (code) {
      // ── Rate limits ─────────────────────────────────────────────
      case "over_email_send_rate_limit":
        return "auth.errOverEmailRateLimit";
      case "over_request_rate_limit":
        return "auth.errOverRequestRateLimit";
      case "over_sms_send_rate_limit":
        return "auth.errOverRequestRateLimit"; // we don't use SMS, fold in

      // ── Email / input validation ────────────────────────────────
      case "email_address_invalid":
        return "auth.errInvalidEmail";
      case "validation_failed":
        return "auth.errValidationFailed";
      case "email_address_not_authorized":
        return "auth.errEmailNotAuthorized";

      // ── Account state ───────────────────────────────────────────
      case "user_not_found":
      case "signup_disabled":
      case "otp_disabled":
        return "login.errNoAccount";
      case "email_exists":
      case "user_already_exists":
        return "signup.errAccountExists";
      case "identity_already_exists":
        return "login.errAccountExistsOtherMethod";
      case "user_banned":
        return "auth.errUserBanned";
      case "email_not_confirmed":
        return "auth.errEmailNotConfirmed";

      // ── Magic-link / OAuth flow ─────────────────────────────────
      case "otp_expired":
        return "login.errExpiredLink";
      case "bad_code_verifier":
        return "login.errDifferentBrowser";
      case "flow_state_expired":
        return "auth.errFlowExpired";
      case "flow_state_not_found":
        return "auth.errFlowMissing";
      case "bad_oauth_state":
      case "bad_oauth_callback":
        return "auth.errOAuthCorrupted";

      // ── Session ─────────────────────────────────────────────────
      case "session_not_found":
      case "session_expired":
      case "refresh_token_not_found":
      case "refresh_token_already_used":
        return "auth.errSessionGone";

      // ── Captcha / Turnstile ─────────────────────────────────────
      case "captcha_failed":
        return "auth.errCaptchaFailed";

      // ── Provider / config ───────────────────────────────────────
      case "email_provider_disabled":
        return "auth.errEmailProviderDisabled";
      case "provider_disabled":
        return "auth.errProviderDisabled";
      case "oauth_provider_not_supported":
        return "auth.errProviderDisabled";

      // ── Server / generic ────────────────────────────────────────
      case "request_timeout":
        return "auth.errNetworkTimeout";
      case "unexpected_failure":
        return "auth.errUnexpected";

      // ── Anything else with a code we don't have specific copy for
      // shows the generic "something went wrong" message. We do NOT
      // expose the raw code to the user — it would just be jargon.
      default:
        return "auth.errUnexpected";
    }
  }

  // No structured code present — fall back to a tiny substring map for
  // the most common cases. If even substring match fails, generic copy.
  if (message.includes("rate limit") || message.includes("too many")) {
    return "auth.errOverRequestRateLimit";
  }
  if (message.includes("invalid") && message.includes("email")) {
    return "auth.errInvalidEmail";
  }
  if (message.includes("captcha")) {
    return "auth.errCaptchaFailed";
  }
  if (message.includes("network") || message.includes("timeout") || message.includes("fetch")) {
    return "auth.errNetworkTimeout";
  }
  return "login.errSendFailed";
}

/**
 * Map a Supabase AuthError (from exchangeCodeForSession) to the curated
 * SHORT CODE that /auth/callback appends to /login?error=. Reads
 * error.code first (stable enum); falls back to substring matching only
 * when code is absent. The short codes are LoginForm's render keys, so
 * adding a new case here propagates to the user-facing toast for free.
 */
export function exchangeErrorToCallbackCode(error: AuthError | { message?: string; code?: string }): string {
  const code = (error as AuthError).code;
  const m = (error.message ?? "").toLowerCase();

  if (code) {
    switch (code) {
      case "bad_code_verifier":
        // PKCE verifier didn't match — different browser/tab.
        return "different_browser";
      case "otp_expired":
      case "flow_state_expired":
      case "session_expired":
        return "link_expired";
      case "refresh_token_already_used":
        return "link_used";
      case "flow_state_not_found":
        return "different_browser";
      default:
        return "exchange_failed";
    }
  }

  // Substring fallback — tightened to avoid over-matching. The old code
  // matched bare "invalid" → link_used which caught invalid_credentials,
  // validation_failed, etc. Now we require the more specific phrasings.
  if (m.includes("code verifier") || m.includes("pkce") || m.includes("verifier")) {
    return "different_browser";
  }
  if (m.includes("expired")) {
    return "link_expired";
  }
  if (m.includes("already") && (m.includes("used") || m.includes("redeem"))) {
    return "link_used";
  }
  return "exchange_failed";
}

/**
 * Map a curated callback error code (the short string /auth/callback
 * appends to /login?error=) to the translation key that should render.
 * Centralized so SignupForm + LoginForm share a single mapping and a
 * new error code only needs to be wired here once.
 *
 * Returns null when the code is unrecognized — caller should fall back
 * to the generic "something went wrong" copy rather than rendering the
 * raw code to the user.
 */
export function callbackErrorTranslationKey(
  code: string,
): TranslationKey | null {
  switch (code) {
    case "exchange_failed":
      return "login.errExchangeGeneric";
    case "link_expired":
      return "login.errExpiredLink";
    case "link_used":
      return "login.errLinkUsed";
    case "different_browser":
      return "login.errDifferentBrowser";
    case "missing_code":
      return "login.errInterrupted";
    case "account_exists_other_method":
      return "login.errAccountExistsOtherMethod";
    case "oauth_declined":
      return "login.errOAuthDeclined";
    default:
      return null;
  }
}
