/**
 * Font registry — every font that the slothcv design tab can pick from.
 *
 * All fonts here ship via `next/font/google`, which downloads the WOFF2
 * files at BUILD time and self-hosts them under `_next/static/media/`.
 * Zero runtime requests to Google, fully GDPR-friendly.
 *
 * Licensing: every font in this list is on Google Fonts under SIL OFL
 * 1.1, Apache 2.0, or Ubuntu Font License. All three permit commercial
 * use including embedding in a CV the user may sell or use commercially.
 * No attribution required when embedded in a final product (per OFL §2).
 *
 * IMPORTANT: Next.js requires each font loader call to be its own
 * top-level const (it static-analyses the file at build time to
 * download the WOFF2 files). We can't bury the calls inside an object
 * literal or a helper — each `Inter(...)`, `Manrope(...)`, etc. must
 * stand alone at module scope. The exported `FONT_REGISTRY` then
 * AGGREGATES the resulting objects.
 *
 * ── Preload strategy ────────────────────────────────────────────────
 * Default behaviour is `preload: true` — Next.js drops a `<link
 * rel="preload">` for every font in the registry, which means EVERY
 * page (landing, dashboard, editor) ships preload tags + downloads
 * 30 fonts × ~30-50KB on first paint. That's 600KB-1.5MB of fonts
 * blocking LCP for users who only render two of them.
 *
 * The audit (grep `--font-` across `src/templates/*.tsx`):
 *   - Inter            17 templates  (HEAVY: body in nearly every layout)
 *   - EB Garamond       6 templates  (heavy: humanities / academic / exec)
 *   - Source Serif 4    5 templates
 *   - Lora              5 templates
 *   - JetBrains Mono    5 templates  (date / metric column in modern designs)
 *   - Fraunces          5 templates  (display name / italic editorial)
 *   - Onest             3 templates
 *   - Outfit / Manrope  2 templates each
 *   - Public Sans / Playfair Display / Geist / Geist Mono / Albert Sans  1 each
 *   - 14 other fonts    0 templates (font-picker only — user-customisable)
 *
 * We `preload: true` only the top six. The remaining ~24 fonts still
 * load via `<link rel="stylesheet">` when the user picks them in the
 * design tab — `display: swap` ensures no FOIT, just a sub-second
 * fallback while the WOFF2 streams.
 */

import {
  Inter,
  Manrope,
  DM_Sans,
  Plus_Jakarta_Sans,
  Outfit,
  Space_Grotesk,
  Sora,
  Lexend,
  Onest,
  Albert_Sans,
  Public_Sans,
  Figtree,
  Geist,
  Be_Vietnam_Pro,
  Lora,
  Source_Serif_4,
  Cormorant,
  Crimson_Pro,
  EB_Garamond,
  Merriweather,
  Playfair_Display,
  Fraunces,
  Bricolage_Grotesque,
  Unbounded,
  JetBrains_Mono,
  Fira_Code,
  Geist_Mono,
  Work_Sans,
  Karla,
  Mulish,
} from "next/font/google";

// ─────────────────────────────────────────────────────────────────────
// PRELOADED FONTS — referenced by 5+ templates' default styling.
// These ship `<link rel="preload">` tags so the WOFF2 starts streaming
// in parallel with the HTML, which is critical for LCP on landing /
// dashboard / editor (any page that mounts the renderer).
// ─────────────────────────────────────────────────────────────────────
// Inter is the ONLY font preloaded site-wide. globals.css wires it
// into `--font-sans` which the layout's body inherits, so every
// public page (landing, dashboard skeleton, editor shell chrome)
// uses Inter for body / UI text — preloading it shaves the LCP font
// swap entirely. Every other font in this file used to ship with
// `preload: true`, which made Next.js emit a <link rel="preload">
// for each of them in EVERY page's <head>. The PageSpeed audit on
// 2026-05-15 showed twelve woff2 files all blocking the critical
// path on the landing page for ~1.8 s each — LCP 10.9 s. None of
// those fonts is actually used on the landing page (Lora,
// EB_Garamond, Fraunces, etc. are template-only — they render
// inside the editor's live A4 preview once the user picks one).
// Setting them to preload:false drops them off the critical path
// while keeping them available: next/font still self-hosts the
// WOFF2 and CSS still references them; the browser fetches the
// file the first time a template mounts a `var(--font-lora)`
// element, with `display: swap` masking the load behind the
// fallback so there is no FOIT.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});
const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
  preload: false,
});
const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif-4",
  display: "swap",
  preload: false,
});
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-eb-garamond",
  display: "swap",
  preload: false,
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  preload: false,
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

// ─────────────────────────────────────────────────────────────────────
// LAZY-LOADED FONTS — available in the design-tab font picker but not
// preloaded. Browsers will request the WOFF2 only when CSS first asks
// for it (i.e. when the user picks the font, OR when a template that
// references it via `var(--font-*)` is mounted).
//
// These still work fully — `--font-*` CSS variables are defined on
// <html> via `ALL_FONT_VARIABLE_CLASSES`, so any descendant style can
// reference them. The only thing we drop is the synchronous preload.
// ─────────────────────────────────────────────────────────────────────

