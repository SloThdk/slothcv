/**
 * Shared template helpers — pure data utilities shared by every DOM template
 * and (where possible) by the react-pdf companions.
 *
 * Keeping these pure (no React, no DOM, no react-pdf) means both rendering
 * surfaces can import them without dragging in each other's runtime.
 */

import type {
  Bullet,
  DateFormat,
  GlobalDesign,
  PageSize,
  ResumeData,
  Section,
} from "@/types/resume";

/** A4/Letter/Legal millimeter dimensions used to size the live preview. */
export const PAGE_DIMENSIONS_MM: Record<PageSize, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  Letter: { w: 215.9, h: 279.4 },
  Legal: { w: 215.9, h: 355.6 },
};

/** Convert a millimeter width to a CSS pixel width assuming 96dpi.
 *  Used by the live preview to render an actual A4-shaped page. */
export function mmToPx(mm: number): number {
  return (mm / 25.4) * 96;
}

/** Page margin in mm based on the design preset. */
export function marginMm(d: GlobalDesign): number {
  switch (d.pageMargin) {
    case "narrow":
      return 12;
    case "wide":
      return 28;
    case "custom":
      return Math.max(0, Math.min(80, d.pageMarginMm ?? 18));
    case "normal":
    default:
      return 18;
  }
}

/** Letter spacing in em — applied via inline style. */
export function letterSpacingEm(d: GlobalDesign): number {
  if (d.letterSpacing === "tight") return -0.01;
  if (d.letterSpacing === "wide") return 0.04;
  return 0;
}

/** Format a YYYY-MM, YYYY, or already-pretty string per the chosen format. */
export function formatDate(raw: string, fmt: DateFormat): string {
  if (!raw) return "";
  // Accept strings like "2024-03", "2024-03-01", "2024", "Mar 2024" — try
  // to parse the first two; fall through to passthrough.
  const yyyymm = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/.exec(raw.trim());
  if (yyyymm) {
    const year = Number(yyyymm[1]);
    const month = Number(yyyymm[2]);
    return formatYearMonth(year, month, fmt);
  }
  const yyyy = /^(\d{4})$/.exec(raw.trim());
  if (yyyy) {
    const year = Number(yyyy[1]);
    if (fmt === "Mon 'YY") return `'${String(year).slice(-2)}`;
    return String(year);
  }
  return raw;
}

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatYearMonth(year: number, month: number, fmt: DateFormat): string {
  const m = Math.max(1, Math.min(12, month));
  switch (fmt) {
    case "MM/YYYY":
      return `${String(m).padStart(2, "0")}/${year}`;
    case "YYYY-MM":
      return `${year}-${String(m).padStart(2, "0")}`;
    case "Mon 'YY":
      return `${MONTHS_SHORT[m - 1]} '${String(year).slice(-2)}`;
    case "locale": {
      // Best-effort browser-locale formatting — falls back to "Mon YYYY".
      try {
        return new Date(year, m - 1, 1).toLocaleDateString(undefined, {
          month: "short",
          year: "numeric",
        });
      } catch {
        return `${MONTHS_SHORT[m - 1]} ${year}`;
      }
    }
    case "Mon YYYY":
    default:
      return `${MONTHS_SHORT[m - 1]} ${year}`;
  }
}

/** Render a "Mar 2022 — Present" range. Honors the `current` flag. */
export function formatDateRange(
  start: string,
  end: string,
  current: boolean,
  fmt: DateFormat,
): string {
  const s = formatDate(start, fmt);
  const e = current ? "Present" : formatDate(end, fmt);
  if (!s && !e) return "";
  if (!s) return e;
  if (!e) return s;
  return `${s} — ${e}`;
}

/** Glyph for the chosen bullet style — empty string for "none". */
export function bulletGlyph(d: GlobalDesign): string {
  switch (d.bulletStyle) {
    case "dash":
      return "–";
    case "arrow":
      return "→";
    case "square":
      return "▪";
    case "none":
      return "";
    case "disc":
    default:
      return "•";
  }
}

/** Base font size in pixels — derived from the design's fontScale. */
export function basePx(d: GlobalDesign): number {
  return 10.5 * d.fontScale;
}

/** Visible bullets only — keeps templates terse. */
export function visibleBullets(bullets: Bullet[]): Bullet[] {
  return bullets.filter((b) => b.visible && b.text.trim().length > 0);
}

/** Sections that should actually render (visible AND have substantive content
 *  OR we're explicitly keeping empty sections to show the structure — for
 *  v1 we render every visible section whether it has items or not, because
 *  hiding mid-edit would be jarring). */
export function visibleSections(data: ResumeData): Section[] {
  return data.sections.filter((s) => s.visible);
}

/** Resolve effective design — globals merged with per-section overrides. */
export function resolveDesign(
  global: GlobalDesign,
  section: Section,
): GlobalDesign {
  if (!section.overrides) return global;
  return { ...global, ...section.overrides };
}

