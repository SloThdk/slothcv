/**
 * Sample resume content used for the marketing landing-page gallery and the
 * in-editor template gallery thumbnails.
 *
 * Each template gets its **own persona** rather than sharing one — when seven
 * cards in a gallery all show the same person doing the same job, the only
 * thing that visually differentiates them is the accent color. Different
 * personas instantly communicate "this template is for designers / for
 * engineers / for academics / etc.".
 *
 * The personas:
 *   - scratch    Generic developer, no photo, neutral.
 *   - berlin     Senior product designer with photo + sidebar.
 *   - helsinki   Editor / journalist, no photo, typography-forward.
 *   - tokyo      Software engineer, photo top-center, dense two-column.
 *   - oslo       Lawyer, no photo, conservative serif, ATS-bulletproof.
 *   - madrid     Creative director, photo on full-bleed accent header.
 *   - reykjavik  PhD researcher, no photo, publications-prominent.
 *
 * Avatars are rendered inline as SVG data URIs — no external image hosting,
 * no remotePatterns config, scales crisp at any zoom.
 */

import {
  RESUME_SCHEMA_VERSION,
  type ResumeData,
  type Section,
  type TemplateId,
} from "@/types/resume";
import { defaultDesign } from "@/lib/resume-defaults";

// ---------------------------------------------------------------------------
// Avatar generation
// ---------------------------------------------------------------------------

/**
 * Generate an inline SVG data URI for a circular initials-on-color avatar.
 * Uses the persona's accent color as the disc background.
 *
 * Why inline SVG (not an image asset)? It's <1 KB per avatar, scales without
 * compression artifacts at every zoom level the gallery uses, and avoids the
 * remotePatterns / external hosting tax we'd pay for `<Image src="...">`.
 */
