/**
 * TranslatableError — error class that carries a translation key (and
 * optional `{name}`-style interpolation params) instead of a hardcoded
 * English string. UI catch blocks call `translateError(e, t, fallback)`
 * to resolve the right copy in the user's current language.
 *
 * Why this exists:
 *   Library helpers in `lib/profile.ts` and `lib/resumes.ts` historically
 *   threw `new Error("Photo must be an image file.")` and similar. Those
 *   strings bubbled up to `toast.error(e.message)` and showed in English
 *   even when the rest of the UI was Danish. Routing the message through
 *   the translation table fixes that without forcing every catch to know
 *   the specific error type — the helper handles both branches.
 */

import type { TranslationKey } from "./i18n/translations";

type TFn = (
  key: TranslationKey,
  args?: Record<string, string | number>,
) => string;

export class TranslatableError extends Error {
  /** The translation key used to render the message in the user's language. */
  public readonly key: TranslationKey;
  /** Optional interpolation params (e.g. `{ n: 5 }` for the CV limit). */
  public readonly params?: Record<string, string | number>;

  constructor(
    key: TranslationKey,
    params?: Record<string, string | number>,
  ) {
    // Store the key as the message too so `e.message` still carries
    // *something* useful when read outside the i18n pipeline (e.g. logs).
    super(key);
    this.name = "TranslatableError";
    this.key = key;
    this.params = params;
  }
}

/**
 * Resolve an unknown caught value to a user-facing string.
 *
 *   - If it's a TranslatableError, look up the key + interpolate params.
 *   - If it's a plain Error with a non-empty message, fall through to
 *     `e.message` (server-bound errors typically already carry text the
 *     UI shouldn't replace, e.g. captcha codes the form maps elsewhere).
 *   - Otherwise return the fallback translation key.
 */
export function translateError(
  e: unknown,
  t: TFn,
  fallbackKey: TranslationKey,
): string {
  if (e instanceof TranslatableError) {
    return t(e.key, e.params);
  }
  if (e instanceof Error && e.message) {
    return e.message;
  }
  return t(fallbackKey);
}