/**
 * Build the inline-style for a section's free-position offset. Returns an
 * empty object when the section has no offset set so React doesn't churn.
 *
 * Templates wire this via `style={positionStyle(section)}` on the section
 * wrapper; the user drags in the preview, the store updates `section.position`,
 * the wrapper re-renders with the translate applied. Slider in the per-section
 * overrides reads/writes the same field — both stay synced through the store.
 *
 * The return type is plain {[k: string]: string} so this module stays
 * React-import-free (it's also used by the PDF companion).
 */
export function positionStyle(
  section: Section,
): { transform?: string; willChange?: string; transformOrigin?: string } {
  const p = section.position;
  const r = section.rotation ?? 0;
  const hasPos = p && (p.x !== 0 || p.y !== 0);
  const hasRot = r !== 0;
  if (!hasPos && !hasRot) return {};
  const parts: string[] = [];
  if (hasPos) parts.push(`translate(${p!.x}px, ${p!.y}px)`);
  if (hasRot) parts.push(`rotate(${r}deg)`);
  return {
    transform: parts.join(" "),
    // Centre rotation around the section's mid-point so the section
    // pivots in place rather than swinging from the top-left corner.
    transformOrigin: hasRot ? "center center" : undefined,
    // willChange hints to the GPU that this element will move — keeps drag
    // feel buttery (~60fps) on lower-end laptops.
    willChange: "transform",
  };
}

/**
 * Per-ELEMENT drag offset → inline style. Same shape as positionStyle()
 * but reads from `data.elementOverrides[id]` instead of `section.position`,
 * letting the user move individual pieces (name, headline, photo, …) as
 * well as whole sections.
 *
 * Templates that opt-in tag a wrapper element with `data-element-id="..."`
 * AND apply `style={elementStyle(data, id)}`. The preview's drag handler
 * looks for `data-element-id` first (most specific), falls back to
 * `data-section-id`, and updates the matching field in the store.
 *
 * Element ids follow a stable convention so React keys + saved state both
 * survive reorders — see `ResumeData.elementOverrides` in resume.ts.
 */
export function elementStyle(
  data: ResumeData,
  id: string,
): { transform?: string; willChange?: string; transformOrigin?: string } {
  const o = data.elementOverrides?.[id];
  if (!o) return {};
  const dx = o.dx ?? 0;
  const dy = o.dy ?? 0;
  const rot = o.rotate ?? 0;
  const hasMove = dx !== 0 || dy !== 0;
  const hasRot = rot !== 0;
  if (!hasMove && !hasRot) return {};
  const parts: string[] = [];
  if (hasMove) parts.push(`translate(${dx}px, ${dy}px)`);
  if (hasRot) parts.push(`rotate(${rot}deg)`);
  return {
    transform: parts.join(" "),
    transformOrigin: hasRot ? "center center" : undefined,
    willChange: "transform",
  };
}

/**
 * Photo-border CSS for templates that render `personal.photoUrl` with
 * an outline / ring around it. Honours the user-overridable
 * `design.photo.borderColor` + `design.photo.borderWidth` from the
 * Design → Photo controls so a single style rule serves every photo
 * across every template.
 *
 * `fallbackColor` is the template's "if user hasn't customised colour"
 * default — typically `${design.accentColor}66` for accent-tinted
 * outlines, but templates can pass a darker hex for editorial styles.
 *
 * Width 0 = no border (returns empty box-shadow).
 *
 * Implementation: returns a `boxShadow` (not `outline`) because CSS
 * `outline` is screen-only — print media doesn't paint it, so the
 * window.print() PDF export drops the photo border. Box-shadow
 * stacks two layers: a transparent ring of width = offset (2px) to
 * create the visual gap between photo edge and ring, then a solid
 * ring of width = offset+borderWidth in the actual color. Both
 * shadows render on screen AND in print, keeping the editor preview
 * and the exported PDF visually identical.
 */
export function photoBorderStyle(
  design: GlobalDesign,
  fallbackColor: string,
): { boxShadow: string } {
  const w = design.photo.borderWidth ?? 2;
  if (w <= 0) return { boxShadow: "none" };
  const c = design.photo.borderColor?.trim() || fallbackColor;
  const offset = 2;
  return {
    boxShadow: `0 0 0 ${offset}px transparent, 0 0 0 ${offset + w}px ${c}`,
  };
}

/** Header-style transform helper — applied to section titles in templates. */
export function transformHeader(text: string, d: GlobalDesign): string {
  if (d.headerStyle === "uppercase") return text.toUpperCase();
  if (d.headerStyle === "titlecase")
    return text.replace(
      /\w\S*/g,
      (w) => w[0].toUpperCase() + w.slice(1).toLowerCase(),
    );
  return text;
}
