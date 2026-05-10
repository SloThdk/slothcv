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
 *
 * # Demo-link safety contract — DO NOT BREAK
 *
 * Every URL in this file (personal.links[].url, project.url, etc.) MUST
 * point at `https://example.com/...` — never a real social network,
 * personal portfolio, or third-party service. `example.com` is reserved
 * by RFC 2606 specifically for documentation / examples and will never
 * resolve to a real human's profile, no matter who edits this file or
 * which persona we add later.
 *
 * Display labels (personal.links[].label) MUST also avoid resolving
 * to real people if a curious user pastes the label into a browser.
 * Use the "<firstname>-cv" demo suffix (e.g. "linkedin.com/in/alex-cv")
 * — the "-cv" marker is uncommon enough that no real person owns those
 * vanity slugs, but the visual format still reads like a CV link so
 * the gallery preview looks polished.
 *
 * Why this matters: an earlier revision shipped real LinkedIn slugs
 * like `linkedin.com/in/jonasberg` that resolved to an actual senior
 * engineer's profile — using their name + employment context on every
 * Aurora-template gallery card is a privacy / defamation problem that
 * could draw a takedown notice or worse. Don't reintroduce real handles.
 */

import {
  RESUME_SCHEMA_VERSION,
  type ResumeData,
  type Section,
  type TemplateId,
} from "@/types/resume";
import { defaultDesign, defaultDesignForTemplate } from "@/lib/resume-defaults";

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
    case "austin":
      return austinPersona();
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
    // ── Visual / executive expansion (late 2026) ─────────────────────
    // Capitol — corporate executive, dark navy band + photo. Berlin's
    //           polished sidebar persona maps cleanly: same exec tone,
    //           photo enabled, sections a mix of narrative + chips.
    // Vesterbro — Danish-friendly two-column with centered photo. Use
    //             Berlin's persona — content fits, layout reorders into
    //             the new badged-section grid.
    // Marina — dark teal header + sidebar layout, marketing-flavored.
    //          Madrid's creative-director persona is the closest fit
    //          (photo, headline, narrative-heavy experience).
    case "capitol":
    case "vesterbro":
      return overrideTemplate(berlinPersona(), template);
    case "marina":
      return overrideTemplate(madridPersona(), template);
    // ── Danish CV pool (2026-05) ─────────────────────────────────────
    // Hver template får sin egen industri-specifikke persona så
    // gallery-thumbnails giver ægte "denne her er for X-segmentet"-
    // signal. Aarhus (offentlig/finans) → Anders Hansen
    // (økonomikonsulent), Roskilde (tech) → Christian Møller (senior
    // engineer), Odense (kreativ) → Mette Jensen (marketing — den
    // oprindelige danishPersona, beholdt fordi marketing/comms ER
    // den naturlige Odense-fit).
    case "aarhus":
      return overrideTemplate(danishFinancePersona(), template);
    case "roskilde":
      return overrideTemplate(danishTechPersona(), template);
    case "odense":
      return overrideTemplate(danishPersona(), template);
    // ── Industri-udvidelse ─────────────────────────────────────────
    // Each new template gets its own industry-specific Danish persona
    // because the CONTENT differs meaningfully — Kasper's lager-CV
    // doesn't translate to Lars' el-CV doesn't translate to Anne's
    // sygepleje-CV. Dropping all three on Mette would lose the "this
    // template is for X industry" signal that makes the gallery
    // useful at first glance.
    case "vejle":
      return overrideTemplate(danishHourlyPersona(), template);
    case "aalborg":
      return overrideTemplate(danishTradePersona(), template);
    case "frederiksberg":
      return overrideTemplate(danishCarePersona(), template);
    case "helsingor":
      return overrideTemplate(danishHospitalityPersona(), template);
    case "silkeborg":
      return overrideTemplate(danishRetailPersona(), template);
    case "aabenraa":
      return overrideTemplate(danishTransportPersona(), template);
  }
}

/** Re-stamp a persona for a different template: dispatch to the target
 *  layout AND apply the target's intended design tokens.
 *
 *  Why both: the persona builders (auroraPersona, manhattanPersona, etc.)
 *  bake in their OWN design (Aurora's dark navy + mint + "CV" watermark,
 *  Manhattan's navy + gold). Re-stamping only `meta.template` left those
 *  tokens in place, so e.g. `overrideTemplate(auroraPersona(), "helvetica")`
 *  rendered a Swiss-minimal layout on Aurora's dark navy with Aurora's
 *  watermark — visually identical to Aurora itself. WYSIWYG broke: the
 *  gallery card lied about what the editor would produce.
 *
 *  By overlaying `defaultDesignForTemplate(target)` we make the gallery
 *  card render with the EXACT design tokens the editor's `setTemplate`
 *  mutator will produce on selection. One source of truth for "what does
 *  template X look like out of the box" — the gallery and the editor
 *  agree. */
