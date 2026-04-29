/**
 * Zod schema mirror of `src/types/resume.ts`.
 *
 * Use `parseResumeData()` on every load from Supabase. It does two things:
 *   1. Strips unknown / malicious fields (Zod `.strict()` would throw, but we
 *      use the default which silently drops extras — important because future
 *      schema versions might land in production before we cut a new client.
 *   2. Migrates older shapes forward (currently a no-op since version === 1).
 *
 * Security rationale: `resumes.data` is JSONB written by clients; even though
 * RLS limits each user to their own rows, a compromised browser or naive copy
 * from another tool could plant unexpected fields. Zod is the trust boundary.
 */

import { z } from "zod";
import {
  RESUME_SCHEMA_VERSION,
  TEMPLATE_IDS,
  type ResumeData,
} from "@/types/resume";

// --- Atomic primitives ---

/** Hex color OR named CSS color we explicitly allow. */
const colorSchema = z.string().min(1).max(64);

/** Identifier — short, ASCII-friendly. */
const idSchema = z.string().min(1).max(64);

const localeSchema = z.enum(["da", "en"]);

// Use the canonical TEMPLATE_IDS array from src/types/resume.ts as the
// SINGLE source of truth. The previous duplicated enum (14 ids) silently
// drifted when 30 new templates were added — every CV with a new template
// id failed Zod validation, parseResumeData() returned null, and the
// editor fell back to defaultResumeData(). See the comment on TEMPLATE_IDS.
const templateSchema = z.enum(TEMPLATE_IDS);

// --- Design ---

const photoShapeSchema = z.enum(["square", "circle", "rounded", "arch"]);
const photoPositionSchema = z.enum([
  "top-left",
  "top-center",
  "top-right",
  "sidebar",
]);
const watermarkPositionSchema = z.enum([
  "off",
  "bottom-left",
  "bottom-right",
  "top-left",
  "top-right",
]);
const headerStyleSchema = z.enum([
  "uppercase",
  "titlecase",
  "underline",
  "box",
  "accent-block",
]);
const dividerStyleSchema = z.enum([
  "none",
  "line",
  "dashed",
  "dotted",
  "accent-bar",
]);
const bulletStyleSchema = z.enum(["disc", "dash", "arrow", "square", "none"]);
const skillBarStyleSchema = z.enum([
  "bar",
  "dots",
  "stars",
  "circles",
  "text-only",
  "pills",
]);
const languageStyleSchema = z.enum(["bar", "dots", "text", "cefr-badges"]);
const dateFormatSchema = z.enum([
  "Mon YYYY",
  "MM/YYYY",
  "YYYY-MM",
  "Mon 'YY",
  "locale",
]);
const pageSizeSchema = z.enum(["A4", "Letter", "Legal"]);
const layoutSchema = z.enum([
  "single",
  "two-col",
  "sidebar-left",
  "sidebar-right",
  "sidebar-with-header",
]);
const letterSpacingSchema = z.enum(["tight", "normal", "wide"]);
const pageMarginSchema = z.enum(["narrow", "normal", "wide", "custom"]);
const iconSetSchema = z.enum(["lucide", "heroicons", "tabler", "none"]);

const globalDesignSchema = z.object({
  accentColor: colorSchema,
  secondaryColor: colorSchema,
  pageBg: colorSchema,
  textColor: colorSchema,
  titleFont: z.string().min(1).max(64),
  bodyFont: z.string().min(1).max(64),
  fontScale: z.number().min(0.5).max(1.5),
  lineSpacing: z.number().min(0.8).max(2.5),
  letterSpacing: letterSpacingSchema,
  layout: layoutSchema,
  sidebarWidth: z.number().min(0.18).max(0.5),
  pageMargin: pageMarginSchema,
  pageMarginMm: z.number().min(0).max(80).optional(),
  photo: z.object({
    enabled: z.boolean(),
    shape: photoShapeSchema,
    position: photoPositionSchema,
  }),
  sectionIcons: z.boolean(),
  iconSet: iconSetSchema,
  bulletStyle: bulletStyleSchema,
  dividerStyle: dividerStyleSchema,
  headerStyle: headerStyleSchema,
  skillBarStyle: skillBarStyleSchema,
  languageStyle: languageStyleSchema,
  dateFormat: dateFormatSchema,
  pageSize: pageSizeSchema,
  multiPage: z.boolean(),
  /** Watermark fields are kept optional in the migration sense — older
   *  rows in the DB don't have them, so parseResumeData() backfills the
   *  defaults via the migrate() pass. */
  watermarkText: z.string().max(40).default(""),
  watermarkPosition: watermarkPositionSchema.default("off"),
  watermarkColor: z.string().max(64).default(""),
});

