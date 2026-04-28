/**
 * Social-icon registry for the toolshelf "Social Icons" palette.
 *
 * Why inline SVG paths instead of an icon library:
 *
 *   1. **Brand fidelity.** lucide-react ships generic stroke-style
 *      glyphs for some networks (Linkedin / Instagram / Facebook /
 *      Twitter / GitHub / YouTube) but the brand-canonical shapes
 *      users actually recognise (and which respect each network's
 *      visual-identity guidelines for "logo on a CV") are SOLID-FILL
 *      icons in 24×24. lucide doesn't ship that style.
 *
 *   2. **Coverage.** lucide doesn't ship a Telegram, Discord, TikTok,
 *      Behance, or Dribbble glyph at all. The user explicitly asked
 *      for Telegram. Mixing lucide + react-icons + something else for
 *      the missing brands would produce inconsistent stroke-weight /
 *      visual size across the palette.
 *
 *   3. **Bundle size.** A handful of SVG path strings here is ~5 KB
 *      raw, ~2 KB gzipped. Adding `react-icons` (or `simple-icons`
 *      from npm) to pull in 2,000+ unused brand glyphs would cost
 *      multiples of that, mostly tree-shaken out but still loaded
 *      from disk during dev.
 *
 *   4. **Resolution + recolouring.** SVG paths render as vectors that
 *      stay crisp at any resize handle drag. Coloring is one
 *      `fill="..."` away — the inspector's color picker writes
 *      directly to `IconElement.color` and the renderer plugs that
 *      value into the SVG. Bitmap brand glyphs would re-tint badly.
 *
 * # Licensing
 *
 * Brand glyphs are sourced from Simple Icons (https://simpleicons.org)
 * which publishes their SVG paths under CC0 1.0 (public domain). The
 * brand TRADEMARK still belongs to each company — using the icons in a
 * personal CV to indicate "here is my LinkedIn" is fair use; we do
 * NOT apply Sloth Studio branding to the icons or imply endorsement.
 *
 * # Picking a default brand color
 *
 * Each entry ships with `defaultColor` set to the network's official
 * brand hex (e.g. LinkedIn #0A66C2, Instagram pink-orange gradient
 * approximated as #E4405F, etc.). The user can recolor through the
 * inspector — the brand color is only a starting point so the user
 * doesn't have to look it up.
 *
 * # Adding a new social icon
 *
 *   1. Pick a 24×24 single-path SVG from simpleicons.org.
 *   2. Add an entry to SOCIAL_ICONS below.
 *   3. Add the matching name to SocialIconName union.
 *   4. The toolshelf and the custom-elements-layer pick it up via the
 *      registry — no other files to touch.
 */

/** Identifier for a registered social-icon glyph. Must stay narrow so
 *  the Zod schema can validate `IconElement.iconName` against this
 *  exact set; an unknown identifier on a saved CV would render as a
 *  blank box otherwise. */
export type SocialIconName =
  | "linkedin"
  | "instagram"
  | "facebook"
  | "x"
  | "github"
  | "youtube"
  | "telegram"
  | "tiktok"
  | "discord"
  | "behance"
  | "dribbble"
  | "mail"
  | "globe";

/** Single registry entry: how a social icon is described visually + the
 *  human-readable label for the toolshelf card. */
export interface SocialIconDef {
  /** Stable identifier; persisted in CV data. */
  name: SocialIconName;
  /** Title-cased label shown in the shelf card and the inspector dropdown. */
  label: string;
  /** SVG `viewBox` attribute. All Simple-Icons glyphs are 24×24. */
  viewBox: string;
  /** SVG `<path d="…">` data. Single path so the inspector's color
   *  picker writes ONE fill value and the whole glyph recolours. */
  path: string;
  /** Brand-canonical color (hex). User can override via the inspector. */
  defaultColor: string;
}

/**
 * Registry. Order here is the order the cards render in the toolshelf
 * — most-used networks first (LinkedIn / Instagram / Facebook / X /
 * GitHub) so the eye lands on them, less-common ones (Behance /
 * Dribbble / Mail / Globe) last.
 *
 * Paths are taken verbatim from Simple Icons (CC0 1.0). Each path is a
 * single `M ... Z` so a single SVG `fill` recolours the entire glyph.
 */