function overrideTemplate(base: ResumeData, target: TemplateId): ResumeData {
  return {
    ...base,
    meta: { ...base.meta, template: target },
    design: defaultDesignForTemplate(target),
  };
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
/**
 * Mette Jensen — Danish persona used by all three Danish-shaped templates
 * (aarhus, roskilde, odense).
 *
 * Why one shared Danish persona instead of three: the gallery's job is to
 * communicate "this template is for Danish CVs" with content readable at
 * a glance. Three different Danish personas would just dilute that
 * signal — the layouts already differ enough between aarhus's classic
 * sidebar, roskilde's ATS-clean single column, and odense's editorial
 * header band. Sharing the persona keeps Danish content tight and
 * coherent across the trio.
 *
 * Section labels follow Ase's canonical Danish-CV order from
 * research/danish-cv-templates.md:
 *   1. Faglig profil   (summary)
 *   2. Erhvervserfaring (experience, reverse chronological)
 *   3. Uddannelse       (education)
 *   4. Kompetencer      (skills)
 *   5. Sprog            (languages — CEFR levels A1–C2)
 *
 * Photo policy lives on each template's design defaults, not here.
 * roskilde overrides to photo-off so its ATS-clean look stands; aarhus
 * keeps photo-on (classic Danish CV); odense ships photo-on but
 * prominently toggleable per Scout's brief.
 *
 * Demo-link safety: every URL points at example.com (RFC 2606); label
 * suffix `-cv` keeps vanity slugs from ever resolving to a real Mette
 * Jensen. Same contract as every other persona in this file.
 */
function danishPersona(): ResumeData {
  const shell = buildShell("aarhus", {
    accentColor: "#1F3A5F",
    layout: "sidebar-left",
    headerStyle: "uppercase",
    photo: { enabled: true, shape: "circle", position: "sidebar" },
  });
  return {
    ...shell,
    meta: { ...shell.meta, language: "da" },
    personal: {
      fullName: "Mette Jensen",
      headline: "Senior Marketingansvarlig",
      email: "mette@example.com",
      phone: "+45 22 11 33 44",
      location: "København, DK",
      photoUrl: "/sample-photos/berlin.webp",
      links: [
        {
          id: "dk1",
          label: "linkedin.com/in/mette-cv",
          url: "https://example.com/in/mette-cv",
        },
        {
          id: "dk2",
          label: "mette-cv.example",
          url: "https://example.com/mette-cv",
        },
      ],
    },
    sections: [
      {
        ...summary(
          "Erfaren marketing- og kommunikationsspecialist med 8 års baggrund i SaaS, detail og offentlig sektor. Driver kampagner end-to-end — fra indsigt og strategi til eksekvering og målbare resultater på tværs af DK, SE og NO.",
        ),
        title: "Faglig profil",
      },
      {
        ...experience(
          {
            role: "Senior Marketingansvarlig",
            company: "Nordlys A/S",
            location: "København",
            start: "2023-03",
            end: "",
            current: true,
            bullets: [
              "Ledede den nordiske kampagneportefølje og øgede MQL-volumen +34% år over år.",
              "Etablerede content-program på tværs af DK/SE/NO med faste leveranceaftaler hver kvartal.",
            ],
          },
          {
            role: "Marketingkoordinator",
            company: "Holm & Bertelsen",
            location: "Aarhus",
            start: "2020-01",
            end: "2023-02",
            current: false,
            bullets: [
              "Lancerede selvbetjent onboarding-flow og reducerede salgsindgreb med 41%.",
            ],
          },
        ),
        title: "Erhvervserfaring",
      },
      {
        ...education({
          institution: "Aarhus Universitet",
          degree: "Cand.merc.",
          field: "Marketing & Brand Management",
          location: "Aarhus",
          start: "2015",
          end: "2017",
        }),
        title: "Uddannelse",
      },
      {
        ...skills(
          [
            "Kampagnestrategi",
            "Content marketing",
            "SEO",
            "Google Analytics",
            "HubSpot",
            "B2B-positionering",
          ],
          "Faglige",
        ),
        title: "Kompetencer",
      },
      {
        ...languages([
          { name: "Dansk", proficiency: "Modersmål", level: 5 },
          { name: "Engelsk", proficiency: "C1", level: 4 },
          { name: "Tysk", proficiency: "B1", level: 2 },
        ]),
        title: "Sprog",
      },
    ],
  };
}

/**
 * Anders Hansen — offentlig-sektor / finans persona for Aarhus templatet.
 *
 * Aarhus er den klassiske formelle skabelon — public sector, finans,
 * jura, SMV. Anders dækker det segment med en økonomikonsulent-
 * baggrund i kommunal forvaltning. Faglig profil rammer "stabil,
 * regelret, analytisk" register som matcher recruiter-forventningerne
 * i offentlig sektor. Civilstatus / fødselsdato udelades bevidst —
 * danske offentlige arbejdsgivere har lige siden 2024 anbefalet at
 * droppe dem ift. ligebehandlings-loven.
 */
function danishFinancePersona(): ResumeData {
  const shell = buildShell("aarhus", {
    accentColor: "#1F3A5F",
    layout: "sidebar-left",
    headerStyle: "uppercase",
    photo: { enabled: true, shape: "circle", position: "sidebar" },
  });
  return {
    ...shell,
    meta: { ...shell.meta, language: "da" },
    personal: {
      fullName: "Anders Hansen",
      headline: "Økonomikonsulent · Cand.merc.aud.",
      email: "anders@example.com",
      phone: "+45 26 18 04 71",
      location: "Aarhus C, DK",
      photoUrl: "/sample-photos/berlin.webp",
      links: [
        {
          id: "ah1",
          label: "linkedin.com/in/anders-cv",
          url: "https://example.com/in/anders-cv",
        },
      ],
    },
    sections: [
      {
        ...summary(
          "Erfaren økonomikonsulent med 9 års baggrund fra kommunal forvaltning og revisionsbranchen. Stærk i budgetlægning, regnskabsanalyse og overholdelse af regnskabsloven. Trives i regulerede miljøer hvor præcision og dokumentation vejer tungere end hastighed.",
        ),
        title: "Faglig profil",
      },
      {
        ...experience(
          {
            role: "Økonomikonsulent",
            company: "Aarhus Kommune, Borgmesterens Afdeling",
            location: "Aarhus",
            start: "2021-08",
            end: "",
            current: true,
            bullets: [
              "Drev årsregnskab og budgetopfølgning for forvaltning med 240 mio. kr. ramme; nul anmærkninger i revision 3 år i træk.",
              "Udviklede dashboard i Power BI til realtidsovervågning af forbrug — adopteret af 4 andre forvaltninger.",
              "Repræsenterede afdelingen i tværkommunale arbejdsgrupper omkring regnskabsstandardisering.",
            ],
          },
          {
            role: "Revisor-assistent",
            company: "BDO Statsautoriseret revisionsaktieselskab",
            location: "Aarhus",
            start: "2017-09",
            end: "2021-07",
            current: false,
            bullets: [
              "Revision af mellemstore SMV'er og almennyttige boligselskaber.",
              "Bestod cand.merc.aud.-eksamen mens fuldtidsansat.",
            ],
          },
        ),
        title: "Erhvervserfaring",
      },
      {
        ...education({
          institution: "Aarhus Universitet, BSS",
          degree: "Cand.merc.aud.",
          field: "Revision og regnskab",
          location: "Aarhus",
          start: "2019",
          end: "2021",
        }),
        title: "Uddannelse",
      },
      {
        ...skills(
          [
            "Regnskabsanalyse efter ÅRL og IFRS",
            "Budgetlægning og -opfølgning",
            "Power BI / Excel (avanceret)",
            "OPUS / Prisme 365 (kommunalt regnskabssystem)",
            "Skatteret",
            "Tværfagligt samarbejde",
          ],
          "Faglige",
        ),
        title: "Kompetencer",
      },
      {
        ...languages([
          { name: "Dansk", proficiency: "Modersmål", level: 5 },
          { name: "Engelsk", proficiency: "C1", level: 4 },
          { name: "Tysk", proficiency: "B1", level: 3 },
        ]),
        title: "Sprog",
      },
    ],
  };
}

/**
 * Christian Møller — tech / startup persona for Roskilde templatet.
 *
 * Roskilde er ATS-clean og skrævlende moderne. Persona'en målretter
 * mod store internationale tech-arbejdsgivere i CPH (Tradeshift,
 * Pleo, Coinify, Worksome, Templafy, Trustpilot, Zendesk DK) eller
 * Vestas/Maersk/LEGO's tech-divisioner. Erhvervserfaring viser
 * end-to-end ownership snarere end siloed dev-tasks — det signal
 * scaleup-rekrutterere scanner for.
 */
function danishTechPersona(): ResumeData {
  const shell = buildShell("roskilde", {
    accentColor: "#0A0A0A",
    layout: "single",
    headerStyle: "uppercase",
    photo: { enabled: false, shape: "circle", position: "top-left" },
  });
  return {
    ...shell,
    meta: { ...shell.meta, language: "da" },
    personal: {
      fullName: "Christian Møller",
      headline: "Senior Software Engineer",
      email: "christian@example.com",
      phone: "+45 31 04 78 22",
      location: "København N, DK",
      links: [
        {
          id: "cm1",
          label: "github.com/christian-cv",
          url: "https://example.com/christian-cv",
        },
        {
          id: "cm2",
          label: "linkedin.com/in/christian-cv",
          url: "https://example.com/in/christian-cv",
        },
      ],
    },
    sections: [
      {
        ...summary(
          "Senior software engineer med 8 års erfaring i distribuerede backend-systemer i scaleup- og koncern-miljøer. Stærk i TypeScript, Go og PostgreSQL. Arbejder end-to-end fra produktopdagelse til produktion og on-call. Bidrager open-source og holder oplæg til Copenhagen.js.",
        ),
        title: "Faglig profil",
      },
      {
        ...experience(
          {
            role: "Senior Software Engineer",
            company: "Pleo Technologies",
            location: "København",
            start: "2022-11",
            end: "",
            current: true,
            bullets: [
              "Tech lead på betalingsplatformen — flytter ~120 mio. EUR/år gennem Stripe Connect og lokale danske bank-API'er.",
              "Sænkede p99 latency på checkout-flow fra 1.4s til 380ms via lazy-loaded session state og Postgres index-tuning.",
              "Onboardede 4 juniorer; ejer praktikant-programmet for backend-teamet.",
            ],
          },
          {
            role: "Software Engineer",
            company: "Tradeshift",
            location: "København",
            start: "2017-08",
            end: "2022-10",
            current: false,
            bullets: [
              "Byggede public API for B2B-faktura-routing; 18 storkunder migrerede fra legacy SOAP til REST på 6 måneder.",
              "Var lead på migrering fra monolith til event-driven arkitektur (Kafka).",
            ],
          },
        ),
        title: "Erhvervserfaring",
      },
      {
        ...education({
          institution: "Københavns Universitet (DIKU)",
          degree: "Cand.scient.",
          field: "Datalogi",
          location: "København",
          start: "2014",
          end: "2017",
        }),
        title: "Uddannelse",
      },
      {
        ...skills(
          [
            "TypeScript / Node.js",
            "Go",
            "PostgreSQL + Redis",
            "Kafka / event-driven arkitektur",
            "Kubernetes / GCP",
            "End-to-end ownership + on-call",
          ],
          "Tekniske",
        ),
        title: "Kompetencer",
      },
      {
        ...languages([
          { name: "Dansk", proficiency: "Modersmål", level: 5 },
          { name: "Engelsk", proficiency: "C2", level: 5 },
          { name: "Tysk", proficiency: "B1", level: 3 },
        ]),
        title: "Sprog",
      },
    ],
  };
}

/**
 * Kasper Larsen — ufaglært dansk persona for Vejle templatet.
 *
 * Dækker hourly / service-job markedet: lager, butik, kantine,
 * rengøring, transport. CV'et er bevidst kort (1-side fokus), bullet-
 * orienteret snarere end narrativt, og fremhæver kørekort + sproglige
 * kompetencer (vigtige signaler for danske arbejdsgivere i denne
 * sektor — især for ny-tilflyttere). Faglig profil holdes på 1-2 sætninger.
 *
 * Hobbies inkluderet — danske rekrutterer i hourly-segmentet bruger
 * "Fritidsinteresser" som personality-signal lige så meget som
 * faglige bidder.
 */
function danishHourlyPersona(): ResumeData {
  const shell = buildShell("vejle", {
    accentColor: "#D97706",
    layout: "single",
    headerStyle: "titlecase",
    photo: { enabled: true, shape: "square", position: "top-left" },
  });
  return {
    ...shell,
    meta: { ...shell.meta, language: "da" },
    personal: {
      fullName: "Kasper Larsen",
      headline: "Lagerassistent · Søger fast stilling",
      email: "kasper@example.com",
      phone: "+45 30 12 45 67",
      location: "Vejle, DK",
      photoUrl: "/sample-photos/berlin.webp",
      // Kørekort er nu et dedikeret felt på PersonalInfo — surfaceres
      // direkte i Vejle templatets kontaktblok. Truckcertifikat
      // tilføjes via certificeringer-sektionen i en senere iteration.
      koreekort: "B + Truck",
      links: [],
    },
    sections: [
      {
        ...summary(
          "Pålidelig og fysisk stærk lagerassistent med 4 års erfaring fra detail- og engroslager. Møder altid til tiden, arbejder selvstændigt og i team, og har erfaring med truckkørsel og scanner-systemer. Søger fast stilling i Vejle-området.",
        ),
        title: "Faglig profil",
      },
      {
        ...experience(
          {
            role: "Lagerassistent",
            company: "Bilka Vejle",
            location: "Vejle",
            start: "2023-06",
            end: "",
            current: true,
            bullets: [
              "Modtager og kontrollerer ca. 40 paller dagligt; ingen reklamationer på min vagt i 18 måneder.",
              "Kører gaffeltruck (B-certifikat) og betjener håndscanner.",
              "Oplærer nye sæsonmedarbejdere i lagerprocedurer og sikkerhed.",
            ],
          },
          {
            role: "Butiksmedhjælper",
            company: "Føtex Vejle Nord",
            location: "Vejle",
            start: "2020-02",
            end: "2023-05",
            current: false,
            bullets: [
              "Påfyldte varer, holdt orden i frugt- og grøntafdelingen, betjente kunder i kasse.",
            ],
          },
        ),
        title: "Erhvervserfaring",
      },
      {
        ...education({
          institution: "Vejle Tekniske Skole",
          degree: "Grundforløb",
          field: "Transport og logistik",
          location: "Vejle",
          start: "2019",
          end: "2020",
        }),
        title: "Uddannelse",
      },
      {
        ...skills(
          [
            "Truckkørsel (B-certifikat)",
            "Håndscanner (SAP / WMS)",
            "Pakke- og forsendelsesrutiner",
            "Kundebetjening",
            "Fysisk arbejde",
          ],
          "Praktiske",
        ),
        title: "Kompetencer",
      },
      {
        ...languages([
          { name: "Dansk", proficiency: "Modersmål", level: 5 },
          { name: "Engelsk", proficiency: "B1", level: 3 },
        ]),
        title: "Sprog",
      },
      {
        ...hobbies([
          "Fodbold (Vejle Boldklub støttemedlem)",
          "Cykelferier i Sønderjylland",
          "Frivillig brandmand i Bredsten",
        ]),
        title: "Fritidsinteresser",
      },
    ],
  };
}

/**
 * Lars Andersen — faglært dansk persona for Aalborg templatet.
 *
 * Industriel-elektriker med svendebrev. Det danske faglærte CV har
 * to bærende elementer ud over erhvervserfaringen: SVENDEBREV
 * (uddannelse + dato) og CERTIFICERINGER (autorisationer, AT-kurser,
 * sikkerhedsbeviser). Aalborg-templatet er bygget rundt om begge —
 * en sidebar dedikeret til certifikater og kørekort-kategorier.
 *
 * Kørekort B + C er surfaceret som en "link" på personal — nemmest
 * måde at få det med uden schema-ændring. Brugeren kan slette og
 * tilføje selv.
 */
function danishTradePersona(): ResumeData {
  const shell = buildShell("aalborg", {
    accentColor: "#334155",
    layout: "sidebar-right",
    headerStyle: "uppercase",
    photo: { enabled: true, shape: "square", position: "top-right" },
  });
  return {
    ...shell,
    meta: { ...shell.meta, language: "da" },
    personal: {
      fullName: "Lars Andersen",
      headline: "Industri-elektriker · Svendebrev 2018",
      email: "lars@example.com",
      phone: "+45 22 84 19 33",
      location: "Aalborg, DK",
      photoUrl: "/sample-photos/berlin.webp",
      koreekort: "B + C",
      links: [],
    },
    sections: [
      {
        ...summary(
          "Erfaren industri-elektriker med 7 års praksis i levnedsmiddel- og energisektoren. Stærk i fejlfinding på PLC-styringer, frekvensomformere og industriel automation. Højt sikkerhedsfokus, vant til at arbejde under produktion uden driftstop.",
        ),
        title: "Faglig profil",
      },
      {
        ...experience(
          {
            role: "Industri-elektriker",
            company: "Arla Foods, Aalborg Mejeri",
            location: "Aalborg",
            start: "2021-04",
            end: "",
            current: true,
            bullets: [
              "Vagtplan på 24/7 servicehold; halverede gennemsnitlig fejlfindingstid via systematisk loggning.",
              "Ombyggede pakkelinje 3 til ny PLC (Siemens S7-1500) uden produktionsstop.",
              "Underviser nye lærlinge i el-sikkerhedsregler og lockout-tagout.",
            ],
          },
          {
            role: "Servicetekniker",
            company: "El-Centrum Nordjylland",
            location: "Aalborg",
            start: "2018-08",
            end: "2021-03",
            current: false,
            bullets: [
              "Servicebesøg hos industri- og landbrugskunder. CVR-tilkald i hele Region Nordjylland.",
            ],
          },
        ),
        title: "Erhvervserfaring",
      },
      {
        ...education({
          institution: "Tech College Aalborg",
          degree: "Svendebrev",
          field: "Industri-elektriker",
          location: "Aalborg",
          start: "2014",
          end: "2018",
        }),
        title: "Uddannelse",
      },
      {
        ...certifications([
          { name: "El-autorisation (delautorisation drift)", issuer: "Sikkerhedsstyrelsen", date: "2019-03" },
          { name: "AT-kursus: Arbejde med spænding under 1000V", issuer: "Arbejdstilsynet", date: "2020-09" },
          { name: "Førstehjælp (12 t)", issuer: "Røde Kors", date: "2024-06" },
          { name: "Stillads §17 / op til 9m", issuer: "BAR", date: "2022-04" },
        ]),
        title: "Certificeringer",
      },
      {
        ...skills(
          [
            "PLC: Siemens S7, Beckhoff",
            "SCADA: WinCC, Citect",
            "Frekvensomformere (Danfoss, ABB)",
            "Hydraulik og pneumatik",
            "Lockout-tagout",
            "Termografering",
          ],
          "Tekniske",
        ),
        title: "Kompetencer",
      },
      {
        ...languages([
          { name: "Dansk", proficiency: "Modersmål", level: 5 },
          { name: "Engelsk", proficiency: "B2", level: 3 },
        ]),
        title: "Sprog",
      },
    ],
  };
}

/**
 * Anne Sørensen — sundhedsfaglig dansk persona for Frederiksberg
 * templatet.
 *
 * Sygeplejerske med autorisation og specialpraksis indenfor akut og
 * intensiv. Det centrale i et dansk sundheds-CV er AUTORISATION
 * (Styrelsen for Patientsikkerhed-nummer + dato), klinisk specifik
 * erfaring, og efteruddannelse. Templatet placerer autorisationer
 * + sprog i sidebar og narrative erhvervserfaring i hovedkolonnen.
 *
 * Hobbies inkluderet — sundhedsroller værdsætter "well-rounded"
 * medarbejdere, hobbier signalerer self-care og bæredygtighed.
 */
function danishCarePersona(): ResumeData {
  const shell = buildShell("frederiksberg", {
    accentColor: "#0D9488",
    layout: "sidebar-left",
    headerStyle: "titlecase",
    photo: { enabled: true, shape: "circle", position: "sidebar" },
  });
  return {
    ...shell,
    meta: { ...shell.meta, language: "da" },
    personal: {
      fullName: "Anne Sørensen",
      headline: "Sygeplejerske · Autorisation 2017",
      email: "anne@example.com",
      phone: "+45 26 71 03 22",
      location: "Frederiksberg, DK",
      photoUrl: "/sample-photos/berlin.webp",
      koreekort: "B",
      links: [
        {
          id: "as1",
          label: "Autorisation: 0DTGN",
          url: "https://example.com/anne-cv",
        },
      ],
    },
    sections: [
      {
        ...summary(
          "Erfaren sygeplejerske med 7 års klinisk praksis indenfor akutmodtagelse og intensiv. Stærk i triage, akut respons og tværfagligt samarbejde. Vant til travle vagter og høj patientstrømning. Søger stilling med plads til specialisering.",
        ),
        title: "Faglig profil",
      },
      {
        ...experience(
          {
            role: "Sygeplejerske, Akutmodtagelsen",
            company: "Frederiksberg Hospital",
            location: "Frederiksberg",
            start: "2022-09",
            end: "",
            current: true,
            bullets: [
              "Triage og akut respons på medicinske og kirurgiske patienter; ca. 40 patienter per vagt.",
              "Kontaktperson for praktikanter fra Metropol; mentorerede 6 SOSU-elever på rotation.",
              "Med i arbejdsgruppen for nyt elektronisk triagesystem (Manchester).",
            ],
          },
          {
            role: "Sygeplejerske, Intensiv",
            company: "Rigshospitalet",
            location: "København",
            start: "2017-08",
            end: "2022-08",
            current: false,
            bullets: [
              "Pleje af kritisk syge patienter på 8-sengs intensivafsnit.",
              "Respiratorbehandling, sedation, hæmodynamisk monitorering.",
            ],
          },
        ),
        title: "Erhvervserfaring",
      },
      {
        ...education({
          institution: "Professionshøjskolen Metropol",
          degree: "Professionsbachelor",
          field: "Sygepleje",
          location: "København",
          start: "2013",
          end: "2017",
        }),
        title: "Uddannelse",
      },
      {
        ...certifications([
          { name: "Autorisation som sygeplejerske", issuer: "Styrelsen for Patientsikkerhed", date: "2017-07" },
          { name: "Specialuddannelse i intensiv sygepleje", issuer: "Region Hovedstaden", date: "2020-05" },
          { name: "Avanceret livreddende førstehjælp (ALS)", issuer: "Dansk Råd for Genoplivning", date: "2024-03" },
          { name: "Triage-instruktør (Manchester)", issuer: "Frederiksberg Hospital", date: "2023-11" },
        ]),
        title: "Autorisationer & efteruddannelse",
      },
      {
        ...skills(
          [
            "Akut triage (Manchester-system)",
            "Respiratorbehandling",
            "Hæmodynamisk monitorering",
            "Tværfagligt samarbejde",
            "Klinisk vejledning",
            "Sundhedsplatformen (Epic)",
          ],
          "Kliniske",
        ),
        title: "Kompetencer",
      },
      {
        ...languages([
          { name: "Dansk", proficiency: "Modersmål", level: 5 },
          { name: "Engelsk", proficiency: "C1", level: 4 },
          { name: "Svensk", proficiency: "B2", level: 3 },
        ]),
        title: "Sprog",
      },
      {
        ...hobbies([
          "Løb (halv-marathon under 2 timer)",
          "Frivillig hos Falck (førstehjælp ved events)",
          "Læser krimi og lægefaglig nonfiction",
        ]),
        title: "Fritidsinteresser",
      },
    ],
  };
}

/**
 * Sofie Pedersen — café/hospitality persona for Helsingør templatet.
 *
 * Specialty-coffee barista i København. Hospitality-CV'er fokuserer
 * på service-kompetencer, allergi-håndtering, kasse + POS-systemer,
 * og sproglige kompetencer (især vigtigt i turistområder). Persona
 * dækker også tjener / kok / hotel-receptionist segmentet — fælles
 * registre er service-orientering, holdarbejde, og pålidelighed.
 */
function danishHospitalityPersona(): ResumeData {
  const shell = buildShell("helsingor", {
    accentColor: "#B45309",
    layout: "single",
    headerStyle: "titlecase",
    titleFont: "Lora",
    bodyFont: "Inter",
    photo: { enabled: true, shape: "circle", position: "top-left" },
  });
  return {
    ...shell,
    meta: { ...shell.meta, language: "da" },
    personal: {
      fullName: "Sofie Pedersen",
      headline: "Barista · Specialty Coffee",
      email: "sofie@example.com",
      phone: "+45 28 14 56 78",
      location: "København K, DK",
      photoUrl: "/sample-photos/berlin.webp",
      links: [
        {
          id: "sp1",
          label: "Hygiejnebevis (1)",
          url: "https://example.com/sofie-cv",
        },
      ],
    },
    sections: [
      {
        ...summary(
          "Erfaren barista med 5 års praksis i specialty-coffee miljøer i København. Stærk i espresso-håndtering, latte-art og kundedialog på dansk + engelsk. Trives i højt-tempo-miljø og tager ansvar for daglig drift, varebestilling og oplæring af nye kolleger.",
        ),
        title: "Faglig profil",
      },
      {
        ...experience(
          {
            role: "Barista og skiftleder",
            company: "La Cabra Coffee, Pilestræde",
            location: "København",
            start: "2023-08",
            end: "",
            current: true,
            bullets: [
              "Daglig drift af to-gruppes La Marzocco; vedligeholder kalibrering og dosering henover dagen.",
              "Ansvar for åbnings- og lukke-rutiner samt POS-afstemning (Lightspeed).",
              "Oplærte 4 nye baristaer i Q-grader-kurset og virksomhedens espresso-standard.",
            ],
          },
          {
            role: "Barista",
            company: "The Coffee Collective, Godthåbsvej",
            location: "Frederiksberg",
            start: "2020-04",
            end: "2023-07",
            current: false,
            bullets: [
              "Espresso, brygmetoder (V60, AeroPress, Chemex) og kundeoplevelse i et specialty-miljø.",
              "Bestilte mælk, kaffebønner og forbrugsstoffer ugentligt.",
            ],
          },
        ),
        title: "Erhvervserfaring",
      },
      {
        ...education({
          institution: "Copenhagen Hospitality College",
          degree: "Servicebevis",
          field: "Café- og restaurationsservice",
          location: "København",
          start: "2018",
          end: "2019",
        }),
        title: "Uddannelse",
      },
      {
        ...skills(
          [
            "Espresso-kalibrering",
            "Latte-art (frihånds + etched)",
            "POS / kassesystemer (Lightspeed, iZettle)",
            "Allergi-håndtering (gluten, laktose, nødder)",
            "Mælkedampning",
            "Holdarbejde og oplæring",
          ],
          "Service",
        ),
        title: "Kompetencer",
      },
      {
        ...languages([
          { name: "Dansk", proficiency: "Modersmål", level: 5 },
          { name: "Engelsk", proficiency: "C1", level: 4 },
          { name: "Italiensk", proficiency: "A2", level: 2 },
        ]),
        title: "Sprog",
      },
      {
        ...hobbies([
          "Hjemmebrygning og pour-over på fridage",
          "Løb (Copenhagen Marathon 2024)",
          "Frivillig på Distortion-festivalen",
        ]),
        title: "Fritidsinteresser",
      },
    ],
  };
}

/**
 * Mads Christensen — detailhandels-persona for Silkeborg templatet.
 *
 * Salgsassistent i Bauhaus byggemarked, mid-level senior med
 * varekendskab, kundeservice, kasse + lager-rutiner. Persona dækker
 * også Jysk / Føtex / Bilka / Magasin / Salling segmentet — fælles
 * register er holdarbejde, kasseoperation, varekendskab + KPI-
 * driven salg.
 */
function danishRetailPersona(): ResumeData {
  const shell = buildShell("silkeborg", {
    accentColor: "#1E40AF",
    layout: "single",
    headerStyle: "uppercase",
    photo: { enabled: true, shape: "square", position: "top-right" },
  });
  return {
    ...shell,
    meta: { ...shell.meta, language: "da" },
    personal: {
      fullName: "Mads Christensen",
      headline: "Salgsassistent · Byggemarked",
      email: "mads@example.com",
      phone: "+45 30 27 49 15",
      location: "Silkeborg, DK",
      photoUrl: "/sample-photos/berlin.webp",
      koreekort: "B",
      links: [],
    },
    sections: [
      {
        ...summary(
          "Erfaren salgsassistent med 6 års praksis fra byggemarked og isenkram. Stærk i kundedialog, varekendskab indenfor el / vvs / træ-værktøj samt kasse + lager-rutiner. Tager naturligt ansvar for daglig drift, vagtplan og oplæring af nye kolleger.",
        ),
        title: "Faglig profil",
      },
      {
        ...experience(
          {
            role: "Salgsassistent og afdelingsansvarlig",
            company: "Bauhaus Silkeborg",
            location: "Silkeborg",
            start: "2022-04",
            end: "",
            current: true,
            bullets: [
              "Ansvarlig for el-afdelingen: vagtplan for 5 medarbejdere, varebestilling og kampagner.",
              "Kundeservice-NPS for afdelingen lå konsekvent over kæde-gennemsnit (+11 point i 2024).",
              "Oplærte 3 nye sæsonmedarbejdere i kasse, lagersystem (SAP) og varekendskab.",
            ],
          },
          {
            role: "Salgsmedhjælper",
            company: "Jysk Silkeborg",
            location: "Silkeborg",
            start: "2019-09",
            end: "2022-03",
            current: false,
            bullets: [
              "Kasse, varepåfyldning, kundebetjening i sengetøjs- og møbelafdelingen.",
              "Tog ekstravagter ved kampagne-uger og inventering.",
            ],
          },
        ),
        title: "Erhvervserfaring",
      },
      {
        ...education({
          institution: "Silkeborg Handelsskole",
          degree: "EUD-grundforløb",
          field: "Detailhandel og kundeservice",
          location: "Silkeborg",
          start: "2017",
          end: "2019",
        }),
        title: "Uddannelse",
      },
      {
        ...skills(
          [
            "Kundeservice og rådgivning",
            "Varekendskab (el, vvs, træ-værktøj)",
            "Kassebetjening og afstemning",
            "Lagersystem (SAP, Logia)",
            "Vagtplanlægning",
            "Kampagne-eksekvering",
          ],
          "Detailhandel",
        ),
        title: "Kompetencer",
      },
      {
        ...languages([
          { name: "Dansk", proficiency: "Modersmål", level: 5 },
          { name: "Engelsk", proficiency: "B2", level: 3 },
          { name: "Tysk", proficiency: "A2", level: 2 },
        ]),
        title: "Sprog",
      },
      {
        ...hobbies([
          "Mountainbike (Silkeborg MTB Klub)",
          "Hjemmebryg (øl-klub Aros)",
          "Fodbold-træner U10 (Silkeborg IF)",
        ]),
        title: "Fritidsinteresser",
      },
    ],
  };
}

/**
 * Ole Jensen — transport- og chauffør-persona for Aabenraa templatet.
 *
 * Lastbilchauffør med kategorier B + C + CE + ADR (farligt gods).
 * Det centrale i et dansk transport-CV er KØREKORT-KATEGORIER
 * (visuelt fremhævet) og GYLDIGE EFTERUDDANNELSESBEVISER (EU-
 * pakke 5 / chaufføruddannelse). Persona dækker også varevognschauffør,
 * busschauffør, kurer og taxa — alle reguleret af samme bekendtgørelse.
 */
function danishTransportPersona(): ResumeData {
  const shell = buildShell("aabenraa", {
    accentColor: "#1A1A1A",
    layout: "sidebar-left",
    headerStyle: "uppercase",
    photo: { enabled: true, shape: "square", position: "sidebar" },
  });
  return {
    ...shell,
    meta: { ...shell.meta, language: "da" },
    personal: {
      fullName: "Ole Jensen",
      headline: "Lastbilchauffør · CE + ADR",
      email: "ole@example.com",
      phone: "+45 22 78 31 04",
      location: "Aabenraa, DK",
      photoUrl: "/sample-photos/berlin.webp",
      // Aabenraa templatet renderer dette felt som visuelle gule
      // badges øverst i sidebar — én kategori pr. badge.
      koreekort: "B + C + CE",
      links: [],
    },
    sections: [
      {
        ...summary(
          "Erfaren lastbilchauffør med 12 års praksis indenfor international fragt og farligt gods (ADR). Stærk i ruteplanlægning, kunde-kommunikation og overholdelse af køre- og hviletidsregler. Punktlig, ansvarsfuld og vant til EU-trafik (DK / DE / NL / PL).",
        ),
        title: "Faglig profil",
      },
      {
        ...experience(
          {
            role: "Lastbilchauffør (CE + ADR)",
            company: "Frode Laursen, Aabenraa",
            location: "Aabenraa",
            start: "2019-02",
            end: "",
            current: true,
            bullets: [
              "Distribuerer ADR-mærket gods (klasse 3 brandbart + klasse 9) til industri-kunder i DK + DE + NL.",
              "Vedligeholder Tachograph-data og overholder EU-direktiv 561/2006 uden anmærkninger i 5 år.",
              "Oplærte 2 nye chauffører i ADR-procedurer og lastsikring.",
            ],
          },
          {
            role: "Lastbilchauffør (C)",
            company: "DSV Solutions",
            location: "Padborg",
            start: "2013-06",
            end: "2019-01",
            current: false,
            bullets: [
              "National distribution + udvalgte EU-ruter til Tyskland og Holland.",
              "Vagtplan inkl. weekender og helligdage; dækkede sygevagter for kolleger.",
            ],
          },
        ),
        title: "Erhvervserfaring",
      },
      {
        ...education({
          institution: "EUC Syd, Aabenraa",
          degree: "Chaufføruddannelse",
          field: "Godstransport (kategori C + CE)",
          location: "Aabenraa",
          start: "2011",
          end: "2013",
        }),
        title: "Uddannelse",
      },
      {
        ...certifications([
          { name: "ADR-bevis (klasse 1-9, tank)", issuer: "Beredskabsstyrelsen", date: "2023-09" },
          { name: "EU-direktiv 5 / Chaufføruddannelse", issuer: "AMU Syd", date: "2024-02" },
          { name: "Førstehjælp + brandbekæmpelse", issuer: "Røde Kors", date: "2024-06" },
          { name: "Lastsikring §17", issuer: "AMU", date: "2022-11" },
        ]),
        title: "Certifikater",
      },
      {
        ...skills(
          [
            "Køre- og hviletidsregler (EU 561/2006)",
            "Tachograph (analog + digital)",
            "Lastsikring og fragtpapirer",
            "ADR-procedurer (klasse 1-9)",
            "Ruteplanlægning",
            "Kundebetjening og levering",
          ],
          "Tekniske",
        ),
        title: "Kompetencer",
      },
      {
        ...languages([
          { name: "Dansk", proficiency: "Modersmål", level: 5 },
          { name: "Tysk", proficiency: "B2", level: 3 },
          { name: "Engelsk", proficiency: "B1", level: 3 },
        ]),
        title: "Sprog",
      },
    ],
  };
}

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
        { id: "scrat1", label: "github.com/sam-cv", url: "https://example.com/sam-cv" },
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
        { id: "be1", label: "alex-cv.example", url: "https://example.com/alex-cv" },
        { id: "be2", label: "linkedin.com/in/alex-cv", url: "https://example.com/in/alex-cv" },
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
 * Austin — fictional full-stack-and-3D-generalist persona for the dark-mode
 * developer template. US-style address + phone, example.com links per the
 * project's anti-real-data rule (see file header). Content + section order
 * mirrors the canonical PhilipSlothCV source so the gallery card reads as
 * a real dev CV: Profile + Experience in the main column, Personal Info +
 * four skill groups + Education in the sidebar (in that order).
 */
function austinPersona(): ResumeData {
  const shell = buildShell("austin", {
    accentColor: "#4ee6a8",
    layout: "sidebar-left",
    headerStyle: "uppercase",
    photo: { enabled: true, shape: "circle", position: "top-right" },
  });
  return {
    ...shell,
    personal: {
      fullName: "Marcus Hayes",
      headline: "Full-stack Developer & 3D Generalist",
      email: "marcus.hayes@example.com",
      phone: "+1 (512) 555-0142",
      location: "1234 Congress Avenue, Austin, TX 78701",
      photoUrl: "/sample-photos/austin.jpg",
      links: [
        {
          id: "au-port",
          label: "Portfolio: marcus-hayes.example.com",
          url: "https://example.com/marcus-hayes",
        },
        {
          id: "au-link",
          label: "LinkedIn: linkedin.com/in/marcus-hayes-cv",
          url: "https://example.com/in/marcus-hayes-cv",
        },
      ],
    },
    // Section order matters: main filter picks summary+experience in array
    // order; sidebar filter picks custom+skills+education in array order.
    // Keeping summary→experience first then sidebar pieces mirrors the
    // canonical CV's reading order.
    sections: [
      summary(
        "Full-stack developer and 3D generalist focused on building things that actually work — from frontend to backend to deployment. No excuses, just results.\n\nI work freelance shipping end-to-end web products, and I publish open-source Blender addons on the side. Picked up multi-agent AI orchestration in 2024 — cron-driven pipelines with scoped permissions and security rails built into every action.",
      ),
      experience(
        {
          role: "Freelance Full-stack Developer",
          company: "marcus-hayes.example.com",
          location: "Austin, TX",
          start: "2023-09",
          end: "",
          current: true,
          bullets: [
            "End-to-end ownership of digital products — from architecture and data model through deployment and what comes after launch. I pick the right stack for the problem and ship work that holds up in production.",
          ],
        },
        {
          role: "Blender Market Creator",
          company: "example.com/creators/marcushayes",
          location: "Remote",
          start: "2021-06",
          end: "",
          current: true,
          bullets: [
            "Six Python-based Blender addons published — a node-vault, batch renderer, geometry-to-Python exporter, and three custom pie menus. Deep grip on the Blender Python API and production rendering pipelines.",
          ],
        },
        {
          role: "AI Pipeline Project",
          company: "Independent project",
          location: "Remote",
          start: "2024-01",
          end: "",
          current: true,
          bullets: [
            "Multi-agent AI orchestration with Claude and other LLMs that fit the job. Cron-driven pipelines, heartbeat-monitored agents, scoped permissions and security rails built into every action — guardrails by design, not bolted on. Shipped production work across addons, websites and backend integrations through custom workflows that hold up under real use. Real customers, real revenue — not only portfolio demos.",
          ],
        },
      ),
      // Personal Info — rendered by the austin template as dotted
      // Label/Value rows. Format must be "Label: Value" per line so the
      // template's InfoRows parser can split correctly.
      {
        id: "sec-personal-info",
        type: "custom",
        title: "Personal Info",
        body: "Born: Mar 14, 1998\nAge: 27\nNationality: American",
        items: [],
        visible: true,
      },
      skills(
        ["Next.js", "React", "TypeScript", "Node.js", "GraphQL", "REST API", "Tailwind"],
        "Web & Backend",
      ),
      skills(
        ["PostgreSQL", "MongoDB", "Supabase", "Firebase", "Redis", "Prisma", "Docker", "Vercel", "Cloudflare"],
        "Database & Cloud",
      ),
      skills(
        ["Blender", "Three.js", "3D Modeling", "Texturing", "Rendering", "Animation"],
        "3D & Creative",
      ),
      skills(
        ["C#", "Python", "Stripe", "Resend", "GitHub", "UI/UX"],
        "Other",
      ),
      education({
        institution: "University of Texas at Austin",
        degree: "B.S.",
        field: "Computer Science",
        location: "Austin, TX",
        start: "2017",
        end: "2021",
      }),
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
        { id: "he1", label: "marit-cv.example", url: "https://example.com/marit-cv" },
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
        { id: "tk1", label: "github.com/ravi-cv", url: "https://example.com/ravi-cv" },
        { id: "tk2", label: "ravi-cv.example", url: "https://example.com/ravi-cv-portfolio" },
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
          url: "https://example.com/projects/vesper-chaos",
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
        { id: "os1", label: "linkedin.com/in/elena-cv", url: "https://example.com/in/elena-cv" },
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
        { id: "ma1", label: "diego-cv.example", url: "https://example.com/diego-cv" },
        { id: "ma2", label: "instagram.com/diego-cv", url: "https://example.com/diego-cv-portfolio" },
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
        { id: "re1", label: "scholar.example.com/sophie-cv", url: "https://example.com/scholar/sophie-cv" },
        { id: "re2", label: "orcid.example/sophie-cv", url: "https://example.com/orcid/sophie-cv" },
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
        { id: "au1", label: "jonas-cv.example", url: "https://example.com/jonas-cv" },
        { id: "au2", label: "linkedin.com/in/jonas-cv", url: "https://example.com/in/jonas-cv" },
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
  // Personas with multiple skill groups (e.g. austin: Web & Backend / Database
  // & Cloud / 3D & Creative / Other) call this helper several times. The id
  // must be unique per call or React flags a duplicate-key warning when the
  // renderer maps over sections.
  const slug = group.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    id: slug ? `sec-skl-${slug}` : "sec-skl",
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

/**
 * Hobbies helper — used by Danish personas where "Fritidsinteresser"
 * is a culturally-expected section (signals integration & personality).
 * Each item is a comma-separated single line; the lightest possible
 * representation matching the schema in `types/resume.ts`.
 *
 * Existing English personas didn't include hobbies because the Anglo
 * CV norm avoids them (reads as filler), so this helper was added late.
 * Available to any persona that wants it.
 */
function hobbies(items: string[]): Section {
  return {
    id: "sec-hob",
    type: "hobbies",
    title: "Hobbies",
    visible: true,
    items: items.map((text, i) => ({
      id: `hob-${i}`,
      text,
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