// --- Personal ---

/** URL allowlist — http/https/mailto/tel only. Prevents `javascript:` / `data:`
 *  smuggling into the rendered preview. We don't *render* unsafe schemes
 *  (templates use plain text links + dompurify), but defense in depth. */
const safeUrlSchema = z
  .string()
  .max(2048)
  .refine((s) => {
    if (!s) return true;
    const lower = s.toLowerCase().trim();
    return (
      lower.startsWith("http://") ||
      lower.startsWith("https://") ||
      lower.startsWith("mailto:") ||
      lower.startsWith("tel:") ||
      // Allow protocol-relative and bare domain — DOMPurify still cleans
      // the rendered output.
      /^[a-z0-9.-]+\.[a-z]{2,}/i.test(lower)
    );
  }, "Unsupported URL scheme");

const personalLinkSchema = z.object({
  id: idSchema,
  label: z.string().max(80),
  url: safeUrlSchema,
});

const personalInfoSchema = z.object({
  fullName: z.string().max(160),
  headline: z.string().max(200),
  email: z.string().max(200),
  phone: z.string().max(60),
  location: z.string().max(120),
  photoUrl: z.string().max(2048).optional(),
  links: z.array(personalLinkSchema).max(20),
});

// --- Sections ---

const bulletSchema = z.object({
  id: idSchema,
  text: z.string().max(800),
  visible: z.boolean(),
});

const datedItemFields = {
  id: idSchema,
  startDate: z.string().max(40),
  endDate: z.string().max(40),
  current: z.boolean(),
  visible: z.boolean(),
};

const sectionBaseFields = {
  id: idSchema,
  title: z.string().max(80),
  visible: z.boolean(),
  /** Allow any partial of GlobalDesign as override. We .partial() to skip
   *  the strict full-shape requirement. */
  overrides: globalDesignSchema.partial().optional(),
  /** Free-position offset. Bounded to ±400 px so a corrupted blob can't
   *  push a section off the page entirely. */
  position: z
    .object({
      x: z.number().min(-400).max(400),
      y: z.number().min(-400).max(400),
    })
    .optional(),
  /** Rotation in degrees, ±360 wraps fully both directions. */
  rotation: z.number().min(-360).max(360).optional(),
};

const summarySectionSchema = z.object({
  ...sectionBaseFields,
  type: z.literal("summary"),
  body: z.string().max(4000),
});

const experienceSectionSchema = z.object({
  ...sectionBaseFields,
  type: z.literal("experience"),
  items: z
    .array(
      z.object({
        ...datedItemFields,
        company: z.string().max(160),
        role: z.string().max(160),
        location: z.string().max(120),
        bullets: z.array(bulletSchema).max(20),
      }),
    )
    .max(40),
});

const educationSectionSchema = z.object({
  ...sectionBaseFields,
  type: z.literal("education"),
  items: z
    .array(
      z.object({
        ...datedItemFields,
        institution: z.string().max(160),
        degree: z.string().max(160),
        field: z.string().max(160),
        location: z.string().max(120),
        gpa: z.string().max(20).optional(),
        bullets: z.array(bulletSchema).max(20),
      }),
    )
    .max(20),
});

