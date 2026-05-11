/**
 * Template registry — single source of truth for which templates exist
 * and what they look like in the picker.
 *
 * Each template ships as a single flat `<id>.tsx` under `src/templates/`
 * — a React component that renders the CV as DOM. The PDF export reuses
 * that same component via `window.print()`; there is no separate
 * react-pdf renderer per template (an earlier iteration tried that path
 * and ran into subpixel font drift; the current single-source-of-truth
 * approach is documented in `src/lib/pdf-export.tsx`).
 *
 * Adding a template = create `src/templates/<id>.tsx` + add an entry
 * to the list below. The Templates tab in the editor reads this list
 * to render the gallery.
 */

import type { TemplateId } from "@/types/resume";

/** Design controls in the Design tab. Templates can hide controls that
 *  they don't honor in their render — keeps the Design tab honest about
 *  what actually changes the preview. Adding a new control: extend this
 *  union, wire it in design-tab.tsx behind an `isHidden(key)` check.
 *
 *  Currently-tracked dead controls (hidden globally because no template
 *  reads the corresponding `design.*` field):
 *    - "dividerStyle" — the `<Divider />` component exists but no
 *      template imports it, so the design.dividerStyle picker had no
 *      effect anywhere. Hidden globally until at least one template
 *      adopts <Divider /> under its section headers.
 */
export type DesignControlKey =
  | "typography"
  | "fontScale"
  | "letterSpacing"
  | "headerStyle"
  | "dividerStyle"
  | "bulletStyle"
  | "skillBarStyle"
  | "sidebarWidth"
  | "pageMargin"
  | "photo"
  | "photoPosition"
  | "watermark";

/** Controls that no template honors today — hidden globally regardless
 *  of which template is active. Move an entry out of here the moment a
 *  template starts consuming the corresponding design field.
 *
 *  - dividerStyle: no template imports <Divider /> (the component that
 *    consumes design.dividerStyle).
 *  - photoPosition: no template reads design.photo.position. Each
 *    template's layout hard-codes the photo's slot (e.g. Berlin always
 *    puts it sidebar-top, Aurora always top-right), so the picker would
 *    dispatch state nothing reads. Re-positioning would require per-
 *    template grid reflow logic, not a global override. Hide until at
 *    least one template's layout is parameterised on photo.position. */
export const GLOBALLY_HIDDEN_CONTROLS: ReadonlySet<DesignControlKey> = new Set([
  "dividerStyle",
  "photoPosition",
]);

