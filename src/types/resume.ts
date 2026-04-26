/**
 * ResumeData — the canonical editor model for a single CV.
 *
 * The entire structure is persisted as `resumes.data jsonb` in Supabase. The
 * shape below is mirrored 1:1 by `src/lib/schemas/resume.ts` (Zod) for runtime
 * validation on load, so this file and that schema must move together.
 *
 * Versioning:
 *   - `meta.version` is bumped whenever a backwards-incompatible change is
 *     made to any of the types below. Loaders should run a migration before
 *     handing the data to the editor when the stored version is older.
 *
 * Extending:
 *   - To add a new section type, extend `SectionType`, add the matching
 *     interface, add it to the `Section` union, mirror the change in the
 *     Zod schema, and update `EMPTY_SECTIONS` in `src/lib/store/editor.ts`.
 */

// ---------- Top-level ----------

/** Identifier of the active visual template. Templates render the same
 *  ResumeData differently — swapping never destroys content. */
export type TemplateId =
  | "scratch"
  | "berlin"
  | "helsinki"
  | "tokyo"
  | "oslo"
  | "madrid"
  | "reykjavik"
  | "aurora"
  | "eclipse"
  | "copenhagen"
  | "vienna"
  | "manhattan"
  | "cambridge"
  | "blank"
  // ── Enterprise expansion (30 new templates, mid-2026) ─────────────
  // Modern minimalist
  | "helvetica"
  | "geist"
  | "notion"
  | "linear"
  | "stripe"
  // Dark / editorial
  | "obsidian"
  | "carbon"
  | "midnight"
  | "onyx"
  | "graphite"
  // Sidebar / two-column
  | "geneva"
  | "zurich"
  | "frankfurt"
  | "singapore"
  | "dubai"
  // Bento / grid / dashboard
  | "bento"
  | "mosaic"
  | "dashboard"
  | "atlas"
  | "heidelberg"
  // Academic
  | "boston"
  | "stanford"
  // Executive / finance
  | "madison"
  | "mayfair"
  | "davos"
  // Creative / portfolio
  | "atelier"
  | "studio"
  | "canvas"
  // Industry-specific
  | "scrubs"
  | "founder";

/** Locale for default placeholder copy AND date formatting fallback. */
export type LocaleId = "da" | "en";

/** Top-level meta — non-content settings that persist with the CV. */
export interface ResumeMeta {
  /** Current visual template id. */
  template: TemplateId;
  /** UI / placeholder language. */
  language: LocaleId;
  /** Schema version for forward-compatible migrations. */
  version: number;
}

/** Per-element transform offset, applied on top of the template's
 *  default flow position for that element. `dx`/`dy` are in CSS pixels;
 *  `rotate` is in degrees. An absent entry / all-zero values mean
 *  "render at the template default — no transform".
 *
 *  Per the production CV editor research (Resume.io / Canva / Figma),
 *  storing OFFSETS rather than absolute coordinates is the right call:
 *    - Switching templates resets the visual default but the user's
 *      nudges remain semantically meaningful ("move this 10px right").
 *    - JSON diffs stay tiny — only nudged elements appear.
 *    - Reset = `delete entry`, no math.
 *  The trade-off: a `dy: -10` means different visual things in two
 *  templates. Acceptable; we clear all offsets on template-swap anyway. */
export interface ElementOffset {
  dx?: number;
  dy?: number;
  /** Rotation around the element's center, in degrees. */
  rotate?: number;
}

/** Kind discriminator for free-form custom elements the user adds via
 *  the toolshelf. Mix of basic primitives (rect / ellipse / line) and
 *  named polygon shapes (triangle / star / hexagon / arrow) that share
 *  the same fill/stroke shape but render through different SVG paths. */
export type CustomElementKind =
  | "rect"
  | "ellipse"
  | "line"
  | "triangle"
  | "star"
  | "hexagon"
  | "arrow"
  | "heart"
  | "diamond"
  | "octagon"
  | "cross"
  | "sparkle"
  | "text"
  | "image";