const skillsSectionSchema = z.object({
  ...sectionBaseFields,
  type: z.literal("skills"),
  items: z
    .array(
      z.object({
        id: idSchema,
        name: z.string().max(80),
        level: z.number().int().min(0).max(5),
        group: z.string().max(60),
        visible: z.boolean(),
      }),
    )
    .max(80),
});

const languagesSectionSchema = z.object({
  ...sectionBaseFields,
  type: z.literal("languages"),
  items: z
    .array(
      z.object({
        id: idSchema,
        name: z.string().max(60),
        proficiency: z.string().max(40),
        level: z.number().int().min(0).max(5),
        visible: z.boolean(),
      }),
    )
    .max(20),
});

const projectsSectionSchema = z.object({
  ...sectionBaseFields,
  type: z.literal("projects"),
  items: z
    .array(
      z.object({
        ...datedItemFields,
        name: z.string().max(160),
        role: z.string().max(160),
        url: z.string().max(2048).optional(),
        techStack: z.string().max(400),
        bullets: z.array(bulletSchema).max(20),
      }),
    )
    .max(40),
});

const certificationsSectionSchema = z.object({
  ...sectionBaseFields,
  type: z.literal("certifications"),
  items: z
    .array(
      z.object({
        id: idSchema,
        name: z.string().max(160),
        issuer: z.string().max(160),
        date: z.string().max(40),
        expiry: z.string().max(40).optional(),
        credentialId: z.string().max(120).optional(),
        url: z.string().max(2048).optional(),
        visible: z.boolean(),
      }),
    )
    .max(40),
});

const awardsSectionSchema = z.object({
  ...sectionBaseFields,
  type: z.literal("awards"),
  items: z
    .array(
      z.object({
        id: idSchema,
        name: z.string().max(160),
        issuer: z.string().max(160),
        date: z.string().max(40),
        description: z.string().max(800),
        visible: z.boolean(),
      }),
    )
    .max(40),
});

const publicationsSectionSchema = z.object({
  ...sectionBaseFields,
  type: z.literal("publications"),
  items: z
    .array(
      z.object({
        id: idSchema,
        title: z.string().max(400),
        authors: z.string().max(400),
        venue: z.string().max(200),
        date: z.string().max(40),
        url: z.string().max(2048).optional(),
        visible: z.boolean(),
      }),
    )
    .max(40),
});

const volunteerSectionSchema = z.object({
  ...sectionBaseFields,
  type: z.literal("volunteer"),
  items: z
    .array(
      z.object({
        ...datedItemFields,
        organization: z.string().max(160),
        role: z.string().max(160),
        location: z.string().max(120),
        bullets: z.array(bulletSchema).max(20),
      }),
    )
    .max(40),
});

const talksSectionSchema = z.object({
  ...sectionBaseFields,
  type: z.literal("talks"),
  items: z
    .array(
      z.object({
        id: idSchema,
        title: z.string().max(300),
        venue: z.string().max(200),
        date: z.string().max(40),
        url: z.string().max(2048).optional(),
        visible: z.boolean(),
      }),
    )
    .max(40),
});

const hobbiesSectionSchema = z.object({
  ...sectionBaseFields,
  type: z.literal("hobbies"),
  items: z
    .array(
      z.object({
        id: idSchema,
        text: z.string().max(120),
        visible: z.boolean(),
      }),
    )
    .max(20),
});

const referencesSectionSchema = z.object({
  ...sectionBaseFields,
  type: z.literal("references"),
  onRequest: z.boolean(),
  items: z
    .array(
      z.object({
        id: idSchema,
        name: z.string().max(120),
        role: z.string().max(120),
        company: z.string().max(120),
        email: z.string().max(200),
        phone: z.string().max(60),
        visible: z.boolean(),
      }),
    )
    .max(10),
});

const customSectionSchema = z.object({
  ...sectionBaseFields,
  type: z.literal("custom"),
  body: z.string().max(4000),
  items: z.array(bulletSchema).max(40),
});