export interface TemplateMeta {
  id: TemplateId;
  /** Display name shown in the picker. */
  name: string;
  /** One-line pitch — shown under the name in the gallery card. */
  blurb: string;
  /** Tailwind gradient classes used as a placeholder thumbnail. Keeps the
   *  bundle small (no image assets) while we iterate; we can swap in real
   *  PNGs later. */
  thumbGradient: string;
  /** Hint colors for the SVG mock thumbnail. */
  swatch: { primary: string; bg: string };
  /** Language pool for the gallery filter. `"da"` marks templates whose
   *  section names + personal-info block follow Danish CV conventions
   *  (Erhvervserfaring / Uddannelse / Sprog / Kørekort / etc.). Absence
   *  of the field means English-pool — keeps the existing 47 entries
   *  untouched. The filter UI surfaces this as "Alle / English / Dansk
   *  CV" pill-tabs above the gallery. */
  language?: "en" | "da";
  /** Design controls this template doesn't honor. The Design tab hides
   *  them when this template is active. Each entry must correspond to
   *  a real architectural gap (the template's render code doesn't read
   *  the matching design.<field>) — adding a control here without
   *  fixing it is honest, but the real fix is wiring it through. */
  hiddenDesignControls?: ReadonlyArray<DesignControlKey>;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "scratch",
    name: "Scratch",
    blurb: "Blank canvas. Pure layout, you style every control.",
    thumbGradient: "from-neutral-50 to-neutral-200",
    swatch: { primary: "#0f172a", bg: "#ffffff" },
  },
  {
    id: "berlin",
    name: "Berlin",
    blurb: "Modern sidebar with photo and accent stripe.",
    thumbGradient: "from-blue-50 to-indigo-100",
    swatch: { primary: "#2563eb", bg: "#ffffff" },
  },
  {
    id: "helsinki",
    name: "Helsinki",
    blurb: "Minimal single column. Typography does the work.",
    thumbGradient: "from-stone-50 to-stone-200",
    swatch: { primary: "#0a0a0a", bg: "#ffffff" },
  },
  {
    id: "tokyo",
    name: "Tokyo",
    blurb: "Two-column dense, accent on every heading.",
    thumbGradient: "from-rose-50 to-pink-100",
    swatch: { primary: "#e11d48", bg: "#ffffff" },
  },
  {
    id: "oslo",
    name: "Oslo",
    blurb: "Classic serif, ATS-bulletproof, conservative.",
    thumbGradient: "from-amber-50 to-yellow-100",
    swatch: { primary: "#854d0e", bg: "#fefce8" },
  },
  {
    id: "madrid",
    name: "Madrid",
    blurb: "Creative color blocks, designer-friendly.",
    thumbGradient: "from-emerald-50 to-teal-100",
    swatch: { primary: "#047857", bg: "#ffffff" },
  },
  {
    id: "reykjavik",
    name: "Reykjavik",
    blurb: "Academic, publications-first, long-form friendly.",
    thumbGradient: "from-slate-50 to-slate-200",
    swatch: { primary: "#1e293b", bg: "#ffffff" },
  },
  {
    id: "aurora",
    name: "Aurora",
    blurb: "Dark mode, mint accent, sidebar with skill chips, big watermark.",
    thumbGradient: "from-slate-900 to-slate-950",
    swatch: { primary: "#7FFAB6", bg: "#0F1419" },
  },
  {
    id: "eclipse",
    name: "Eclipse",
    blurb:
      "Dark editorial. Italic Fraunces serif name, warm amber accent, single-column writing focus.",
    thumbGradient: "from-stone-900 to-amber-950",
    swatch: { primary: "#F4B860", bg: "#0E0B08" },
  },
  {
    id: "copenhagen",
    name: "Copenhagen",
    blurb:
      "Scandinavian minimal. Generous whitespace, hairline rules only, no accent color.",
    thumbGradient: "from-stone-50 to-stone-100",
    swatch: { primary: "#1A1A1A", bg: "#FAFAF7" },
  },
  {
    id: "vienna",
    name: "Vienna",
    blurb:
      "High-contrast monochrome. Pure black on pure white, all-caps tracked headings — ATS-perfect.",
    thumbGradient: "from-white to-neutral-100",
    swatch: { primary: "#000000", bg: "#FFFFFF" },
  },
  {
    id: "manhattan",
    name: "Manhattan",
    blurb:
      "Corporate executive. Navy + muted gold, 35/65 sidebar, Lora serif name with metric callouts.",
    thumbGradient: "from-slate-50 to-amber-50",
    swatch: { primary: "#0A1F44", bg: "#F8F8F6" },
  },
  {
    id: "cambridge",
    name: "Cambridge",
    blurb:
      "Academic. Year-in-gutter publications, EB Garamond serif, hanging-indent citations.",
    thumbGradient: "from-stone-50 to-rose-50",
    swatch: { primary: "#5C0E1F", bg: "#FFFFFF" },
  },
  {
    id: "blank",
    name: "Blank",
    blurb:
      "Empty canvas. Drop in shapes, lines, text, and images from the Add tab.",
    thumbGradient: "from-neutral-100 to-neutral-50",
    swatch: { primary: "#94a3b8", bg: "#ffffff" },
  },
  // ── Modern minimalist ───────────────────────────────────────────────
  {
    id: "helvetica",
    name: "Helvetica",
    blurb: "Swiss minimal. Hairline rules, monospace dates, ragged-right body.",
    thumbGradient: "from-zinc-50 to-zinc-100",
    swatch: { primary: "#18181b", bg: "#ffffff" },
  },
  {
    id: "geist",
    name: "Geist",
    blurb:
      "Vercel-flavored. Tight grid, monospace metrics column, frontend-dev native.",
    thumbGradient: "from-neutral-50 to-neutral-100",
    swatch: { primary: "#000000", bg: "#fafafa" },
  },
  {
    id: "notion",
    name: "Notion",
    blurb:
      "Friendly geometric sans, soft gray cards, callout-style section heads.",
    thumbGradient: "from-stone-50 to-stone-100",
    swatch: { primary: "#37352f", bg: "#fbfbfa" },
  },
  {
    id: "linear",
    name: "Linear",
    blurb:
      "Editorial dark cream. JetBrains Mono dates, indigo accent, engineering polish.",
    thumbGradient: "from-stone-100 to-indigo-50",
    swatch: { primary: "#5e6ad2", bg: "#f8f7f4" },
  },
  {
    id: "stripe",
    name: "Stripe",
    blurb: "Indigo + lavender. Soft gradient section heads, fintech-corporate.",
    thumbGradient: "from-violet-50 to-indigo-100",
    swatch: { primary: "#635bff", bg: "#ffffff" },
  },
  // ── Dark / editorial ────────────────────────────────────────────────
  {
    id: "obsidian",
    name: "Obsidian",
    blurb:
      "Pure black. White serif name, electric purple accent, power-user aesthetic.",
    thumbGradient: "from-neutral-950 to-purple-950",
    swatch: { primary: "#a78bfa", bg: "#0a0a0a" },
  },
  {
    id: "carbon",
    name: "Carbon",
    blurb:
      "Dark grey IBM Plex Mono. Structured grid, IBM-Carbon-Design-System aesthetic.",
    thumbGradient: "from-stone-900 to-stone-800",
    swatch: { primary: "#0f62fe", bg: "#161616" },
  },
  {
    id: "midnight",
    name: "Midnight",
    blurb:
      "Navy + gold accent. EB Garamond serif throughout, old-money executive.",
    thumbGradient: "from-blue-950 to-amber-900",
    swatch: { primary: "#d4af37", bg: "#0a1628" },
  },
  {
    id: "onyx",
    name: "Onyx",
    blurb:
      "Black with magenta-cyan gradient mesh accent. Designer's dark mode.",
    thumbGradient: "from-zinc-950 to-fuchsia-950",
    swatch: { primary: "#e879f9", bg: "#09090b" },
  },
  {
    id: "graphite",
    name: "Graphite",
    blurb:
      "Charcoal sidebar with off-white body. Architect / industrial design feel.",
    thumbGradient: "from-stone-700 to-stone-100",
    swatch: { primary: "#44403c", bg: "#fafaf9" },
  },
  // ── Sidebar / two-column ────────────────────────────────────────────
  {
    id: "geneva",
    name: "Geneva",
    blurb:
      "Banking. Wide right sidebar with KPI tiles, narrow main with prose.",
    thumbGradient: "from-slate-100 to-blue-50",
    swatch: { primary: "#1e3a8a", bg: "#ffffff" },
  },
  {
    id: "zurich",
    name: "Zurich",
    blurb: "Consulting. Narrow left sidebar (skills + languages), wide main.",
    thumbGradient: "from-slate-50 to-slate-200",
    swatch: { primary: "#334155", bg: "#ffffff" },
  },
  {
    id: "frankfurt",
    name: "Frankfurt",
    blurb:
      "Heavy black sidebar with photo. Strong sans serif, German engineering.",
    thumbGradient: "from-neutral-900 to-neutral-200",
    swatch: { primary: "#171717", bg: "#fafafa" },
  },
  {
    id: "singapore",
    name: "Singapore",
    blurb:
      "Vertical right sidebar with rotated section accents, Asian-flavored design.",
    thumbGradient: "from-red-50 to-yellow-50",
    swatch: { primary: "#dc2626", bg: "#fffbeb" },
  },
  {
    id: "dubai",
    name: "Dubai",
    blurb: "Luxury finance. Gold sidebar with hairline rules, deep navy body.",
    thumbGradient: "from-amber-50 to-blue-950",
    swatch: { primary: "#c9a449", bg: "#0e1a3a" },
  },
  // ── Bento / grid / dashboard ────────────────────────────────────────
  {
    id: "bento",
    name: "Bento",
    blurb:
      "Asymmetric 6-cell CSS grid. Modern web feel for creatives + designers.",
    thumbGradient: "from-pink-50 to-orange-50",
    swatch: { primary: "#ea580c", bg: "#ffffff" },
  },
  {
    id: "mosaic",
    name: "Mosaic",
    blurb:
      "Many small tile sections, colored backgrounds per section. Marketing native.",
    thumbGradient: "from-cyan-50 to-pink-50",
    swatch: { primary: "#0891b2", bg: "#ffffff" },
  },
  {
    id: "dashboard",
    name: "Dashboard",
    blurb:
      "Skill bars + KPI tiles + metric callouts. Sales / operations / data roles.",
    thumbGradient: "from-emerald-50 to-blue-50",
    swatch: { primary: "#059669", bg: "#ffffff" },
  },
  {
    id: "atlas",
    name: "Atlas",
    blurb:
      "World-map stylized layout. Pin-style location markers, travel / journalist.",
    thumbGradient: "from-sky-50 to-amber-50",
    swatch: { primary: "#0369a1", bg: "#fefdf8" },
  },
  {
    id: "heidelberg",
    name: "Heidelberg",
    blurb:
      "Humanities. Triple-column dense, EB Garamond, footnote-style hanging citations.",
    thumbGradient: "from-amber-50 to-stone-100",
    swatch: { primary: "#7c2d12", bg: "#fefdfb" },
  },
  // ── Academic ────────────────────────────────────────────────────────
  {
    id: "boston",
    name: "Boston",
    blurb:
      "STEM PhD. Computer Modern serif (LaTeX-flavored), publication-heavy, BibTeX feel.",
    thumbGradient: "from-rose-50 to-stone-50",
    swatch: { primary: "#7f1d1d", bg: "#ffffff" },
  },
  {
    id: "stanford",
    name: "Stanford",
    blurb:
      "Tech academia. Cardinal red accent, modern sans, mid-density academic.",
    thumbGradient: "from-red-50 to-stone-50",
    swatch: { primary: "#8c1515", bg: "#ffffff" },
  },
  // ── Executive / finance ─────────────────────────────────────────────
  {
    id: "madison",
    name: "Madison",
    blurb:
      "Wall Street. Conservative two-column, navy + gold, results-first executive.",
    thumbGradient: "from-blue-100 to-amber-50",
    swatch: { primary: "#1e3a8a", bg: "#ffffff" },
  },
  {
    id: "mayfair",
    name: "Mayfair",
    blurb:
      "London consulting. Cream paper, deep burgundy accent, italic Tiempos serif.",
    thumbGradient: "from-rose-50 to-stone-100",
    swatch: { primary: "#7e1d1d", bg: "#fdfaf6" },
  },
  {
    id: "davos",
    name: "Davos",
    blurb:
      "Strategy / board. Wide spacing, all-caps headers, very minimal exec.",
    thumbGradient: "from-slate-50 to-zinc-100",
    swatch: { primary: "#0c0a09", bg: "#fafaf9" },
  },
  // ── Creative / portfolio ────────────────────────────────────────────
  {
    id: "atelier",
    name: "Atelier",
    blurb:
      "Fashion / art. Cream paper, Caslon serif + Helvetica mix, painterly accents.",
    thumbGradient: "from-stone-100 to-rose-50",
    swatch: { primary: "#451a03", bg: "#fdf6e3" },
  },
  {
    id: "studio",
    name: "Studio",
    blurb:
      "Magazine spread. Oversized name, large hero image area, photographer / director.",
    thumbGradient: "from-neutral-100 to-neutral-50",
    swatch: { primary: "#0a0a0a", bg: "#fafafa" },
  },
  {
    id: "canvas",
    name: "Canvas",
    blurb:
      "Off-white textured background, watercolor accents. Illustrator / painter native.",
    thumbGradient: "from-blue-50 to-emerald-50",
    swatch: { primary: "#0e7490", bg: "#fcfbf7" },
  },
  // ── Industry-specific ───────────────────────────────────────────────
  {
    id: "scrubs",
    name: "Scrubs",
    blurb:
      "Medical. Clinical clean white, structured for licenses + residencies + CME.",
    thumbGradient: "from-cyan-50 to-emerald-50",
    swatch: { primary: "#0e7490", bg: "#ffffff" },
  },
  {
    id: "founder",
    name: "Founder",
    blurb:
      "Pitch-deck inspired. Hero quote + Currently / Previously / Press pillars.",
    thumbGradient: "from-violet-50 to-orange-50",
    swatch: { primary: "#6d28d9", bg: "#ffffff" },
  },
  // ── Visual / executive expansion (late 2026) ──────────────────────
  {
    id: "capitol",
    name: "Capitol",
    blurb:
      "Dark navy header band with circular photo, vertical-timeline body where each section anchors to an accent dot.",
    thumbGradient: "from-slate-900 to-blue-900",
    swatch: { primary: "#1e3a8a", bg: "#ffffff" },
  },
  {
    id: "vesterbro",
    name: "Vesterbro",
    blurb:
      "Centered photo at top, two-column body, soft blue accent badges with section icons. Danish-friendly.",
    thumbGradient: "from-sky-50 to-blue-100",
    swatch: { primary: "#2563eb", bg: "#fdfdfb" },
  },
  {
    id: "marina",
    name: "Marina",
    blurb:
      "Dark teal header with photo + soft radial highlight, tinted-gray sidebar carrying contact + skills, white narrative column.",
    thumbGradient: "from-teal-900 to-cyan-100",
    swatch: { primary: "#0f766e", bg: "#ffffff" },
  },
  // ── Danish CV pool ─────────────────────────────────────────────────
  // Three templates following Danish hiring conventions per Scout's
  // research (research/danish-cv-templates.md). Section names render
  // in Danish, the personal-info block carries Fødselsdato / Civilstatus
  // / Nationalitet / Kørekort surfaces via Personal section labels,
  // photo policy spans the active norm split (ON / OFF / toggleable),
  // and the gallery filter surfaces these as "Dansk CV" pills.
  {
    id: "aarhus",
    name: "Aarhus",
    blurb:
      "Klassisk dansk CV. Sidebjælke med foto, fuld personalia-blok, navy + creme. Til offentlig sektor, finans, jura, SMV.",
    thumbGradient: "from-slate-50 to-blue-50",
    swatch: { primary: "#1F3A5F", bg: "#F4F1EC" },
    language: "da",
  },
  {
    id: "roskilde",
    name: "Roskilde",
    blurb:
      "Moderne minimal dansk CV. Enkelt-spalte, ingen foto, ATS-venlig. Til tech, startup, store internationale arbejdsgivere i København.",
    thumbGradient: "from-neutral-50 to-stone-100",
    swatch: { primary: "#0A0A0A", bg: "#FFFFFF" },
    language: "da",
  },
  {
    id: "odense",
    name: "Odense",
    blurb:
      "Skandinavisk hybrid. Header-bånd med valgfrit foto + 60/40 to-spalte. Salviegrøn accent på cremepapir. Til marketing, kommunikation, kreative roller.",
    thumbGradient: "from-stone-50 to-emerald-50",
    swatch: { primary: "#7C9082", bg: "#FAFAF7" },
    language: "da",
  },
  // ── Industri-udvidelse (2026-05-04): ufaglærte, faglærte, sundhed.
  {
    id: "vejle",
    name: "Vejle",
    blurb:
      "Ufaglært dansk CV. Enkelt 1-side layout, foto øverst, kørekort fremhævet. Til lager-, butiks-, rengørings- og kantinejob. Varm og venlig tone.",
    thumbGradient: "from-amber-50 to-orange-100",
    swatch: { primary: "#D97706", bg: "#FFFBF2" },
    language: "da",
  },
  {
    id: "aalborg",
    name: "Aalborg",
    blurb:
      "Faglært dansk CV. Kraftigt header-bånd + 2/3 erhvervserfaring og 1/3 certificeringer. Svendebrev og kørekort-kategorier fremhævet. Til el, vvs, mekanik, smede og industri.",
    thumbGradient: "from-slate-100 to-zinc-200",
    swatch: { primary: "#334155", bg: "#FFFFFF" },
    language: "da",
  },
  {
    id: "frederiksberg",
    name: "Frederiksberg",
    blurb:
      "Sundhed og social-CV. Tintet teal sidebjælke med foto + autorisationer, hovedkolonne med erhvervserfaring og uddannelse. Til SOSU, sygeplejersker, pædagoger, terapeuter.",
    thumbGradient: "from-teal-50 to-cyan-100",
    swatch: { primary: "#0D9488", bg: "#F0FDFA" },
    language: "da",
  },
  // ── Service / detailhandel / transport-udvidelse (2026-05-04) ────
  {
    id: "helsingor",
    name: "Helsingør",
    blurb:
      "Café- og hospitality-CV. Cremepapir med terracotta accent, varm serif-tone, foto i cirkel. Til barista, kok, tjener, hotel- og restaurantmedarbejder.",
    thumbGradient: "from-orange-50 to-amber-100",
    swatch: { primary: "#B45309", bg: "#FBF8F3" },
    language: "da",
  },
  {
    id: "silkeborg",
    name: "Silkeborg",
    blurb:
      "Detailhandels-CV. Hvid baggrund med navy accent, header-bånd med foto, KPI-fliser med år-i-detail og kompetencer. Til Bauhaus, Jysk, Føtex, Bilka, salgsassistent, kasseoperatør.",
    thumbGradient: "from-blue-50 to-slate-100",
    swatch: { primary: "#1E40AF", bg: "#FFFFFF" },
    language: "da",
  },
  {
    id: "aabenraa",
    name: "Aabenraa",
    blurb:
      "Transport- og chauffør-CV. Sidebar med kørekort-kategorier som badges + certifikater (ADR, EU-direktiv 5). Til lastbil, varevogn, taxi, kurer, busschauffør.",
    thumbGradient: "from-zinc-100 to-yellow-50",
    swatch: { primary: "#1A1A1A", bg: "#FFFFFF" },
    language: "da",
  },
  // ── US developer pool ────────────────────────────────────────────
  {
    id: "austin",
    name: "Austin",
    blurb:
      "Dark-mode developer CV. Charcoal page, mint accent, chip-style skill groups, round photo top-right, big 'CV' wordmark. For full-stack devs, 3D generalists, indie hackers.",
    thumbGradient: "from-slate-900 to-emerald-900",
    swatch: { primary: "#4ee6a8", bg: "#0c1410" },
  },
];

export const TEMPLATES_BY_ID: Record<TemplateId, TemplateMeta> =
  TEMPLATES.reduce(
    (acc, t) => {
      acc[t.id] = t;
      return acc;
    },
    {} as Record<TemplateId, TemplateMeta>,
  );