/** Common properties every custom element has. Coordinates are in CSS
 *  pixels relative to the A4 page top-left (not the section). The
 *  preview's transform: scale() handles zoom; drag math divides delta
 *  by scale so cursor tracking stays glued. */
export interface CustomElementBase {
  id: string;
  kind: CustomElementKind;
  /** Top-left X in CSS pixels relative to the A4 page. */
  x: number;
  /** Top-left Y in CSS pixels relative to the A4 page. */
  y: number;
  /** Width in CSS pixels. For lines this is the length on the X axis. */
  w: number;
  /** Height in CSS pixels. For lines this is the line thickness. */
  h: number;
  /** Stack order. Higher renders in front. */
  z: number;
  /** Rotation in degrees, around the element's centre. */
  rotate?: number;
  /** Opacity 0..1; defaults to 1. */
  opacity?: number;
  /** Hide without deleting (toggle in the layers list). */
  visible: boolean;
}

export interface RectElement extends CustomElementBase {
  kind: "rect";
  /** CSS color (hex / rgb / var). */
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  /** Border radius in px. */
  radius?: number;
}

export interface EllipseElement extends CustomElementBase {
  kind: "ellipse";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

/** Polygon-family shapes share the same fill/stroke schema as rect /
 *  ellipse — only the rendered SVG path differs. Keeping them as
 *  distinct discriminants (rather than a single "polygon" kind with a
 *  side count) keeps the toolshelf shelf simple: one card per recognisable
 *  shape, each with its own preview thumbnail and label. */
export interface TriangleElement extends CustomElementBase {
  kind: "triangle";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}
export interface StarElement extends CustomElementBase {
  kind: "star";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}
export interface HexagonElement extends CustomElementBase {
  kind: "hexagon";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}
export interface ArrowElement extends CustomElementBase {
  kind: "arrow";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}
export interface HeartElement extends CustomElementBase {
  kind: "heart";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}
export interface DiamondElement extends CustomElementBase {
  kind: "diamond";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}
export interface OctagonElement extends CustomElementBase {
  kind: "octagon";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}
export interface CrossElement extends CustomElementBase {
  kind: "cross";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}
export interface SparkleElement extends CustomElementBase {
  kind: "sparkle";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface LineElement extends CustomElementBase {
  kind: "line";
  /** Line color (hex / rgb / var). */
  color: string;
  /** Stroke thickness in px — distinct from `h` since `h` is the visual
   *  bounding height; thickness is the actual rendered line weight. */
  thickness: number;
  /** Optional dash pattern: empty array = solid, [4,4] = dashed, etc. */
  dash?: number[];
}

export interface TextElement extends CustomElementBase {
  kind: "text";
  text: string;
  fontSize: number;
  fontWeight: number;
  fontFamily?: string;
  color: string;
  align?: "left" | "center" | "right";
  italic?: boolean;
  underline?: boolean;
}

export interface ImageElement extends CustomElementBase {
  kind: "image";
  url: string;
  /** object-fit value. */
  fit?: "cover" | "contain" | "fill";
  /** Border radius in px. */
  radius?: number;
}

export type CustomElement =
  | RectElement
  | EllipseElement
  | LineElement
  | TriangleElement
  | StarElement
  | HexagonElement
  | ArrowElement
  | HeartElement
  | DiamondElement
  | OctagonElement
  | CrossElement
  | SparkleElement
  | TextElement
  | ImageElement;

/** The full persisted document. */
export interface ResumeData {
  meta: ResumeMeta;
  design: GlobalDesign;
  personal: PersonalInfo;
  /** Ordered list of sections — order is the render order. */
  sections: Section[];
  /** Per-element drag offsets, keyed by stable element id. Templates
   *  that opt-in tag elements with `data-element-id="..."` and apply
   *  `elementStyle(data, id)` to their wrapper. The preview's drag
   *  handler walks up looking for `data-element-id` FIRST (most specific)
   *  before falling back to `data-section-id` (whole section).
   *
   *  Conventions for ids:
   *    "personal.name", "personal.headline", "personal.photo"
   *    "personal.email", "personal.phone", "personal.location"
   *    "personal.links.<linkId>"
   *    "section.<sectionId>.title"
   *    "section.<sectionId>.item.<itemId>"
   *    "section.<sectionId>.bullet.<bulletId>"
   *
   *  Cleared on template-swap so old positions don't bleed into a
   *  template that lays elements out differently. */
  elementOverrides?: Record<string, ElementOffset>;
  /** Free-form elements added via the toolshelf — shapes, lines, text,
   *  images that float above the template content. Available on EVERY
   *  template (the "Blank" template is just one with no underlying
   *  rendered content). NOT cleared on template-swap, so user-drawn
   *  custom layout follows them across template choices. Bounded at
   *  ~200 elements via Zod to keep the JSONB lean. */
  customElements?: CustomElement[];
}

// ---------- Personal ----------

/** A single labelled URL (LinkedIn, GitHub, portfolio, …). */
export interface PersonalLink {
  /** Stable id so React keys + drag handles work across reorders. */
  id: string;
  label: string;
  url: string;
}

/** Personal info block — always rendered first, can never be hidden. */
export interface PersonalInfo {
  fullName: string;
  /** Tagline / headline displayed under the name. */
  headline: string;
  email: string;
  phone: string;
  location: string;
  /** Optional avatar URL. Templates respect `design.photo.enabled`. */
  photoUrl?: string;
  links: PersonalLink[];
}

// ---------- Design ----------

/** Crop / mask shape of the avatar in templates that render it. */
export type PhotoShape = "square" | "circle" | "rounded" | "arch";
/** Where the avatar lives in the layout. */
export type PhotoPosition = "top-left" | "top-center" | "top-right" | "sidebar";

/** Corner of the page the watermark text floats in. */
export type WatermarkPosition =
  | "off"
  | "bottom-left"
  | "bottom-right"
  | "top-left"
  | "top-right";
/** Section header decoration style. */
export type HeaderStyle =
  | "uppercase"
  | "titlecase"
  | "underline"
  | "box"
  | "accent-block";
/** Section divider style between sections. */
export type DividerStyle = "none" | "line" | "dashed" | "dotted" | "accent-bar";
/** Bullet character / glyph in lists. */
export type BulletStyle = "disc" | "dash" | "arrow" | "square" | "none";
/** Visualization for skill levels. */
export type SkillBarStyle = "bar" | "dots" | "stars" | "circles" | "text-only" | "pills";
/** Visualization for language proficiency. */
export type LanguageStyle = "bar" | "dots" | "text" | "cefr-badges";
/** Date display format. */
export type DateFormat =
  | "Mon YYYY"
  | "MM/YYYY"
  | "YYYY-MM"
  | "Mon 'YY"
  | "locale";
/** Page paper size for PDF export and on-screen preview. */
export type PageSize = "A4" | "Letter" | "Legal";
/** Multi-column layout choice. */
export type Layout =
  | "single"
  | "two-col"
  | "sidebar-left"
  | "sidebar-right"
  | "sidebar-with-header";
/** Letter spacing presets. */
export type LetterSpacing = "tight" | "normal" | "wide";
/** Page margin presets — `custom` reads `pageMarginMm`. */
export type PageMargin = "narrow" | "normal" | "wide" | "custom";
/** Icon set picker — Phase 2 only ships lucide; the others are plumbing. */
export type IconSet = "lucide" | "heroicons" | "tabler" | "none";

/** Full global design block — every control in master plan §Design (global). */
export interface GlobalDesign {
  // Color
  accentColor: string;
  secondaryColor: string;
  pageBg: string;
  textColor: string;

