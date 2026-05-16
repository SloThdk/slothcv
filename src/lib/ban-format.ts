/**
 * Format a banned-until ISO timestamp into a human-readable duration
 * phrase. Picks the largest meaningful unit so the toast reads cleanly:
 *
 *   < 1 h   → "for the next N minutes" / "i de næste N minutter"
 *   < 24 h  → "for the next N hours"   / "i de næste N timer"
 *   < 30 d  → "for the next N days"    / "i de næste N dage"
 *   >= 30 d → "until <localised date>" / "indtil <dato>"
 *
 * Returns an empty string when the timestamp is invalid or already in
 * the past (callers should treat empty as "not banned" / "fall back to
 * generic copy").
 *
 * Shared by:
 *   - `lib/auth-context.tsx` — the in-session kick toast (signed-in
 *     user just got banned, validate() picks up the change).
 *   - `app/login/LoginForm.tsx` — the pre-send toast (banned user
 *     tries to request a fresh magic link).
 *   - `app/signup/SignupForm.tsx` — same as LoginForm, defensive.
 *
 * Extracting this helper means a banned user sees the SAME duration
 * format whether they were just kicked from the dashboard or are
 * staring at /login retrying — important because inconsistency
 * across surfaces erodes trust in the ban being a real, enforced
 * thing.
 */
export function formatBanDuration(
  iso: string,
  lang: "en" | "da",
): string {
  const until = new Date(iso);
  if (Number.isNaN(until.getTime())) return "";
  const ms = until.getTime() - Date.now();
  if (ms <= 0) return "";
  const minutes = Math.round(ms / 60_000);
  const hours = Math.round(ms / 3_600_000);
  const days = Math.round(ms / 86_400_000);
  if (minutes < 60) {
    return lang === "da"
      ? `i de næste ${minutes} minutter`
      : `for the next ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  if (hours < 24) {
    return lang === "da"
      ? `i de næste ${hours} timer`
      : `for the next ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  if (days < 30) {
    return lang === "da"
      ? `i de næste ${days} dage`
      : `for the next ${days} day${days === 1 ? "" : "s"}`;
  }
  const dateStr = until.toLocaleDateString(lang === "da" ? "da-DK" : undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return lang === "da" ? `indtil ${dateStr}` : `until ${dateStr}`;
}
