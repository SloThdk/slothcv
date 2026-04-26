/**
 * Avatar — circular profile-picture component with initials fallback.
 *
 * Used in the header user menu, the account page, and (eventually) anywhere
 * else we surface "this is you". Keeps the visual language consistent and
 * means we change the fallback behavior in one place.
 *
 * Sizes are predefined chips so we don't drift into ad-hoc widths everywhere.
 * Accent color is derived from the display name so two users with different
 * names get visibly different fallback bubbles.
 */

"use client";

import { initialsFor } from "@/lib/profile";

interface AvatarProps {
  /** The publicly accessible avatar URL, or null/undefined for the fallback. */
  src?: string | null;
  /** Source for the initials fallback. */
  name?: string | null;
  /** Size in px (square). Defaults to 40. */
  size?: number;
  /** Optional className applied to the outer element. */
  className?: string;
  /** Render the alt attribute on the <img>. Defaults to display name. */
  alt?: string;
}

const PALETTE: ReadonlyArray<readonly [string, string]> = [
  ["#fee2e2", "#7f1d1d"], // red
  ["#ffedd5", "#7c2d12"], // orange
  ["#fef9c3", "#713f12"], // yellow
  ["#dcfce7", "#14532d"], // green
  ["#cffafe", "#155e75"], // cyan
  ["#dbeafe", "#1e3a8a"], // blue
  ["#ede9fe", "#4c1d95"], // violet
  ["#fce7f3", "#831843"], // pink
] as const;

/** Pick a stable palette index from a name so the same user always gets the
 *  same bubble color. djb2-ish hash, fits in a single line. */
function paletteFor(
  name: string | null | undefined,
): readonly [string, string] {
  const s = (name ?? "?").trim() || "?";
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length]!;
}

export function Avatar({
  src,
  name,
  size = 40,
  className = "",
  alt,
}: AvatarProps) {
  const [bg, fg] = paletteFor(name);
  const initials = initialsFor(name);
  const dim = `${size}px`;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-neutral-200 ${className}`}
      style={{ width: dim, height: dim, background: bg, color: fg }}
      aria-label={alt ?? name ?? "User"}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar URLs are
        // user-uploaded to a public Supabase Storage bucket; <Image> would force
        // us into a custom remotePatterns config and adds no value here.
        <img
          src={src}
          alt={alt ?? name ?? "User avatar"}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          className="select-none font-semibold"
          style={{ fontSize: Math.max(11, Math.round(size * 0.4)) }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