const sectionSchema = z.discriminatedUnion("type", [
  summarySectionSchema,
  experienceSectionSchema,
  educationSectionSchema,
  skillsSectionSchema,
  languagesSectionSchema,
  projectsSectionSchema,
  certificationsSectionSchema,
  awardsSectionSchema,
  publicationsSectionSchema,
  volunteerSectionSchema,
  talksSectionSchema,
  hobbiesSectionSchema,
  referencesSectionSchema,
  customSectionSchema,
]);

const resumeMetaSchema = z.object({
  template: templateSchema,
  language: localeSchema,
  version: z.number().int().min(1).max(999),
});

/** Per-element drag offset. Bounded the same way section.position is —
 *  ±400 px so a corrupted blob can't shove an element off-page. Keys are
 *  capped at 200 chars. The map itself is capped at 500 entries via the
 *  `.refine`, which is generous (a CV with 500 individually-positioned
 *  elements is already deep into "you should redesign your CV" territory)
 *  but bounded so a bad payload can't OOM the parser. */
const elementOffsetSchema = z.object({
  dx: z.number().min(-400).max(400).optional(),
  dy: z.number().min(-400).max(400).optional(),
  rotate: z.number().min(-360).max(360).optional(),
});

// --- Custom (toolshelf) elements ---

/** Bounds chosen so a bad payload can't shove an element off-page (A4 is
 *  ~794×1123 px @96dpi; we allow a generous 2000 to support multi-page in
 *  the future) and can't be sized invisibly small or page-breakingly large. */
const customElementBaseFields = {
  id: idSchema,
  x: z.number().min(-200).max(2000),
  y: z.number().min(-200).max(3000),
  w: z.number().min(2).max(2000),
  h: z.number().min(0).max(3000),
  z: z.number().int().min(0).max(10000),
  rotate: z.number().min(-360).max(360).optional(),
  opacity: z.number().min(0).max(1).optional(),
  visible: z.boolean(),
};

const rectElementSchema = z.object({
  ...customElementBaseFields,
  kind: z.literal("rect"),
  fill: colorSchema,
  stroke: colorSchema.optional(),
  strokeWidth: z.number().min(0).max(40).optional(),
  radius: z.number().min(0).max(400).optional(),
});

const ellipseElementSchema = z.object({
  ...customElementBaseFields,
  kind: z.literal("ellipse"),
  fill: colorSchema,
  stroke: colorSchema.optional(),
  strokeWidth: z.number().min(0).max(40).optional(),
});

// Polygon-family shapes — same fields as rect, different rendered path.
const polygonShape = <K extends string>(kind: K) =>
  z.object({
    ...customElementBaseFields,
    kind: z.literal(kind),
    fill: colorSchema,
    stroke: colorSchema.optional(),
    strokeWidth: z.number().min(0).max(40).optional(),
  });

const triangleElementSchema = polygonShape("triangle");
const starElementSchema = polygonShape("star");
const hexagonElementSchema = polygonShape("hexagon");
const arrowElementSchema = polygonShape("arrow");
const heartElementSchema = polygonShape("heart");
const diamondElementSchema = polygonShape("diamond");
const octagonElementSchema = polygonShape("octagon");
const crossElementSchema = polygonShape("cross");
const sparkleElementSchema = polygonShape("sparkle");

const lineElementSchema = z.object({
  ...customElementBaseFields,
  kind: z.literal("line"),
  color: colorSchema,
  thickness: z.number().min(0.5).max(40),
  dash: z.array(z.number().min(0).max(40)).max(8).optional(),
});

const textElementSchema = z.object({
  ...customElementBaseFields,
  kind: z.literal("text"),
  text: z.string().max(2000),
  fontSize: z.number().min(6).max(160),
  fontWeight: z.number().int().min(100).max(900),
  fontFamily: z.string().max(64).optional(),
  color: colorSchema,
  align: z.enum(["left", "center", "right"]).optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
});

