/**
 * Format a `banned_until` ISO timestamp into the exact unban date+time
 * the user will see in their inbox notification or admin view — matching
 * the Supabase Studio "This user will not be able to log in until: …"
 * format Philip specified 2026-05-16:
 *
 *   "17 May 2026 05:24 (+0200)"
 *    └──────────────┘ └───┘ └─────┘
 *      DD MMM YYYY    HH:MM  TZ offset of the user's local clock
 *
 * Earlier helper returned a relative phrase ("for the next 47 minutes")
 * which is friendly but ambiguous — the user can't verify it against
 * a clock or screenshot it as proof of duration. The exact timestamp
 * is unambiguous, locale-aware on the month name, and shows the
 * offset so the user always knows which clock the timestamp refers to.
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

  // Timezone offset in (+HHMM) form. Date.getTimezoneOffset() returns
  // minutes WEST of UTC (so +120 for Copenhagen during DST means UTC-2,
  // which we then NEGATE to get the conventional "+0200" presentation).
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const tzHH = String(Math.floor(abs / 60)).padStart(2, "0");
  const tzMM = String(abs % 60).padStart(2, "0");

  return `${day} ${month} ${year} ${hours}:${minutes} (${sign}${tzHH}${tzMM})`;
}