// ---- Modern sans (variable-axis fonts where available) ----
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  preload: false,
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  preload: false,
});
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
  preload: false,
});
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  preload: false,
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  preload: false,
});
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  preload: false,
});
const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "swap",
  preload: false,
});
const onest = Onest({
  subsets: ["latin"],
  variable: "--font-onest",
  display: "swap",
  preload: false,
});
const albertSans = Albert_Sans({
  subsets: ["latin"],
  variable: "--font-albert-sans",
  display: "swap",
  preload: false,
});
const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
  preload: false,
});
const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
  preload: false,
});
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
  preload: false,
});
// Be Vietnam Pro is multi-weight static (not variable) — request three
// core weights only so the WOFF2 payload stays reasonable.
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
  preload: false,
});

// ---- Classic serif (non-preloaded) ----
const cormorant = Cormorant({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
  preload: false,
});
const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  variable: "--font-crimson-pro",
  display: "swap",
  preload: false,
});
const merriweather = Merriweather({
  subsets: ["latin"],
  variable: "--font-merriweather",
  display: "swap",
  preload: false,
});

// ---- Display ----
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
  display: "swap",
  preload: false,
});
const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage-grotesque",
  display: "swap",
  preload: false,
});
const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-unbounded",
  display: "swap",
  preload: false,
});

// ---- Monospace ----
const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
  preload: false,
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
});

// ---- Humanist ----
const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  display: "swap",
  preload: false,
});
const karla = Karla({
  subsets: ["latin"],
  variable: "--font-karla",
  display: "swap",
  preload: false,
});
const mulish = Mulish({
  subsets: ["latin"],
  variable: "--font-mulish",
  display: "swap",
  preload: false,
});

/** Map of display name → next/font config object. The `.variable`
 *  property is the className we attach to <html> so `var(--font-…)`
 *  resolves anywhere in the tree. */
export const FONT_REGISTRY = {
  Inter: inter,
  Manrope: manrope,
  "DM Sans": dmSans,
  "Plus Jakarta Sans": plusJakartaSans,
  Outfit: outfit,
  "Space Grotesk": spaceGrotesk,
  Sora: sora,
  Lexend: lexend,
  Onest: onest,
  "Albert Sans": albertSans,
  "Public Sans": publicSans,
  Figtree: figtree,
  Geist: geist,
  "Be Vietnam Pro": beVietnamPro,
  Lora: lora,
  "Source Serif 4": sourceSerif4,
  Cormorant: cormorant,
  "Crimson Pro": crimsonPro,
  "EB Garamond": ebGaramond,
  Merriweather: merriweather,
  "Playfair Display": playfairDisplay,
  Fraunces: fraunces,
  "Bricolage Grotesque": bricolageGrotesque,
  Unbounded: unbounded,
  "JetBrains Mono": jetbrainsMono,
  "Fira Code": firaCode,
  "Geist Mono": geistMono,
  "Work Sans": workSans,
  Karla: karla,
  Mulish: mulish,
} as const;

/** Logical groups for the design tab font picker. */
export const FONT_GROUPS: { label: string; fonts: string[] }[] = [
  {
    label: "Modern sans",
    fonts: [
      "Inter",
      "Geist",
      "Manrope",
      "DM Sans",
      "Plus Jakarta Sans",
      "Outfit",
      "Space Grotesk",
      "Sora",
      "Lexend",
      "Onest",
      "Albert Sans",
      "Public Sans",
      "Figtree",
      "Be Vietnam Pro",
    ],
  },
  {
    label: "Classic serif",
    fonts: [
      "Lora",
      "Source Serif 4",
      "Cormorant",
      "Crimson Pro",
      "EB Garamond",
      "Merriweather",
    ],
  },
  {
    label: "Display",
    fonts: [
      "Playfair Display",
      "Fraunces",
      "Bricolage Grotesque",
      "Unbounded",
    ],
  },
  {
    label: "Monospace",
    fonts: ["JetBrains Mono", "Fira Code", "Geist Mono"],
  },
  {
    label: "Humanist",
    fonts: ["Work Sans", "Karla", "Mulish"],
  },
];

/** Flat list of all font names. */
export const FONT_NAMES: string[] = FONT_GROUPS.flatMap((g) => g.fonts);

/** Combined `className` of every font's `.variable` — apply this to
 *  <html> so any descendant can reference `var(--font-…)`. */
export const ALL_FONT_VARIABLE_CLASSES = Object.values(FONT_REGISTRY)
  .map((f) => f.variable)
  .join(" ");

/** Just the Inter variable className. Applied on the root layout
 *  alone so the landing page's CSS doesn't trigger the 30-font
 *  @font-face cascade. Template-only fonts (Lora, EB_Garamond,
 *  Fraunces, every other entry in FONT_REGISTRY) are gated to
 *  `/editor` + `/new` + `/dashboard` via their respective segment
 *  layouts — anywhere the user is actively editing a CV. Landing
 *  page TemplatePreview cards render in Inter because `--font-…`
 *  vars aren't defined in their scope, which the CSS chain
 *  resolves by falling back to `--font-sans` (inherited Inter).
 *  Result: landing's critical path drops from 8 woff2 files at
 *  ~1.7 s each to 1, while editor/new/dashboard still mount with
 *  the full font palette the user picks from. */
export const LANDING_FONT_VARIABLE_CLASSES = FONT_REGISTRY.Inter.variable;

/** Every font EXCEPT Inter — applied at the segment-layout level on
 *  routes that need the template palette (`/editor`, `/new`,
 *  `/dashboard`). Inter already lives on `<html>` via
 *  LANDING_FONT_VARIABLE_CLASSES so we don't double-apply it. */
export const NON_INTER_FONT_VARIABLE_CLASSES = Object.entries(FONT_REGISTRY)
  .filter(([key]) => key !== "Inter")
  .map(([, f]) => f.variable)
  .join(" ");