const imageElementSchema = z.object({
  ...customElementBaseFields,
  kind: z.literal("image"),
  url: z.string().max(2048),
  fit: z.enum(["cover", "contain", "fill"]).optional(),
  radius: z.number().min(0).max(400).optional(),
  // Optional clickable destination. Same scheme-validation policy as
  // `iconElementSchema.url` — `normalizeHref` at render time rejects
  // `javascript:` / `data:` before emitting any link into the PDF.
  // Capped at 500 chars; longer URLs almost certainly aren't real.
  linkUrl: z.string().max(500).optional(),
});

// Social-icon element. `iconName` is gated by the registry in
// `src/lib/social-icons.ts` so a saved CV can't reference a glyph we
// no longer ship — Zod fails parse, the editor falls back to default
// data, the user is never confronted with an empty-box mystery. The
// list is duplicated here (rather than imported) to keep this schema
// module independent of editor-runtime code; the test suite asserts
// the two stay in sync.
const SOCIAL_ICON_NAMES = [
  "linkedin",
  "instagram",
  "facebook",
  "x",
  "github",
  "youtube",
  "telegram",
  "tiktok",
  "discord",
  "behance",
  "dribbble",
  "mail",
  "globe",
] as const;
const iconElementSchema = z.object({
  ...customElementBaseFields,
  kind: z.literal("icon"),
  iconName: z.enum(SOCIAL_ICON_NAMES),
  color: colorSchema,
  // Optional clickable URL for PDF export. Hard-capped at 500 chars to
  // prevent accidental data dumps. Scheme is checked at render time —
  // schemas keep the validation cheap (string length only) so the
  // load-from-Supabase path stays fast. The renderer's `normalizeHref`
  // helper rejects `javascript:` and `data:` schemes before any link
  // gets emitted to the PDF.
  url: z.string().max(500).optional(),
});

const customElementSchema = z.discriminatedUnion("kind", [
  rectElementSchema,
  ellipseElementSchema,
  lineElementSchema,
  triangleElementSchema,
  starElementSchema,
  hexagonElementSchema,
  arrowElementSchema,
  heartElementSchema,
  diamondElementSchema,
  octagonElementSchema,
  crossElementSchema,
  sparkleElementSchema,
  textElementSchema,
  imageElementSchema,
  iconElementSchema,
]);

export const resumeDataSchema = z.object({
  meta: resumeMetaSchema,
  design: globalDesignSchema,
  personal: personalInfoSchema,
  /** 50-section ceiling — generous, but bounded so a malicious payload can't
   *  blow up the editor by injecting tens of thousands of sections. */
  sections: z.array(sectionSchema).max(50),
  /** Per-element drag offsets. See `ResumeData.elementOverrides` in
   *  src/types/resume.ts for the keying convention. */
  elementOverrides: z
    .record(z.string().max(200), elementOffsetSchema)
    .refine((m) => Object.keys(m).length <= 500, {
      message: "Too many element overrides",
    })
    .optional(),
  /** Free-form toolshelf elements. ~200-element ceiling covers any
   *  realistic visual-designer use; larger payloads are usually a
   *  paste-attack or a runaway script. */
  customElements: z.array(customElementSchema).max(200).optional(),
});

/**
 * Parse arbitrary JSON into `ResumeData`. Returns `null` on failure so callers
 * can fall back to a pristine default rather than crashing the editor.
 */
export function parseResumeData(input: unknown): ResumeData | null {
  if (input == null || typeof input !== "object") return null;
  const result = resumeDataSchema.safeParse(input);
  if (!result.success) return null;
  return migrate(result.data as ResumeData);
}

/**
 * Forward-only migration. Runs on every load. v1 is the introduction; future
 * versions branch on `data.meta.version` and rewrite into the latest shape.
 */
function migrate(data: ResumeData): ResumeData {
  if (data.meta.version > RESUME_SCHEMA_VERSION) {
    // Newer-than-us payload — accept best-effort, but pin the version so we
    // don't loop "upgrading" on every save.
    return { ...data, meta: { ...data.meta, version: RESUME_SCHEMA_VERSION } };
  }
  // No older versions yet.
  return data;
}
