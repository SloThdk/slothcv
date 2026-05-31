"use client";

/**
 * Password strength meter + criteria checklist.
 *
 * Shared by /signup and /reset-password so both new-password surfaces show
 * the same red → amber → emerald bar and the same rules.
 *
 * The HARD requirement (`passwordMeetsPolicy`) mirrors the Supabase Auth
 * password policy on the project (min length 10) plus one non-alphanumeric
 * character. `passwordMeetsPolicy()` is the SINGLE source of truth that both
 * the meter AND the submit-gate import, so a password the meter accepts can
 * never be rejected by the server — they share the same rule. Upper/lower
 * mix and a digit are scored as strength *boosters* (recommended, not
 * required), matching modern guidance that length matters most.
 *
 * Pure helpers (`passwordMeetsPolicy`, `PASSWORD_MIN_LENGTH`) are exported
 * from here so the forms can import them for the disabled-submit gate
 * without pulling in React state.
 */

import { useLanguage } from "@/lib/i18n/LanguageContext";

export const PASSWORD_MIN_LENGTH = 10;
const SPECIAL_CHAR_REGEX = /[^a-zA-Z0-9]/;

/** The hard requirement — must be true before signup/reset can submit. */
export function passwordMeetsPolicy(pw: string): boolean {
  return pw.length >= PASSWORD_MIN_LENGTH && SPECIAL_CHAR_REGEX.test(pw);
}

type Tier = 1 | 2 | 3;

// Tier colours track the existing form banners (emerald success / amber
// warning / red error) so the palette stays consistent in light + dark.
const TIER_META: Record<
  Tier,
  { fill: string; text: string; labelKey: "auth.pwTierWeak" | "auth.pwTierMedium" | "auth.pwTierStrong" }
> = {
  1: { fill: "bg-red-500", text: "text-red-600 dark:text-red-400", labelKey: "auth.pwTierWeak" },
  2: { fill: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", labelKey: "auth.pwTierMedium" },
  3: { fill: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", labelKey: "auth.pwTierStrong" },
};

export function PasswordStrength({ password }: { password: string }) {
  const { t } = useLanguage();

  // Don't render until the user starts typing — an empty bar reads as a
  // broken/disabled control.
  if (!password) return null;

  const len = password.length;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = SPECIAL_CHAR_REGEX.test(password);
  const meetsMin = passwordMeetsPolicy(password);
  const classes = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

  // tier 1 (red): fails the hard requirement → cannot submit.
  // tier 3 (emerald): meets it AND is genuinely strong (long, or varied).
  // tier 2 (amber): meets the minimum but is only middling.
  let tier: Tier;
  if (!meetsMin) tier = 1;
  else if (len >= 14 || (len >= 12 && classes >= 3) || classes === 4) tier = 3;
  else tier = 2;

  const meta = TIER_META[tier];

  return (
    <div aria-live="polite" className="-mt-1 flex flex-col gap-2">
      {/* 3-segment bar — fills + colours up to the current tier. */}
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
              i < tier ? meta.fill : "bg-[color:var(--color-border)]"
            }`}
          />
        ))}
      </div>

      <p className={`text-xs font-medium ${meta.text}`}>
        {t("auth.pwStrength")}: {t(meta.labelKey)}
      </p>

      <ul className="flex flex-col gap-1 text-xs text-[color:var(--color-text-subtle)]">
        <Criterion met={len >= PASSWORD_MIN_LENGTH}>
          {t("auth.pwCritLength", { n: PASSWORD_MIN_LENGTH })}
        </Criterion>
        <Criterion met={hasSpecial}>{t("auth.pwCritSpecial")}</Criterion>
        <Criterion met={hasUpper && hasLower}>{t("auth.pwCritCase")}</Criterion>
        <Criterion met={hasNumber}>{t("auth.pwCritNumber")}</Criterion>
      </ul>
    </div>
  );
}

function Criterion({
  met,
  children,
}: {
  met: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2">
      <span
        aria-hidden
        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] leading-none ${
          met
            ? "bg-emerald-500 text-white"
            : "border border-[color:var(--color-border)] bg-transparent text-transparent"
        }`}
      >
        ✓
      </span>
      <span className={met ? "text-[color:var(--color-text)]" : ""}>{children}</span>
    </li>
  );
}
