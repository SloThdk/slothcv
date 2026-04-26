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
 * Keep this in sync with sample-data.ts personas — that file is the
 * authoritative source for what each template looks like out of the box.
 * (We can't import sample-data here because it would create a cycle.) */
export function defaultDesignForTemplate(
  template: import("@/types/resume").TemplateId,
): GlobalDesign {
  const base = defaultDesign();
  switch (template) {
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
    case "berlin":
    case "scratch":
    case "helsinki":
    case "tokyo":
    case "oslo":
    case "madrid":
    case "reykjavik":
    default:
      // Original 7 templates use the slothcv default design (light mode,
      // blue accent, Inter throughout) which is what `defaultDesign()`
      // returns. No per-template tweaks needed.
      return base;
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
    languageStyle: "bar",
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
