/**
 * Default factories for ResumeData and every section type.
 *
 * Splitting these out of the store lets templates, the editor forms, and the
 * dashboard's "create new CV" flow all share the same canonical empty shapes.
 *
 * `nanoid` (12-char URL-safe) generates section/item ids. They're scoped to a
 * single CV's JSONB blob so collisions across CVs don't matter; 12 chars
 * gives us ~7e16 of address space within a single document — overkill, but
 * cheap.
 */

import { nanoid } from "nanoid";
import {
  RESUME_SCHEMA_VERSION,
  SECTION_LABELS,
  type AwardsSection,
  type CertificationsSection,
  type CustomElement,
  type CustomElementKind,
  type CustomSection,
  type EducationSection,
  type ExperienceSection,
  type GlobalDesign,
  type HobbiesSection,
  type LanguagesSection,
  type ProjectsSection,
  type PublicationsSection,
  type ReferencesSection,
  type ResumeData,
  type Section,
  type SectionType,
  type SkillsSection,
  type SummarySection,
  type TalksSection,
  type VolunteerSection,
} from "@/types/resume";

/** Short id helper — keeps the call site terse and centralizes the length. */
export const newId = () => nanoid(12);

/**
 * Per-template "factory design" — the design tokens a CV ships with
 * when first created from each template. Reset Design uses this so
 * users land back on the template's intended look (Aurora's dark mint,
 * Eclipse's amber, Vienna's monochrome) rather than slothcv's blue
 * default.
 *
 * This function is the SINGLE SOURCE OF TRUTH for what each template
 * looks like out of the box. Both:
 *   - The editor's `setTemplate(id)` mutator calls this so picking a
 *     template in the gallery resets the user's design to the template's
 *     intent (the WYSIWYG promise: pick → preview matches the card).
 *   - The landing-page sample-data's `overrideTemplate(...)` calls this
 *     so the gallery card's persona content is rendered with the SAME
 *     design tokens the editor will produce on selection — eliminating
 *     the "thumbnail looks one way, editor looks another" mismatch.
 *
 * Every TemplateId in the registry MUST have an explicit case here. A
 * TemplateId that falls through to `defaultDesign()` will inherit the
 * slothcv blue accent on a white page — which is wrong for any template
 * whose identity is non-blue (so: most of them). The exhaustive switch
 * forces TS to flag a registry/template addition without a design
 * default, preventing the "44 templates, 14 designed, 30 wrong" drift
 * that this function used to have.
 *
 * Templates that hardcode their own `pageBg`/`textColor` via a `themed`
 * const inside the component (Carbon, Midnight, Onyx, Obsidian, Graphite,
 * Notion, Mosaic, Studio, Singapore, Dubai, Atlas, Atelier, Canvas,
 * Heidelberg, Mayfair, Geneva, Zurich, Frankfurt, Scrubs) still benefit
 * from a correct entry here — the user's `accentColor` / fonts / etc. WILL
 * flow through to the parts of the template that aren't part of its
 * locked identity. */