function avatarSvg(initials: string, bg: string, fg: string): string {
  const safe = initials.slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <rect width="64" height="64" rx="32" fill="${bg}"/>
    <text x="32" y="40" text-anchor="middle" font-family="Inter,system-ui,sans-serif"
          font-size="26" font-weight="600" fill="${fg}">${safe}</text>
  </svg>`;
  // base64-encode so the URI is portable across <img>, react-pdf, and CSS bg.
  // btoa is present in browser + node 18+; in static-export prerender we run
  // under node, so this is safe at module-load.
  return `data:image/svg+xml;base64,${typeof btoa === "function" ? btoa(svg) : Buffer.from(svg).toString("base64")}`;
}

// ---------------------------------------------------------------------------
// Top-level
// ---------------------------------------------------------------------------

/**
 * Return a populated `ResumeData` for the given template's persona. The base
 * factory below switches on `template` to dispatch to the persona-specific
 * builder; each persona builder owns both the design tweaks AND the content.
 */
export function sampleResumeData(template: TemplateId): ResumeData {
  switch (template) {
    case "scratch":
      return scratchPersona();
    case "berlin":
      return berlinPersona();
    case "helsinki":
      return helsinkiPersona();
    case "tokyo":
      return tokyoPersona();
    case "oslo":
      return osloPersona();
    case "madrid":
      return madridPersona();
    case "reykjavik":
      return reykjavikPersona();
    case "aurora":
      return auroraPersona();
    case "eclipse":
      return eclipsePersona();
    case "copenhagen":
      return copenhagenPersona();
    case "vienna":
      return viennaPersona();
    case "manhattan":
      return manhattanPersona();
    case "cambridge":
      return cambridgePersona();
    case "blank":
      return blankPersona();
    // ── Mid-2026 expansion: map each new template to the
    //    category-appropriate existing persona so the gallery shows
    //    genuinely distinct content per industry-fit, not Sam Carter
    //    (the scratch default) on all 30 cards.
    //
    //    Modern minimalist + dark editorial → Aurora's senior-eng persona
    //    Sidebar / two-col → Manhattan's exec persona
    //    Bento / dashboard → Madrid's creative persona
    //    Academic → Cambridge's PhD persona
    //    Executive / finance → Manhattan persona
    //    Creative / portfolio → Madrid persona
    //    Industry → mapped to closest fit
    //
    //    Each new persona override only swaps the design TEMPLATE id so
    //    the CONTENT comes from the chosen base persona but the LAYOUT
    //    is dispatched to the new template's component. Without this
    //    override, Aurora's persona has `meta.template = "aurora"` and
    //    the renderer would route to Aurora regardless.
    case "helvetica":
    case "geist":
    case "linear":
    case "stripe":
      return overrideTemplate(auroraPersona(), template);
    case "notion":
      return overrideTemplate(helsinkiPersona(), template);
    case "obsidian":
    case "carbon":
    case "midnight":
    case "onyx":
    case "graphite":
      return overrideTemplate(eclipsePersona(), template);
    case "geneva":
    case "zurich":
    case "frankfurt":
    case "singapore":
    case "dubai":
    case "madison":
    case "mayfair":
    case "davos":
      return overrideTemplate(manhattanPersona(), template);
    case "bento":
    case "mosaic":
    case "dashboard":
    case "atlas":
      return overrideTemplate(madridPersona(), template);
    case "heidelberg":
    case "boston":
    case "stanford":
      return overrideTemplate(cambridgePersona(), template);
    case "atelier":
    case "studio":
    case "canvas":
      return overrideTemplate(madridPersona(), template);
    case "scrubs":
      return overrideTemplate(reykjavikPersona(), template);
    case "founder":
      return overrideTemplate(berlinPersona(), template);
  }
}

/** Re-stamp a persona's `meta.template` so it dispatches to the requested
 *  layout. We can't just feed Aurora's persona to the Helvetica renderer
 *  directly — TemplateRenderer reads `data.meta.template` to switch, so
 *  the template id has to match the desired layout. */
function overrideTemplate(base: ResumeData, target: TemplateId): ResumeData {
  return { ...base, meta: { ...base.meta, template: target } };
}

/** Eclipse — dark editorial. Reuses Aurora's persona but with a warm
 *  amber palette so the typography flip (Fraunces serif vs Inter sans)
 *  has matching mood. Same content for now; we can fork the persona
 *  later if Eclipse warrants its own voice. */
function eclipsePersona(): ResumeData {
  const base = auroraPersona();
  return {
    ...base,
    meta: { ...base.meta, template: "eclipse" },
    design: {
      ...base.design,
      accentColor: "#F4B860",
      pageBg: "#0E0B08",
      textColor: "#D8D2CA",
      titleFont: "Fraunces",
      bodyFont: "Albert Sans",
      headerStyle: "uppercase",
      photo: { enabled: false, shape: "circle", position: "top-left" },
      watermarkText: "",
      watermarkPosition: "off",
    },
  };
}

/** Copenhagen — Scandinavian minimal. Reuses Berlin persona content
 *  but kills color and switches to Onest. */
function copenhagenPersona(): ResumeData {
  const base = berlinPersona();
  return {
    ...base,
    meta: { ...base.meta, template: "copenhagen" },
    design: {
      ...base.design,
      accentColor: "#1A1A1A",
      secondaryColor: "#737373",
      pageBg: "#FAFAF7",
      textColor: "#1A1A1A",
      titleFont: "Onest",
      bodyFont: "Onest",
      headerStyle: "titlecase",
      photo: { enabled: false, shape: "circle", position: "top-right" },
    },
  };
}

/** Vienna — high-contrast monochrome ATS-perfect. */
function viennaPersona(): ResumeData {
  const base = osloPersona();
  return {
    ...base,
    meta: { ...base.meta, template: "vienna" },
    design: {
      ...base.design,
      accentColor: "#000000",
      secondaryColor: "#000000",
      pageBg: "#FFFFFF",
      textColor: "#000000",
      titleFont: "Public Sans",
      bodyFont: "Public Sans",
      headerStyle: "uppercase",
      photo: { enabled: false, shape: "circle", position: "top-left" },
    },
  };
}

/** Manhattan — corporate executive. */
function manhattanPersona(): ResumeData {
  const base = berlinPersona();
  return {
    ...base,
    meta: { ...base.meta, template: "manhattan" },
    design: {
      ...base.design,
      accentColor: "#0A1F44",
      secondaryColor: "#B8924B",
      pageBg: "#F8F8F6",
      textColor: "#1A1A1A",
      titleFont: "Lora",
      bodyFont: "Inter",
      headerStyle: "uppercase",
      photo: { enabled: true, shape: "square", position: "top-right" },
    },
  };
}

/** Cambridge — academic. */
function cambridgePersona(): ResumeData {
  const base = reykjavikPersona();
  return {
    ...base,
    meta: { ...base.meta, template: "cambridge" },
    design: {
      ...base.design,
      accentColor: "#5C0E1F",
      secondaryColor: "#525252",
      pageBg: "#FFFFFF",
      textColor: "#1A1A1A",
      titleFont: "EB Garamond",
      bodyFont: "EB Garamond",
      headerStyle: "titlecase",
      photo: { enabled: false, shape: "circle", position: "top-left" },
    },
  };
}

/**
 * Blank — an empty A4 with NO baked content. The "Add" tab toolshelf is
 * the only way the user puts anything on the page. Returning a totally
 * minimal ResumeData (empty personal, zero sections) means the canvas
 * truly starts blank.
 */
function blankPersona(): ResumeData {
  return {
    meta: { template: "blank", language: "en", version: 1 },
    design: {
      ...defaultDesign(),
      accentColor: "#0f172a",
      pageBg: "#ffffff",
      textColor: "#0f172a",
      photo: { enabled: false, shape: "circle", position: "top-left" },
    },
    personal: {
      fullName: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
      links: [],
    },
    sections: [],
    customElements: [],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bullet(text: string, idSuffix: string): {
  id: string;
  text: string;
  visible: boolean;
} {
  return { id: `b-${idSuffix}`, text, visible: true };
}

/**
 * Build the meta + design for a persona. Wraps the default design and
 * overrides only the fields the persona cares about, so future global
 * default changes don't break per-persona styling unintentionally.
 */
function buildShell(
  template: TemplateId,
  designOverrides: Partial<ResumeData["design"]>,
): Pick<ResumeData, "meta" | "design"> {
  return {
    meta: {
      template,
      language: "en",
      version: RESUME_SCHEMA_VERSION,
    },
    design: { ...defaultDesign(), ...designOverrides },
  };
}

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

/**
 * Scratch — generic engineer / developer, no photo, neutral palette.
 * Showcases the "blank canvas" idea: just type, no opinionated styling.
 */
function scratchPersona(): ResumeData {
  const shell = buildShell("scratch", {
    accentColor: "#0f172a",
    layout: "single",
    headerStyle: "uppercase",
    photo: { enabled: false, shape: "circle", position: "top-left" },
  });
  return {
    ...shell,
    personal: {
      fullName: "Sam Carter",
      headline: "Software Developer",
      email: "sam.carter@example.com",
      phone: "+45 22 17 04 11",
      location: "Aarhus, DK",
      photoUrl: avatarSvg("SC", "#e2e8f0", "#0f172a"),
      links: [
        { id: "scrat1", label: "github.com/samc", url: "https://github.com/samc" },
      ],
    },
    sections: [
      summary(
        "Backend developer, 5 years, comfortable across Go, TypeScript and Postgres. Likes APIs that read like prose.",
      ),
      experience(
        {
          role: "Software Developer",
          company: "Greenline",
          location: "Aarhus",
          start: "2021-06",
          end: "",
          current: true,
          bullets: [
            "Owned the billing API rewrite — cut p95 latency from 380 ms to 60 ms.",
            "Mentored two juniors; both promoted within 18 months.",
          ],
        },
        {
          role: "Junior Developer",
          company: "Velkomin Apps",
          location: "Aarhus",
          start: "2019-08",
          end: "2021-05",
          current: false,
          bullets: ["Shipped 12 client integrations across REST + gRPC."],
        },
      ),
      education({
        institution: "Aarhus University",
        degree: "BSc",
        field: "Computer Science",
        location: "Aarhus",
        start: "2016",
        end: "2019",
      }),
      skills(
        ["Go", "TypeScript", "Postgres", "Kubernetes", "Stripe API"],
        "Tech",
      ),
    ],
  };
}

/**
 * Berlin — senior product designer, sidebar layout with photo, blue accent.
 * The flagship "modern with photo" template.
 */
function berlinPersona(): ResumeData {
  const shell = buildShell("berlin", {
    accentColor: "#2563eb",
    layout: "sidebar-left",
    headerStyle: "uppercase",
    photo: { enabled: true, shape: "circle", position: "sidebar" },
  });
  return {
    ...shell,
    personal: {
      fullName: "Alex Lindgren",
      headline: "Senior Product Designer",
      email: "alex@example.com",
      phone: "+45 22 33 44 55",
      location: "Copenhagen, DK",
      photoUrl: "/sample-photos/berlin.webp",
      links: [
        { id: "be1", label: "alex.design", url: "https://alex.design" },
        { id: "be2", label: "linkedin.com/in/alex", url: "https://linkedin.com/in/alex" },
      ],
    },
    sections: [
      summary(
        "Product designer with 7 years across SaaS, fintech and EU public-sector tools. I ship end-to-end — research, prototype, hand-off.",
      ),
      experience(
        {
          role: "Senior Product Designer",
          company: "Northwind",
          location: "Copenhagen",
          start: "2023-02",
          end: "",
          current: true,
          bullets: [
            "Led the merchant dashboard redesign, lifting weekly active rate +28%.",
            "Established the design system; migrated 32 surfaces in eight weeks.",
          ],
        },
        {
          role: "Product Designer",
          company: "Holm & Co",
          location: "Aarhus",
          start: "2020-08",
          end: "2023-01",
          current: false,
          bullets: [
            "Self-serve onboarding flow cut sales-touch time by 41%.",
          ],
        },
      ),
      education({
        institution: "Aarhus University",
        degree: "MA",
        field: "Information Studies",
        location: "Aarhus",
        start: "2016",
        end: "2018",
      }),
      skills(
        ["Figma", "Prototyping", "User research", "Design systems", "HTML/CSS"],
        "Design",
      ),
      languages([
        { name: "English", proficiency: "Native", level: 5 },
        { name: "Danish", proficiency: "C1", level: 4 },
        { name: "German", proficiency: "B1", level: 2 },
      ]),
    ],
  };
}

/**
 * Helsinki — editor / journalist, single column, no photo, dense narrative.
 * Sells the "typography does the work" pitch: minimal chrome, copy on display.
 */
function helsinkiPersona(): ResumeData {
  const shell = buildShell("helsinki", {
    accentColor: "#0a0a0a",
    layout: "single",
    headerStyle: "underline",
    dividerStyle: "line",
    bodyFont: "Merriweather",
    titleFont: "Playfair Display",
    photo: { enabled: false, shape: "square", position: "top-left" },
  });
  return {
    ...shell,
    personal: {
      fullName: "Marit Andersen",
      headline: "Editor & Long-Form Journalist",
      email: "marit@example.com",
      phone: "+47 90 11 22 33",
      location: "Oslo, NO",
      links: [
        { id: "he1", label: "maritandersen.no", url: "https://maritandersen.no" },
      ],
    },
    sections: [
      summary(
        "Twelve years editing reportage at the intersection of culture, climate and politics. Bylines in The Atlantic, Aftenposten, Granta.",
      ),
      experience(
        {
          role: "Senior Editor, Long-Form",
          company: "Aftenposten Magasin",
          location: "Oslo",
          start: "2019-09",
          end: "",
          current: true,
          bullets: [
            "Commissioned the European Press Prize–winning series on Arctic shipping.",
            "Mentor for the magazine's emerging-writers programme since 2021.",
          ],
        },
        {
          role: "Staff Writer",
          company: "Morgenbladet",
          location: "Oslo",
          start: "2014-01",
          end: "2019-08",
          current: false,
          bullets: ["Long-form features on housing, migration, regional politics."],
        },
      ),
      education({
        institution: "University of Oslo",
        degree: "MA",
        field: "Comparative Literature",
        location: "Oslo",
        start: "2010",
        end: "2013",
      }),
      languages([
        { name: "Norwegian", proficiency: "Native", level: 5 },
        { name: "English", proficiency: "C2", level: 5 },
        { name: "French", proficiency: "B2", level: 3 },
      ]),
    ],
  };
}

/**
 * Tokyo — software engineer, two-column dense, photo top-center, rose accent.
 * The "lots of skills + projects" template — packs the page tightly.
 */
function tokyoPersona(): ResumeData {
  const shell = buildShell("tokyo", {
    accentColor: "#e11d48",
    layout: "two-col",
    headerStyle: "accent-block",
    photo: { enabled: true, shape: "rounded", position: "top-center" },
  });
  return {
    ...shell,
    personal: {
      fullName: "Ravi Patel",
      headline: "Staff Software Engineer",
      email: "ravi.patel@example.com",
      phone: "+44 20 7946 0958",
      location: "London, UK",
      photoUrl: "/sample-photos/tokyo.webp",
      links: [
        { id: "tk1", label: "github.com/rpatel", url: "https://github.com/rpatel" },
        { id: "tk2", label: "rpatel.dev", url: "https://rpatel.dev" },
      ],
    },
    sections: [
      summary(
        "Distributed-systems engineer focused on storage and consensus. 9 years, mostly Go and Rust, occasional dabbling in Zig.",
      ),
      experience(
        {
          role: "Staff Engineer",
          company: "Vesper Labs",
          location: "London",
          start: "2022-04",
          end: "",
          current: true,
          bullets: [
            "Designed the multi-region consensus layer powering 800k+ writes/sec.",
            "Wrote the chaos-testing framework that's now open-source.",
          ],
        },
        {
          role: "Senior Engineer",
          company: "Helio",
          location: "Cambridge",
          start: "2017-06",
          end: "2022-03",
          current: false,
          bullets: ["Owned the storage engine — 4× throughput on the same hardware."],
        },
      ),
      education({
        institution: "University of Cambridge",
        degree: "MEng",
        field: "Computer Science",
        location: "Cambridge",
        start: "2013",
        end: "2017",
      }),
      skills(
        ["Go", "Rust", "Distributed systems", "Postgres", "Kubernetes", "gRPC", "OpenTelemetry", "Linux internals"],
        "Tech",
      ),
      projects([
        {
          name: "vesper-chaos",
          role: "Author",
          url: "github.com/rpatel/vesper-chaos",
          start: "2024",
          techStack: "Rust · Tokio",
          bullet: "Open-source fault-injection harness; 4.2k★.",
        },
      ]),
    ],
  };
}

/**
 * Oslo — lawyer, classic serif, no photo, ATS-bulletproof.
 * Conservative for clients who hate stylistic risk.
 */
function osloPersona(): ResumeData {
  const shell = buildShell("oslo", {
    accentColor: "#854d0e",
    pageBg: "#fefce8",
    bodyFont: "Lora",
    titleFont: "Lora",
    headerStyle: "titlecase",
    photo: { enabled: false, shape: "square", position: "top-left" },
  });
  return {
    ...shell,
    personal: {
      fullName: "Elena Kovač",
      headline: "Senior Associate, Corporate Law",
      email: "elena.kovac@example.com",
      phone: "+385 1 555 0123",
      location: "Zagreb, HR",
      links: [
        { id: "os1", label: "linkedin.com/in/ekovac", url: "https://linkedin.com/in/ekovac" },
      ],
    },
    sections: [
      summary(
        "Cross-border M&A and capital markets practitioner. EU and Croatian bar admission. Recent transactions north of EUR 1.5B in aggregate.",
      ),
      experience(
        {
          role: "Senior Associate",
          company: "Kovač & Partners",
          location: "Zagreb",
          start: "2020-09",
          end: "",
          current: true,
          bullets: [
            "Lead counsel on the Adriatic Maritime IPO (Zagreb Stock Exchange, 2024).",
            "Drafted the firm's standard SPA + W&I templates now used across the EU practice.",
          ],
        },
        {
          role: "Associate",
          company: "Linklaters LLP",
          location: "London",
          start: "2017-02",
          end: "2020-08",
          current: false,
          bullets: ["Cross-border M&A and ECM in CEE region."],
        },
      ),
      education({
        institution: "University of Zagreb",
        degree: "JD",
        field: "Law",
        location: "Zagreb",
        start: "2011",
        end: "2016",
      }),
      certifications([
        { name: "Croatian Bar Association", issuer: "Croatian Bar", date: "2017" },
        { name: "Solicitor of England & Wales", issuer: "SRA", date: "2019" },
      ]),
      languages([
        { name: "Croatian", proficiency: "Native", level: 5 },
        { name: "English", proficiency: "C2", level: 5 },
        { name: "German", proficiency: "C1", level: 4 },
      ]),
    ],
  };
}

/**
 * Madrid — creative director, full-bleed colored header with photo.
 * Bold accent block — for people whose work is the brand.
 */
function madridPersona(): ResumeData {
  const shell = buildShell("madrid", {
    accentColor: "#047857",
    layout: "single",
    headerStyle: "box",
    photo: { enabled: true, shape: "rounded", position: "top-left" },
  });
  return {
    ...shell,
    personal: {
      fullName: "Diego Fuentes",
      headline: "Creative Director",
      email: "diego@example.com",
      phone: "+34 915 55 0143",
      location: "Madrid, ES",
      photoUrl: "/sample-photos/madrid.webp",
      links: [
        { id: "ma1", label: "diegofuentes.studio", url: "https://diegofuentes.studio" },
        { id: "ma2", label: "instagram.com/df.studio", url: "https://instagram.com/df.studio" },
      ],
    },
    sections: [
      summary(
        "Creative director and brand-builder for D2C consumer goods. Cannes Bronze, two D&AD pencils, founder of Estudio DF.",
      ),
      experience(
        {
          role: "Creative Director, Founder",
          company: "Estudio DF",
          location: "Madrid",
          start: "2021-03",
          end: "",
          current: true,
          bullets: [
            "Brand identities and launch campaigns for 18 D2C consumer brands.",
            "Cannes Bronze 2024 (Print & Publishing) for the El Nido tea launch.",
          ],
        },
        {
          role: "Senior Art Director",
          company: "Sra. Rushmore",
          location: "Madrid",
          start: "2017-01",
          end: "2021-02",
          current: false,
          bullets: ["Lead art director on Mahou-San Miguel relaunch (2019)."],
        },
      ),
      education({
        institution: "ESDIP",
        degree: "BA",
        field: "Visual Communication",
        location: "Madrid",
        start: "2012",
        end: "2016",
      }),
      awards([
        { name: "Cannes Bronze Lion", issuer: "Cannes Lions", date: "2024" },
        { name: "D&AD Pencil ×2", issuer: "D&AD", date: "2023" },
      ]),
      skills(
        ["Brand strategy", "Art direction", "Identity systems", "Type design", "Creative leadership"],
        "Design",
      ),
    ],
  };
}

/**
 * Reykjavik — PhD researcher, publications-prominent, no photo.
 * Long-form academic CV: less skills, more papers.
 */
function reykjavikPersona(): ResumeData {
  const shell = buildShell("reykjavik", {
    accentColor: "#1e293b",
    layout: "single",
    headerStyle: "titlecase",
    bulletStyle: "square",
    photo: { enabled: false, shape: "square", position: "top-left" },
  });
  return {
    ...shell,
    personal: {
      fullName: "Dr. Sophie Müller",
      headline: "Postdoctoral Researcher, Computational Biology",
      email: "smuller@example.edu",
      phone: "+41 44 632 1100",
      location: "Zürich, CH",
      links: [
        { id: "re1", label: "scholar.google.com/sophie-m", url: "https://scholar.google.com" },
        { id: "re2", label: "orcid.org/0000-0002", url: "https://orcid.org" },
      ],
    },
    sections: [
      summary(
        "Computational biologist specialising in single-cell genomics and gene regulatory inference. ETH/Max Planck postdoc, 14 first-author publications.",
      ),
      experience({
        role: "Postdoctoral Researcher",
        company: "ETH Zürich, Computational Biology Group",
        location: "Zürich",
        start: "2022-09",
        end: "",
        current: true,
        bullets: [
          "PI: Prof. M. Rätsch. Funded by SNSF Ambizione fellowship (2024–2027).",
        ],
      }),
      education({
        institution: "Max Planck Institute / TU Berlin",
        degree: "PhD",
        field: "Computational Biology",
        location: "Berlin",
        start: "2018",
        end: "2022",
      }),
      publications([
        {
          title:
            "Latent regulatory inference in single-cell ATAC-seq with diffusion priors",
          authors: "Müller S., Liu T., Rätsch G.",
          venue: "Nature Methods",
          date: "2024",
        },
        {
          title:
            "scRNA-seq batch correction without paired controls: a benchmark",
          authors: "Müller S., Garcia P., Heinz M.",
          venue: "Genome Biology",
          date: "2023",
        },
        {
          title: "GeneFormer: pretrained transformers for gene-expression atlases",
          authors: "Heinz M., Müller S., et al.",
          venue: "Nature Biotechnology",
          date: "2022",
        },
      ]),
      talks([
        {
          title: "Diffusion priors for chromatin accessibility",
          venue: "ISMB 2024",
          date: "Jul 2024",
        },
        {
          title: "Pretrained gene-expression models",
          venue: "RECOMB 2023",
          date: "Apr 2023",
        },
      ]),
    ],
  };
}

/**
 * Aurora — DevOps / Site Reliability Engineer with a dark theme.
 *
 * Persona is intentionally distinct from any real CV that may have inspired
 * this template: SRE / platform-engineering domain (not full-stack web,
 * not 3D, not creative). Skills group around the SRE/observability stack
 * users will recognise.
 */
function auroraPersona(): ResumeData {
  const shell = buildShell("aurora", {
    accentColor: "#7FFAB6",
    pageBg: "#0F1419",
    textColor: "#E8EAED",
    titleFont: "Inter",
    bodyFont: "Inter",
    headerStyle: "uppercase",
    dividerStyle: "none",
    bulletStyle: "disc",
    layout: "sidebar-left",
    sidebarWidth: 0.3,
    skillBarStyle: "pills",
    photo: { enabled: true, shape: "circle", position: "top-right" },
    watermarkText: "CV",
    watermarkPosition: "bottom-left",
    watermarkColor: "#7FFAB6",
  });
  return {
    ...shell,
    personal: {
      fullName: "Jonas Berg",
      headline: "Senior Site Reliability Engineer",
      email: "jonas@example.com",
      phone: "+47 98 76 54 32",
      location: "Stockholm, SE",
      photoUrl: "/sample-photos/aurora.webp",
      links: [
        { id: "au1", label: "jonasberg.io", url: "https://jonasberg.io" },
        { id: "au2", label: "linkedin.com/in/jonasberg", url: "https://linkedin.com/in/jonasberg" },
      ],
    },
    sections: [
      {
        id: "au-personal",
        type: "custom",
        title: "Personal Info",
        visible: true,
        body: "Based: Stockholm\nFocus: Production reliability\nOpen to: Remote (CET)",
        items: [],
      },
      summary(
        "SRE with eight years owning incident response, observability and platform tooling at scale. I write boring software that wakes nobody at 03:00.",
      ),
      experience(
        {
          role: "Senior SRE",
          company: "Lattice Cloud",
          location: "Stockholm",
          start: "2022-04",
          end: "",
          current: true,
          bullets: [
            "Cut SLO-violating incidents 67% by rebuilding the alerting pipeline and adding error-budget burn-rate paging.",
            "Owned the multi-region failover runbook; quarterly chaos drills now finish under 12 minutes.",
          ],
        },
        {
          role: "Platform Engineer",
          company: "Helio Systems",
          location: "Gothenburg",
          start: "2018-09",
          end: "2022-03",
          current: false,
          bullets: [
            "Migrated 90+ services from VMs to Kubernetes; drove the gradual rollout that kept the team's SLO intact through a year of work.",
          ],
        },
      ),
      education({
        institution: "KTH Royal Institute of Technology",
        degree: "MSc",
        field: "Computer Science",
        location: "Stockholm",
        start: "2014",
        end: "2018",
      }),
      // Four skill groups for the chip cluster — domain language for an SRE.
      {
        id: "au-skills",
        type: "skills",
        title: "Skills",
        visible: true,
        items: [
          ...["Kubernetes", "Terraform", "Helm", "ArgoCD", "Crossplane"].map(
            (n, i) => ({
              id: `inf${i}`,
              name: n,
              level: 5,
              group: "Infrastructure",
              visible: true,
            }),
          ),
          ...["Prometheus", "Grafana", "OpenTelemetry", "Loki", "Tempo"].map(
            (n, i) => ({
              id: `obs${i}`,
              name: n,
              level: 5,
              group: "Observability",
              visible: true,
            }),
          ),
          ...["Go", "Python", "Bash", "Lua", "Rust"].map((n, i) => ({
            id: `lang${i}`,
            name: n,
            level: 4,
            group: "Languages",
            visible: true,
          })),
          ...["Incident command", "Runbooks", "Postmortems", "On-call"].map(
            (n, i) => ({
              id: `pra${i}`,
              name: n,
              level: 5,
              group: "Practices",
              visible: true,
            }),
          ),
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Section builders — keep the personas above readable
// ---------------------------------------------------------------------------

function summary(body: string): Section {
  return { id: "sec-sum", type: "summary", title: "Summary", visible: true, body };
}

function experience(
  ...items: Array<{
    role: string;
    company: string;
    location: string;
    start: string;
    end: string;
    current: boolean;
    bullets: string[];
  }>
): Section {
  return {
    id: "sec-exp",
    type: "experience",
    title: "Experience",
    visible: true,
    items: items.map((it, i) => ({
      id: `exp-${i}`,
      role: it.role,
      company: it.company,
      location: it.location,
      startDate: it.start,
      endDate: it.end,
      current: it.current,
      visible: true,
      bullets: it.bullets.map((t, j) => bullet(t, `${i}-${j}`)),
    })),
  };
}

function education(it: {
  institution: string;
  degree: string;
  field: string;
  location: string;
  start: string;
  end: string;
}): Section {
  return {
    id: "sec-edu",
    type: "education",
    title: "Education",
    visible: true,
    items: [
      {
        id: "ed-0",
        institution: it.institution,
        degree: it.degree,
        field: it.field,
        location: it.location,
        startDate: it.start,
        endDate: it.end,
        current: false,
        visible: true,
        bullets: [],
      },
    ],
  };
}

function skills(names: string[], group: string): Section {
  return {
    id: "sec-skl",
    type: "skills",
    title: "Skills",
    visible: true,
    items: names.map((n, i) => ({
      id: `sk-${i}`,
      name: n,
      level: 4,
      group,
      visible: true,
    })),
  };
}

function languages(
  list: Array<{ name: string; proficiency: string; level: number }>,
): Section {
  return {
    id: "sec-lang",
    type: "languages",
    title: "Languages",
    visible: true,
    items: list.map((l, i) => ({
      id: `lng-${i}`,
      name: l.name,
      proficiency: l.proficiency,
      level: l.level,
      visible: true,
    })),
  };
}

function projects(
  list: Array<{
    name: string;
    role: string;
    url: string;
    start: string;
    techStack: string;
    bullet: string;
  }>,
): Section {
  return {
    id: "sec-proj",
    type: "projects",
    title: "Projects",
    visible: true,
    items: list.map((p, i) => ({
      id: `pr-${i}`,
      name: p.name,
      role: p.role,
      url: p.url,
      startDate: p.start,
      endDate: "",
      current: true,
      visible: true,
      techStack: p.techStack,
      bullets: [bullet(p.bullet, `${i}-0`)],
    })),
  };
}

function certifications(
  list: Array<{ name: string; issuer: string; date: string }>,
): Section {
  return {
    id: "sec-cert",
    type: "certifications",
    title: "Certifications",
    visible: true,
    items: list.map((c, i) => ({
      id: `cert-${i}`,
      name: c.name,
      issuer: c.issuer,
      date: c.date,
      visible: true,
    })),
  };
}

function awards(
  list: Array<{ name: string; issuer: string; date: string }>,
): Section {
  return {
    id: "sec-awd",
    type: "awards",
    title: "Awards",
    visible: true,
    items: list.map((a, i) => ({
      id: `awd-${i}`,
      name: a.name,
      issuer: a.issuer,
      date: a.date,
      description: "",
      visible: true,
    })),
  };
}

function publications(
  list: Array<{ title: string; authors: string; venue: string; date: string }>,
): Section {
  return {
    id: "sec-pub",
    type: "publications",
    title: "Publications",
    visible: true,
    items: list.map((p, i) => ({
      id: `pub-${i}`,
      title: p.title,
      authors: p.authors,
      venue: p.venue,
      date: p.date,
      visible: true,
    })),
  };
}

function talks(
  list: Array<{ title: string; venue: string; date: string }>,
): Section {
  return {
    id: "sec-talk",
    type: "talks",
    title: "Talks",
    visible: true,
    items: list.map((t, i) => ({
      id: `tk-${i}`,
      title: t.title,
      venue: t.venue,
      date: t.date,
      visible: true,
    })),
  };
}
