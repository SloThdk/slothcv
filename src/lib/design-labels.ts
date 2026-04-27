/**
 * design-labels — single source of truth for human-friendly names of the
 * design tokens our chip-style controls expose.
 *
 * Lives outside any one component so SectionDesignOverrides and the
 * global DesignTab pull from the same map. Without this, the per-section
 * panel showed raw enum keys ("uppercase", "titlecase", "accent-block",
 * "cefr-badges") while the global Design tab used friendly labels —
 * inconsistent, code-y, and felt unfinished.
 *
 * Each entry is the canonical English label. UI strings that need
 * translation should pass through `t(...)` in the i18n catalog instead;
 * this file is for the design-token names users see when they tweak
 * style chips.
 */

export const DESIGN_LABEL: Record<string, string> = {
  // Photo position
  "top-left": "Top left",
  "top-center": "Top center",
  "top-right": "Top right",
  "sidebar": "In sidebar",
  // Photo shape
  "square": "Square",
  "circle": "Circle",
  "rounded": "Rounded",
  "arch": "Arch",
  // Layout
  "single": "Single column",
  "two-col": "Two columns",
  "sidebar-left": "Sidebar left",
  "sidebar-right": "Sidebar right",
  "sidebar-with-header": "Sidebar + top header",
  // Page margin
  "narrow": "Narrow",
  "normal": "Normal",
  "wide": "Wide",
  "custom": "Custom",
  // Letter spacing
  "tight": "Tight",
  // Header style — show the GLYPH/LOOK in the chip face when possible
  "uppercase": "ALL CAPS",
  "titlecase": "Title Case",
  "underline": "Underlined",
  "box": "Filled box",
  "accent-block": "Accent block",
  // Divider style
  "none": "None",
  "line": "Solid line",
  "dashed": "Dashed",
  "dotted": "Dotted",
  "accent-bar": "Accent bar",
  // Bullet style — chip face shows the actual bullet glyph
  "disc": "● Dot",
  "dash": "– Dash",
  "arrow": "→ Arrow",
  // Skill bar style
  "bar": "Progress bar",
  "dots": "Dots",
  "stars": "Stars",
  "circles": "Circles",
  "text-only": "Text only",
  "pills": "Chips",
  // Language style
  "text": "Text label",
  "cefr-badges": "CEFR badge",
  // Date format
  "Mon YYYY": "Mar 2024",
  "MM/YYYY": "03/2024",
  "YYYY-MM": "2024-03",
  "Mon 'YY": "Mar '24",
  "locale": "Local format",
  // Page size
  "A4": "A4",
  "Letter": "Letter (US)",
  "Legal": "Legal (US)",
  // Watermark position
  "off": "Off",
  "bottom-left": "Bottom left",
  "bottom-right": "Bottom right",
};

/**
 * Template IDs whose renderers do NOT consume `personal.photoUrl`. These
 * are intentionally text-only / classical layouts (academic CVs, ATS-
 * focused minimal sheets, conservative legal/finance). The personal
 * form surfaces a hint on these so the user knows uploading a photo
 * won't change the preview — and what to do about it (switch template).
 *
 * Kept in sync by hand against the templates in src/templates/. If a
 * template gains photo support, REMOVE its id from this set; if a new
 * text-only template ships, ADD its id here. Verified once per
 * deployment by grepping for `personal.photoUrl` across templates and
 * diffing the file list.
 */
export const NO_PHOTO_TEMPLATES = new Set<string>([
  "atelier",
  "blank",
  "boston",
  "cambridge",
  "davos",
  "eclipse",
  "frame",
  "heidelberg",
  "helsinki",
  "mayfair",
  "oslo",
  "reykjavik",
  "scratch",
  "scrubs",
  "stanford",
  "vienna",
]);

/** Convert a raw token to its human label, falling back to a Title-Case
 *  split if no explicit map entry exists. */
export function designLabel(s: string): string {
  return (
    DESIGN_LABEL[s] ??
    s
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

/**
 * Plain-English description of WHAT each control does, shown as a hint
 * under the chip row so users know what they're tweaking. Empty string
 * means no hint (the control is self-explanatory from its name).
 *
 * Keep these short — one sentence each. They show under the controls
 * in 11 px muted text.
 */
export const DESIGN_HINT: Record<string, string> = {
  headerStyle:
    "How section titles look — ALL CAPS reads formal, Title Case reads modern, Underlined reads editorial.",
  bulletStyle:
    "Glyph used in front of every bullet item across experience, projects, and similar lists.",
  dividerStyle:
    "The line that sits under each section heading. Choose None for the cleanest look.",
  skillBarStyle:
    "How proficiency level shows next to each skill. Chips and Text only hide the level entirely.",
  languageStyle:
    "How language proficiency shows. Bar / dots draw the level; CEFR badge shows the typed text (B2, C1) in a chip.",
  dateFormat: "How dates render across experience and education entries.",
  accentColor:
    "The brand color of this section — used by the title, dividers, bullets, and any accent.",
  position:
    "Free-position nudge. Drag the section in the preview or use the sliders. 0 = template-default position.",
};
