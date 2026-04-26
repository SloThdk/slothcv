/**
 * ThemeToggle — sun/moon icon button. Toggles between light and dark.
 * Uses the icon of the OPPOSITE theme as the button face (clicking shows
 * what you'll get) — same pattern as Linear / GitHub / Vercel.
 */

"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  const { t } = useLanguage();
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("theme.toggleAria")}
      title={resolved === "dark" ? t("theme.light") : t("theme.dark")}
      className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-fg transition-all duration-150 hover:-translate-y-px hover:bg-surface-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2"
    >
      {/* Show the icon of the NEXT theme so the button reads as
          "switch to <X>" — the standard sun/moon UX. */}
      {next === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </button>
  );
}