  // Typography
  titleFont: string;
  bodyFont: string;
  /** Multiplier 0.80–1.20 applied to base font size. */
  fontScale: number;
  /** Line-height multiplier. */
  lineSpacing: number;
  letterSpacing: LetterSpacing;

  // Layout
  layout: Layout;
  /** Sidebar width as a fraction (0.25–0.40). */
  sidebarWidth: number;
  pageMargin: PageMargin;
  pageMarginMm?: number;

  // Photo
  photo: {
    enabled: boolean;
    shape: PhotoShape;
    position: PhotoPosition;
  };

  // Section ornamentation
  sectionIcons: boolean;
  iconSet: IconSet;
  bulletStyle: BulletStyle;
  dividerStyle: DividerStyle;
  headerStyle: HeaderStyle;

  // Specialty visualizations
  skillBarStyle: SkillBarStyle;
  languageStyle: LanguageStyle;

  // Misc
  dateFormat: DateFormat;
  pageSize: PageSize;
  /** Auto-paginate vs warn when content overflows one page. */
  multiPage: boolean;

  /** Big decorative branding text rendered in a corner of the page (e.g.
   *  "CV", initials). Empty + position "off" disables it. */
  watermarkText: string;
  watermarkPosition: WatermarkPosition;
  /** Hex color; defaults to accent if empty. */
  watermarkColor: string;
}

// ---------- Section types ----------

/**
 * Discriminator for the `Section` union.
 *
 * Adding a new value here requires:
 *   1. A matching interface below
 *   2. Adding it to the `Section` union
 *   3. Mirroring it in the Zod schema
 *   4. Adding a default factory in `src/lib/store/editor.ts`
 *   5. Wiring an editor form in `src/components/editor/sections/`
 *   6. Wiring a renderer in each template that should support it
 */
export type SectionType =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "languages"
  | "projects"
  | "certifications"
  | "awards"
  | "publications"
  | "volunteer"
  | "talks"
  | "hobbies"
  | "references"
  | "custom";

/** Common fields every section carries — id, visibility, optional rename,
 *  per-section design overrides, and free-position offsets. */
export interface SectionBase<T extends SectionType> {
  id: string;
  type: T;
  /** Display title — defaults to the type label, user can rename. */
  title: string;
  /** Hide without deleting (dashboard / reorder still shows it). */
  visible: boolean;
  /** Selective override of the global design, scoped to this section. */
  overrides?: Partial<GlobalDesign>;
  /** Free-form translate (in CSS pixels) applied via CSS transform on top
   *  of the template's default flow position. Lets the user nudge a section
   *  off-grid by dragging in the preview. {x:0, y:0} == default position. */
  position?: { x: number; y: number };
  /** Rotation in degrees around the section's center. Composed with
   *  `position` into a single CSS transform: translate(x,y) rotate(deg).
   *  Drag in the preview writes position; the section design panel
   *  exposes a Rotate slider that writes this. */
  rotation?: number;
}

// --- Item-level entries ---

/** Reusable item shape for entries that have a "from–to" date range. */
export interface DatedItem {
  id: string;
  startDate: string;
  endDate: string;
  /** When true, "Present" is rendered instead of `endDate`. */
  current: boolean;
  /** Per-entry hide. */
  visible: boolean;
}

/** A single bullet under an entry — bullets are objects, not strings, so
 *  individual ones can be hidden without losing them. */
export interface Bullet {
  id: string;
  text: string;
  visible: boolean;
}

// --- Section content ---

export interface SummarySection extends SectionBase<"summary"> {
  /** Short narrative paragraph. We do NOT support raw HTML; only plain text
   *  with newlines for v1. Future rich-text MUST sanitize via DOMPurify
   *  with a strict allowlist before rendering. */
  body: string;
}

export interface ExperienceItem extends DatedItem {
  company: string;
  role: string;
  location: string;
  bullets: Bullet[];
}
export interface ExperienceSection extends SectionBase<"experience"> {
  items: ExperienceItem[];
}

export interface EducationItem extends DatedItem {
  institution: string;
  degree: string;
  field: string;
  location: string;
  gpa?: string;
  bullets: Bullet[];
}
export interface EducationSection extends SectionBase<"education"> {
  items: EducationItem[];
}

/** A skill is grouped by category; level 0–5 maps to the chosen visualization. */
export interface SkillItem {
  id: string;
  name: string;
  /** 0–5; 0 means "show no level indicator for this skill". */
  level: number;
  /** Group name e.g. "Languages", "Tools", "Soft skills". */
  group: string;
  visible: boolean;
}
export interface SkillsSection extends SectionBase<"skills"> {
  items: SkillItem[];
}

/** CEFR level when proficiencyMode === "cefr"; otherwise free text. */
export type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Native";
export interface LanguageItem {
  id: string;
  name: string;
  /** Either CEFR string or a free-text label like "Fluent". */
  proficiency: string;
  /** 0–5 numeric for bar/dots visualization (independent of label). */
  level: number;
  visible: boolean;
}
export interface LanguagesSection extends SectionBase<"languages"> {
  items: LanguageItem[];
}

export interface ProjectItem extends DatedItem {
  name: string;
  role: string;
  url?: string;
  /** Free-text comma-separated tech tags, kept as a single string for v1
   *  to keep the editor surface small. */
  techStack: string;
  bullets: Bullet[];
}
export interface ProjectsSection extends SectionBase<"projects"> {
  items: ProjectItem[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expiry?: string;
  credentialId?: string;
  url?: string;
  visible: boolean;
}
export interface CertificationsSection extends SectionBase<"certifications"> {
  items: CertificationItem[];
}

export interface AwardItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  description: string;
  visible: boolean;
}
export interface AwardsSection extends SectionBase<"awards"> {
  items: AwardItem[];
}

export interface PublicationItem {
  id: string;
  title: string;
  authors: string;
  venue: string;
  date: string;
  url?: string;
  visible: boolean;
}
export interface PublicationsSection extends SectionBase<"publications"> {
  items: PublicationItem[];
}

export interface VolunteerItem extends DatedItem {
  organization: string;
  role: string;
  location: string;
  bullets: Bullet[];
}
export interface VolunteerSection extends SectionBase<"volunteer"> {
  items: VolunteerItem[];
}

export interface TalkItem {
  id: string;
  title: string;
  venue: string;
  date: string;
  url?: string;
  visible: boolean;
}
export interface TalksSection extends SectionBase<"talks"> {
  items: TalkItem[];
}

export interface HobbiesSection extends SectionBase<"hobbies"> {
  /** Comma-separated text — the lightest possible representation. */
  items: { id: string; text: string; visible: boolean }[];
}

export interface ReferenceItem {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  visible: boolean;
}
export interface ReferencesSection extends SectionBase<"references"> {
  /** When true, render "References available on request" instead of items. */
  onRequest: boolean;
  items: ReferenceItem[];
}

export interface CustomSection extends SectionBase<"custom"> {
  /** Free-text body. Treated as plain text in v1. */
  body: string;
  /** Optional bullet list under the body. */
  items: Bullet[];
}

/** Discriminated union of every section type. */
export type Section =
  | SummarySection
  | ExperienceSection
  | EducationSection
  | SkillsSection
  | LanguagesSection
  | ProjectsSection
  | CertificationsSection
  | AwardsSection
  | PublicationsSection
  | VolunteerSection
  | TalksSection
  | HobbiesSection
  | ReferencesSection
  | CustomSection;

// ---------- Constants ----------

/** Bumped on backwards-incompatible schema changes. */
export const RESUME_SCHEMA_VERSION = 1;

/** Display labels for each section type — used by the "add section" menu and
 *  the default `title` value when adding a new section. EN labels; the i18n
 *  layer can override these at render time. */
export const SECTION_LABELS: Record<SectionType, string> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  languages: "Languages",
  projects: "Projects",
  certifications: "Certifications",
  awards: "Awards",
  publications: "Publications",
  volunteer: "Volunteer",
  talks: "Talks",
  hobbies: "Hobbies",
  references: "References",
  custom: "Custom",
};
