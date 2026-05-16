/**
 * Format a `banned_until` ISO timestamp into the exact unban date+time.
 *
 *   "17 May 2026 05:24"
 *    └──────────────┘ └───┘
 *      DD MMM YYYY    HH:MM in the viewer's local clock
 *
 * Earlier helper returned a relative phrase ("for the next 47 minutes")
 * which is friendly but ambiguous — the user can't verify it against
 * a clock or screenshot it as proof of duration. Exact timestamp is
 * unambiguous and locale-aware on the month name. The browser renders
 * in the viewer's local timezone via `Date` getters, so a Copenhagen
 * user sees 05:24 CEST and a Berlin user sees the same wall-clock time —
 * no explicit offset suffix is shown because it added clutter without
 * adding information the user could act on.
 *
 * Returns null when the timestamp is invalid or already in the past
 * (callers fall back to generic "suspended" copy in that case).
 *
 * Shared by:
 *   - `lib/auth-context.tsx` — in-session kick toast.
 *   - `app/login/LoginForm.tsx` — pre-send ban toast + URL-param toast
 *     when /auth/google/finalize bounces with `?until=…`.
 *   - `app/signup/SignupForm.tsx` — pre-send ban toast.
 *
 * All surfaces phrase the unban time identically because they read
 * from the same helper — important so a user kicked from the dashboard
 * sees the same time on /login when they retry. Drift erodes trust.
 */
export function formatBanUntilExact(
  iso: string,
  lang: "en" | "da",
): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getTime() <= Date.now()) return null;

  const day = String(d.getDate()).padStart(2, "0");
  // Short month name in the user's display language. `replace(/\./g, "")`
  // strips the trailing dot some Danish locales add ("maj." → "maj").
  const month = new Intl.DateTimeFormat(
    lang === "da" ? "da-DK" : "en-GB",
    { month: "short" },
  )
    .format(d)
    .replace(/\./g, "");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${day} ${month} ${year} ${hours}:${minutes}`;
}