export const SOCIAL_ICONS: SocialIconDef[] = [
  {
    name: "linkedin",
    label: "LinkedIn",
    viewBox: "0 0 24 24",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
    defaultColor: "#0A66C2",
  },
  {
    name: "instagram",
    label: "Instagram",
    viewBox: "0 0 24 24",
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
    defaultColor: "#E4405F",
  },
  {
    name: "facebook",
    label: "Facebook",
    viewBox: "0 0 24 24",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
    defaultColor: "#1877F2",
  },
  {
    name: "x",
    label: "X (Twitter)",
    viewBox: "0 0 24 24",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.731-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z",
    defaultColor: "#000000",
  },
  {
    name: "github",
    label: "GitHub",
    viewBox: "0 0 24 24",
    path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
    defaultColor: "#181717",
  },
  {
    name: "youtube",
    label: "YouTube",
    viewBox: "0 0 24 24",
    path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
    defaultColor: "#FF0000",
  },
  {
    name: "telegram",
    label: "Telegram",
    viewBox: "0 0 24 24",
    path: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
    defaultColor: "#26A5E4",
  },
  {
    name: "tiktok",
    label: "TikTok",
    viewBox: "0 0 24 24",
    path: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
    defaultColor: "#000000",
  },
  {
    name: "discord",
    label: "Discord",
    viewBox: "0 0 24 24",
    path: "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z",
    defaultColor: "#5865F2",
  },
  {
    name: "behance",
    label: "Behance",
    viewBox: "0 0 24 24",
    path: "M16.969 16.927a2.561 2.561 0 002.36-1.617h2.876a5.46 5.46 0 01-1.957 2.704 5.394 5.394 0 01-3.305 1.087c-.821 0-1.6-.15-2.336-.45a5.366 5.366 0 01-2.954-3.012 6.214 6.214 0 01-.418-2.341c0-.811.139-1.569.418-2.272a5.594 5.594 0 011.171-1.834 5.508 5.508 0 011.794-1.214 5.737 5.737 0 012.305-.45c.886 0 1.677.171 2.374.514a5.314 5.314 0 011.78 1.392c.486.582.842 1.255 1.071 2.018.226.764.299 1.562.214 2.394h-7.705c0 .832.288 1.567.737 2.014.45.45 1.099.667 1.949.667zM10.554 5.86h-2.95v3.336h2.971c.62-.005 1.18-.245 1.61-.67.232-.21.41-.487.5-.802a2.022 2.022 0 00.07-.901c-.064-.534-.288-.96-.738-1.27-.402-.28-.824-.41-1.46-.31zm-.16 6.394c.41-.001.785.067 1.13.21.366.144.683.394.93.71.21.31.353.674.43 1.06.072.376.092.762.092 1.165 0 .417-.06.81-.16 1.21-.092.39-.265.74-.514 1.05a2.42 2.42 0 01-.93.71 3.34 3.34 0 01-1.435.27H7.6v-6.385h2.794zM2.4 3h7.65c.7 0 1.36.06 1.95.18.6.12 1.1.34 1.5.65.5.31.86.74 1.13 1.27.27.53.4 1.19.4 1.95 0 .85-.19 1.53-.57 2.06-.39.53-.95.97-1.69 1.31 1 .29 1.74.79 2.23 1.51.49.72.74 1.59.74 2.62 0 .81-.16 1.51-.48 2.09-.32.59-.74 1.09-1.27 1.49-.53.4-1.13.7-1.81.89-.66.19-1.34.29-2.04.29H2.4V3zm15.45 4.41c-.617-.001-1.073.157-1.474.45-.402.293-.677.703-.804 1.213h4.65c-.07-.572-.28-1.001-.626-1.296-.346-.292-.823-.367-1.376-.367zM14.99 4.36h6.62v1.5h-6.62v-1.5z",
    defaultColor: "#1769FF",
  },
  {
    name: "dribbble",
    label: "Dribbble",
    viewBox: "0 0 24 24",
    path: "M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.814zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.285zm10.335 3.483c-.218.29-1.935 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z",
    defaultColor: "#EA4C89",
  },
  {
    name: "mail",
    label: "Email",
    viewBox: "0 0 24 24",
    // Outlined envelope — single closed path with the flap visible.
    // Not a brand glyph (no Simple Icons entry); a generic "send me
    // mail" affordance sized to match the brand-icon viewBox.
    path: "M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5L4 6h16zm0 12H4V8l8 5 8-5v10z",
    defaultColor: "#525252",
  },
  {
    name: "globe",
    label: "Website",
    viewBox: "0 0 24 24",
    // Generic "personal site" globe — same disclaimer as `mail`.
    path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41C15.93 5.59 18 8.55 18 12c0 1.99-.7 3.81-1.9 5.39z",
    defaultColor: "#525252",
  },
];

/** Quick lookup by name. */
export const SOCIAL_ICONS_BY_NAME: Record<SocialIconName, SocialIconDef> =
  Object.fromEntries(SOCIAL_ICONS.map((i) => [i.name, i])) as Record<
    SocialIconName,
    SocialIconDef
  >;

/** Returns true if the string is a known social-icon identifier. Used by
 *  the Zod schema to gate persisted `IconElement.iconName` values
 *  against the registry — an unknown identifier on a saved CV would
 *  render as a blank box otherwise. */
export function isSocialIconName(s: string): s is SocialIconName {
  return s in SOCIAL_ICONS_BY_NAME;
}