export function defaultDesignForTemplate(
  template: import("@/types/resume").TemplateId,
): GlobalDesign {
  const base = defaultDesign();
  switch (template) {
    // ── Original 7 ─────────────────────────────────────────────────────
    // These ship with the slothcv default look (light mode, blue accent,
    // Inter) — the templates render with whatever `data.design` provides.
    case "scratch":
    case "berlin":
    case "helsinki":
    case "tokyo":
    case "oslo":
    case "madrid":
    case "reykjavik":
      return base;

    // ── Distinct early templates ───────────────────────────────────────
    case "aurora":
      return {
        ...base,
        accentColor: "#7FFAB6",
        secondaryColor: "#94a3b8",
        pageBg: "#0F1419",
        textColor: "#E8EAED",
        titleFont: "Inter",
        bodyFont: "Inter",
        headerStyle: "uppercase",
        skillBarStyle: "pills",
        photo: { enabled: true, shape: "circle", position: "top-right" },
        watermarkText: "CV",
        watermarkPosition: "bottom-left",
        watermarkColor: "#7FFAB6",
      };
    case "eclipse":
      return {
        ...base,
        accentColor: "#F4B860",
        pageBg: "#0E0B08",
        textColor: "#D8D2CA",
        titleFont: "Fraunces",
        bodyFont: "Albert Sans",
        headerStyle: "uppercase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "copenhagen":
      return {
        ...base,
        accentColor: "#1A1A1A",
        secondaryColor: "#737373",
        pageBg: "#FAFAF7",
        textColor: "#1A1A1A",
        titleFont: "Onest",
        bodyFont: "Onest",
        headerStyle: "titlecase",
        photo: { enabled: false, shape: "circle", position: "top-right" },
      };
    case "vienna":
      return {
        ...base,
        accentColor: "#000000",
        pageBg: "#FFFFFF",
        textColor: "#000000",
        titleFont: "Public Sans",
        bodyFont: "Public Sans",
        headerStyle: "uppercase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "manhattan":
      return {
        ...base,
        accentColor: "#0A1F44",
        secondaryColor: "#B8924B",
        pageBg: "#F8F8F6",
        titleFont: "Lora",
        bodyFont: "Inter",
        headerStyle: "uppercase",
        photo: { enabled: true, shape: "square", position: "top-right" },
      };
    case "cambridge":
      return {
        ...base,
        accentColor: "#5C0E1F",
        pageBg: "#FFFFFF",
        textColor: "#1A1A1A",
        titleFont: "EB Garamond",
        bodyFont: "EB Garamond",
        headerStyle: "titlecase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "blank":
      return {
        ...base,
        accentColor: "#0f172a",
        pageBg: "#ffffff",
        textColor: "#0f172a",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };

    // ── Modern minimalist (light, typography-forward) ─────────────────
    case "helvetica":
      return {
        ...base,
        accentColor: "#18181b",
        secondaryColor: "#52525b",
        pageBg: "#ffffff",
        textColor: "#18181b",
        titleFont: "Inter",
        bodyFont: "Inter",
        headerStyle: "underline",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "geist":
      return {
        ...base,
        accentColor: "#000000",
        secondaryColor: "#525252",
        pageBg: "#fafafa",
        textColor: "#000000",
        titleFont: "Inter",
        bodyFont: "Inter",
        headerStyle: "underline",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "notion":
      return {
        ...base,
        accentColor: "#37352f",
        secondaryColor: "#787774",
        pageBg: "#fbfbfa",
        textColor: "#37352f",
        titleFont: "Outfit",
        bodyFont: "Outfit",
        headerStyle: "titlecase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "linear":
      return {
        ...base,
        accentColor: "#5e6ad2",
        secondaryColor: "#6b7280",
        pageBg: "#f8f7f4",
        textColor: "#1f2937",
        titleFont: "Inter",
        bodyFont: "Inter",
        headerStyle: "underline",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "stripe":
      return {
        ...base,
        accentColor: "#635bff",
        secondaryColor: "#6b7280",
        pageBg: "#ffffff",
        textColor: "#0a2540",
        titleFont: "Inter",
        bodyFont: "Inter",
        headerStyle: "titlecase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };

    // ── Dark / editorial ─────────────────────────────────────────────
    case "obsidian":
      return {
        ...base,
        accentColor: "#a78bfa",
        secondaryColor: "#a1a1aa",
        pageBg: "#0a0a0a",
        textColor: "#e5e5e5",
        titleFont: "Fraunces",
        bodyFont: "Inter",
        headerStyle: "uppercase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "carbon":
      return {
        ...base,
        accentColor: "#0f62fe",
        secondaryColor: "#8d8d8d",
        pageBg: "#161616",
        textColor: "#f4f4f4",
        titleFont: "IBM Plex Mono",
        bodyFont: "IBM Plex Mono",
        headerStyle: "uppercase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "midnight":
      return {
        ...base,
        accentColor: "#d4af37",
        secondaryColor: "#bdb6a8",
        pageBg: "#0a1628",
        textColor: "#e8e3d8",
        titleFont: "EB Garamond",
        bodyFont: "EB Garamond",
        headerStyle: "uppercase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "onyx":
      return {
        ...base,
        accentColor: "#e879f9",
        secondaryColor: "#a1a1aa",
        pageBg: "#09090b",
        textColor: "#fafafa",
        titleFont: "Fraunces",
        bodyFont: "Inter",
        headerStyle: "uppercase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "graphite":
      return {
        ...base,
        accentColor: "#44403c",
        secondaryColor: "#78716c",
        pageBg: "#fafaf9",
        textColor: "#292524",
        titleFont: "Onest",
        bodyFont: "Onest",
        headerStyle: "uppercase",
        photo: { enabled: true, shape: "square", position: "top-left" },
      };

    // ── Sidebar / two-column ─────────────────────────────────────────
    case "geneva":
      return {
        ...base,
        accentColor: "#1e3a8a",
        secondaryColor: "#475569",
        pageBg: "#ffffff",
        textColor: "#0f172a",
        titleFont: "Source Serif 4",
        bodyFont: "Inter",
        headerStyle: "uppercase",
        photo: { enabled: true, shape: "square", position: "top-right" },
      };
    case "zurich":
      return {
        ...base,
        accentColor: "#334155",
        secondaryColor: "#64748b",
        pageBg: "#ffffff",
        textColor: "#0f172a",
        titleFont: "Manrope",
        bodyFont: "Manrope",
        headerStyle: "uppercase",
        photo: { enabled: true, shape: "square", position: "top-left" },
      };
    case "frankfurt":
      return {
        ...base,
        accentColor: "#171717",
        secondaryColor: "#525252",
        pageBg: "#fafafa",
        textColor: "#171717",
        titleFont: "Inter",
        bodyFont: "Inter",
        headerStyle: "uppercase",
        photo: { enabled: true, shape: "square", position: "top-left" },
      };
    case "singapore":
      return {
        ...base,
        accentColor: "#dc2626",
        secondaryColor: "#78716c",
        pageBg: "#fffbeb",
        textColor: "#1c1917",
        titleFont: "Onest",
        bodyFont: "Source Serif 4",
        headerStyle: "uppercase",
        photo: { enabled: true, shape: "square", position: "top-right" },
      };
    case "dubai":
      return {
        ...base,
        accentColor: "#c9a449",
        secondaryColor: "#bdb6a8",
        pageBg: "#0e1a3a",
        textColor: "#e7d9b8",
        titleFont: "EB Garamond",
        bodyFont: "EB Garamond",
        headerStyle: "uppercase",
        photo: { enabled: false, shape: "circle", position: "top-right" },
      };

    // ── Bento / grid / dashboard ─────────────────────────────────────
    case "bento":
      return {
        ...base,
        accentColor: "#ea580c",
        secondaryColor: "#78716c",
        pageBg: "#f5f5f4",
        textColor: "#1c1917",
        titleFont: "Manrope",
        bodyFont: "Manrope",
        headerStyle: "titlecase",
        photo: { enabled: true, shape: "circle", position: "top-left" },
      };
    case "mosaic":
      return {
        ...base,
        accentColor: "#0891b2",
        secondaryColor: "#64748b",
        pageBg: "#ffffff",
        textColor: "#0f172a",
        titleFont: "Outfit",
        bodyFont: "Inter",
        headerStyle: "titlecase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "dashboard":
      return {
        ...base,
        accentColor: "#059669",
        secondaryColor: "#475569",
        pageBg: "#ffffff",
        textColor: "#0f172a",
        titleFont: "Inter",
        bodyFont: "Inter",
        headerStyle: "uppercase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "atlas":
      return {
        ...base,
        accentColor: "#0369a1",
        secondaryColor: "#78716c",
        pageBg: "#fefdf8",
        textColor: "#1c1917",
        titleFont: "Lora",
        bodyFont: "Inter",
        headerStyle: "titlecase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "heidelberg":
      return {
        ...base,
        accentColor: "#7c2d12",
        secondaryColor: "#78716c",
        pageBg: "#fefdfb",
        textColor: "#1c1917",
        titleFont: "EB Garamond",
        bodyFont: "EB Garamond",
        headerStyle: "titlecase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };

    // ── Academic ─────────────────────────────────────────────────────
    case "boston":
      return {
        ...base,
        accentColor: "#7f1d1d",
        secondaryColor: "#525252",
        pageBg: "#ffffff",
        textColor: "#171717",
        titleFont: "EB Garamond",
        bodyFont: "EB Garamond",
        headerStyle: "titlecase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "stanford":
      return {
        ...base,
        accentColor: "#8c1515",
        secondaryColor: "#525252",
        pageBg: "#ffffff",
        textColor: "#171717",
        titleFont: "EB Garamond",
        bodyFont: "Inter",
        headerStyle: "underline",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };

    // ── Executive / finance ──────────────────────────────────────────
    case "madison":
      return {
        ...base,
        accentColor: "#1e3a8a",
        secondaryColor: "#d4af37",
        pageBg: "#ffffff",
        textColor: "#1e3a8a",
        titleFont: "Lora",
        bodyFont: "Source Serif 4",
        headerStyle: "uppercase",
        photo: { enabled: false, shape: "square", position: "top-right" },
      };
    case "mayfair":
      return {
        ...base,
        accentColor: "#7e1d1d",
        secondaryColor: "#78716c",
        pageBg: "#fdfaf6",
        textColor: "#1c1917",
        titleFont: "Playfair Display",
        bodyFont: "Lora",
        headerStyle: "titlecase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "davos":
      return {
        ...base,
        accentColor: "#0c0a09",
        secondaryColor: "#78716c",
        pageBg: "#fafaf9",
        textColor: "#0c0a09",
        titleFont: "Inter",
        bodyFont: "Inter",
        headerStyle: "uppercase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };

    // ── Creative / portfolio ─────────────────────────────────────────
    case "atelier":
      return {
        ...base,
        accentColor: "#451a03",
        secondaryColor: "#a8a29e",
        pageBg: "#fdf6e3",
        textColor: "#451a03",
        titleFont: "Fraunces",
        bodyFont: "Inter",
        headerStyle: "titlecase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "studio":
      return {
        ...base,
        accentColor: "#0a0a0a",
        secondaryColor: "#525252",
        pageBg: "#fafafa",
        textColor: "#0a0a0a",
        titleFont: "Inter",
        bodyFont: "Inter",
        headerStyle: "uppercase",
        photo: { enabled: true, shape: "square", position: "top-right" },
      };
    case "canvas":
      return {
        ...base,
        accentColor: "#0e7490",
        secondaryColor: "#78716c",
        pageBg: "#fcfbf7",
        textColor: "#1c1917",
        titleFont: "Lora",
        bodyFont: "Inter",
        headerStyle: "titlecase",
        photo: { enabled: true, shape: "circle", position: "top-left" },
      };

    // ── Industry-specific ────────────────────────────────────────────
    case "scrubs":
      return {
        ...base,
        accentColor: "#0e7490",
        secondaryColor: "#475569",
        pageBg: "#ffffff",
        textColor: "#0f172a",
        titleFont: "Source Serif 4",
        bodyFont: "Inter",
        headerStyle: "uppercase",
        photo: { enabled: false, shape: "circle", position: "top-left" },
      };
    case "founder":
      return {
        ...base,
        accentColor: "#6d28d9",
        secondaryColor: "#64748b",
        pageBg: "#ffffff",
        textColor: "#0f172a",
        titleFont: "Fraunces",
        bodyFont: "Inter",
        headerStyle: "uppercase",
        photo: { enabled: true, shape: "square", position: "top-right" },
      };

    // ── Visual / executive expansion (late 2026) ───────────────────────
    case "capitol":
      return {
        ...base,
        accentColor: "#1e3a8a",
        secondaryColor: "#475569",
        pageBg: "#ffffff",
        textColor: "#0f172a",
        titleFont: "Inter",
        bodyFont: "Inter",
        headerStyle: "uppercase",
        skillBarStyle: "bar",
        photo: { enabled: true, shape: "circle", position: "top-left" },
      };
    case "vesterbro":
      return {
        ...base,
        accentColor: "#2563eb",
        secondaryColor: "#64748b",
        pageBg: "#fdfdfb",
        textColor: "#0f172a",
        titleFont: "Inter",
        bodyFont: "Inter",
        headerStyle: "titlecase",
        skillBarStyle: "dots",
        languageStyle: "dots",
        photo: { enabled: true, shape: "circle", position: "top-center" },
      };
    case "marina":
      return {
        ...base,
        accentColor: "#0f766e",
        secondaryColor: "#475569",
        pageBg: "#ffffff",
        textColor: "#0f172a",
        titleFont: "Inter",
        bodyFont: "Inter",
        headerStyle: "uppercase",
        skillBarStyle: "bar",
        photo: { enabled: true, shape: "circle", position: "top-left" },
      };
  }
}

/** Pristine global design tokens — readable, conservative defaults. */
export function defaultDesign(): GlobalDesign {
  return {
    accentColor: "#2563eb", // tailwind blue-600
    secondaryColor: "#475569", // slate-600
    pageBg: "#ffffff",
    textColor: "#0f172a", // slate-900
    titleFont: "Inter",
    bodyFont: "Inter",
    fontScale: 1.0,
    lineSpacing: 1.4,
    letterSpacing: "normal",
    layout: "single",
    sidebarWidth: 0.32,
    pageMargin: "normal",
    photo: { enabled: false, shape: "circle", position: "top-left" },
    sectionIcons: false,
    iconSet: "lucide",
    bulletStyle: "disc",
    dividerStyle: "line",
    headerStyle: "uppercase",
    skillBarStyle: "bar",
    // languageStyle "bar" only renders the 0-5 level — typed proficiency
    // text (C1 / B2 / "Fluent") wouldn't appear, leading users to think
    // the proficiency input was dead. "text" shows the typed value
    // immediately. Templates that want a level visualisation can opt in
    // via a per-template default in `defaultDesignForTemplate`.
    languageStyle: "text",
    dateFormat: "Mon YYYY",
    pageSize: "A4",
    multiPage: true,
    watermarkText: "",
    watermarkPosition: "off",
    watermarkColor: "",
  };
}

/** Build an empty section of the requested type. */
export function defaultSection(type: SectionType): Section {
  const base = {
    id: newId(),
    title: SECTION_LABELS[type],
    visible: true,
  } as const;

  switch (type) {
    case "summary": {
      const s: SummarySection = { ...base, type, body: "" };
      return s;
    }
    case "experience": {
      const s: ExperienceSection = { ...base, type, items: [] };
      return s;
    }
    case "education": {
      const s: EducationSection = { ...base, type, items: [] };
      return s;
    }
    case "skills": {
      const s: SkillsSection = { ...base, type, items: [] };
      return s;
    }
    case "languages": {
      const s: LanguagesSection = { ...base, type, items: [] };
      return s;
    }
    case "projects": {
      const s: ProjectsSection = { ...base, type, items: [] };
      return s;
    }
    case "certifications": {
      const s: CertificationsSection = { ...base, type, items: [] };
      return s;
    }
    case "awards": {
      const s: AwardsSection = { ...base, type, items: [] };
      return s;
    }
    case "publications": {
      const s: PublicationsSection = { ...base, type, items: [] };
      return s;
    }
    case "volunteer": {
      const s: VolunteerSection = { ...base, type, items: [] };
      return s;
    }
    case "talks": {
      const s: TalksSection = { ...base, type, items: [] };
      return s;
    }
    case "hobbies": {
      const s: HobbiesSection = { ...base, type, items: [] };
      return s;
    }
    case "references": {
      const s: ReferencesSection = {
        ...base,
        type,
        onRequest: true,
        items: [],
      };
      return s;
    }
    case "custom": {
      const s: CustomSection = { ...base, type, body: "", items: [] };
      return s;
    }
  }
}

/** Default item factories for each "items"-bearing section. Returned values
 *  are typed loosely as objects because callers immediately spread them into
 *  the parent section's typed array. */
export function defaultExperienceItem() {
  return {
    id: newId(),
    company: "",
    role: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    visible: true,
    bullets: [],
  };
}

export function defaultEducationItem() {
  return {
    id: newId(),
    institution: "",
    degree: "",
    field: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    visible: true,
    bullets: [],
  };
}

export function defaultProjectItem() {
  return {
    id: newId(),
    name: "",
    role: "",
    url: "",
    techStack: "",
    startDate: "",
    endDate: "",
    current: false,
    visible: true,
    bullets: [],
  };
}

export function defaultVolunteerItem() {
  return {
    id: newId(),
    organization: "",
    role: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    visible: true,
    bullets: [],
  };
}

export function defaultBullet() {
  return { id: newId(), text: "", visible: true };
}

export function defaultSkillItem() {
  return { id: newId(), name: "", level: 0, group: "Skills", visible: true };
}

export function defaultLanguageItem() {
  return { id: newId(), name: "", proficiency: "", level: 0, visible: true };
}

export function defaultCertificationItem() {
  return {
    id: newId(),
    name: "",
    issuer: "",
    date: "",
    expiry: "",
    credentialId: "",
    url: "",
    visible: true,
  };
}

export function defaultAwardItem() {
  return {
    id: newId(),
    name: "",
    issuer: "",
    date: "",
    description: "",
    visible: true,
  };
}

export function defaultPublicationItem() {
  return {
    id: newId(),
    title: "",
    authors: "",
    venue: "",
    date: "",
    url: "",
    visible: true,
  };
}

export function defaultTalkItem() {
  return { id: newId(), title: "", venue: "", date: "", url: "", visible: true };
}

export function defaultReferenceItem() {
  return {
    id: newId(),
    name: "",
    role: "",
    company: "",
    email: "",
    phone: "",
    visible: true,
  };
}

export function defaultHobbyItem() {
  return { id: newId(), text: "", visible: true };
}

export function defaultPersonalLink() {
  return { id: newId(), label: "Website", url: "" };
}

/**
 * Factory for a fresh toolshelf element. Default sizes / colours are
 * tuned so a click on any "+" button in the toolshelf produces something
 * immediately visible on an A4 canvas (~794×1123 @96dpi). The caller
 * passes in the next free `z` so the new element lands on top.
 */
export function defaultCustomElement(
  kind: CustomElementKind,
  z: number,
): CustomElement {
  const base = {
    id: newId(),
    x: 80,
    y: 80,
    z,
    visible: true,
    opacity: 1,
  };
  switch (kind) {
    case "rect":
      return {
        ...base,
        kind: "rect",
        w: 200,
        h: 120,
        fill: "#2563eb",
        radius: 8,
      };
    case "ellipse":
      return {
        ...base,
        kind: "ellipse",
        w: 160,
        h: 160,
        fill: "#2563eb",
      };
    case "triangle":
      return {
        ...base,
        kind: "triangle",
        w: 160,
        h: 140,
        fill: "#2563eb",
      };
    case "star":
      return {
        ...base,
        kind: "star",
        w: 160,
        h: 160,
        fill: "#f59e0b",
      };
    case "hexagon":
      return {
        ...base,
        kind: "hexagon",
        w: 160,
        h: 140,
        fill: "#10b981",
      };
    case "arrow":
      return {
        ...base,
        kind: "arrow",
        w: 200,
        h: 60,
        fill: "#0f172a",
      };
    case "heart":
      return { ...base, kind: "heart", w: 140, h: 130, fill: "#ef4444" };
    case "diamond":
      return { ...base, kind: "diamond", w: 140, h: 140, fill: "#0ea5e9" };
    case "octagon":
      return { ...base, kind: "octagon", w: 150, h: 150, fill: "#6366f1" };
    case "cross":
      return { ...base, kind: "cross", w: 130, h: 130, fill: "#dc2626" };
    case "sparkle":
      return { ...base, kind: "sparkle", w: 120, h: 120, fill: "#f59e0b" };
    case "line":
      return {
        ...base,
        kind: "line",
        // Render as a horizontal line by default — w is length, thickness is
        // independent of `h` (which still bounds the click target).
        w: 240,
        h: 4,
        color: "#0f172a",
        thickness: 2,
      };
    case "text":
      return {
        ...base,
        kind: "text",
        w: 280,
        h: 40,
        text: "Double-click to edit",
        fontSize: 18,
        fontWeight: 500,
        color: "#0f172a",
        align: "left",
      };
    case "image":
      return {
        ...base,
        kind: "image",
        w: 200,
        h: 200,
        url: "",
        fit: "cover",
        radius: 8,
      };
    case "icon":
      // Social-icon glyph — the toolshelf's social-icon palette overrides
      // `iconName` + `color` via the addCustomElement(init) channel so
      // each card stamps the right brand. The default here (LinkedIn
      // brand color) is a fallback for callers that don't pass init —
      // shouldn't happen in normal flow, but a sensible default beats
      // an empty box if a caller forgets the init.
      return {
        ...base,
        kind: "icon",
        // 48 px is the canonical "social-icon button" size — small
        // enough to fit a row of 4-5 icons in a header band, large
        // enough to read at A4 print resolution.
        w: 48,
        h: 48,
        iconName: "linkedin",
        color: "#0A66C2",
      };
  }
}

/** Build a fresh, empty CV with sensible starter sections. */
export function defaultResumeData(): ResumeData {
  return {
    meta: {
      template: "berlin",
      language: "en",
      version: RESUME_SCHEMA_VERSION,
    },
    design: defaultDesign(),
    personal: {
      fullName: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
      links: [],
    },
    sections: [
      defaultSection("summary"),
      defaultSection("experience"),
      defaultSection("education"),
      defaultSection("skills"),
    ],
  };
}
