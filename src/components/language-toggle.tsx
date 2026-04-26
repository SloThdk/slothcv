/**
 * LanguageToggle — compact two-button flag pill, identical visual language
 * to the philipsloth-portfolio toggle so users moving between sites see the
 * same control. Active flag has full opacity + accent ring; inactive flag
 * dims to 50% with a hover lift.
 */

"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

interface Props {
  /** Render a slightly slimmer version for mobile menus. */
  compact?: boolean;
}

export function LanguageToggle({ compact = false }: Props) {
  const { lang, setLang, t } = useLanguage();
  return (
    <div
      role="group"
      aria-label={t("lang.toggleAria")}
      className={`inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5 ${
        compact ? "" : "shadow-sm"
      }`}
    >
      <FlagButton
        active={lang === "en"}
        onClick={() => setLang("en")}
        title={t("lang.english")}
        src="/icons/flag-gb.svg"
      />
      <FlagButton
        active={lang === "da"}
        onClick={() => setLang("da")}
        title={t("lang.danish")}
        src="/icons/flag-dk.svg"
      />
    </div>
  );
}

function FlagButton({
  active,
  onClick,
  title,
  src,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  src: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={title}
      title={title}
      className={`grid h-7 w-9 place-items-center rounded-full transition-all duration-150 ${
        active
          ? "bg-[color:var(--color-text)]/10 ring-1 ring-[color:var(--color-text)]/30"
          : "opacity-50 hover:-translate-y-px hover:opacity-90"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG flag,
          no need to wire <Image> remotePatterns for static assets. */}
      <img
        src={src}
        alt=""
        width={20}
        height={14}
        className="h-3.5 w-5 rounded-sm object-cover"
      />
    </button>
  );
}
