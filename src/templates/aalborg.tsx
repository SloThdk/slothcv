/**
 * Aalborg — faglært dansk CV. Designet til håndværkere, industriteknikere,
 * mekanikere — segmenter hvor svendebrev + autorisationer + sikkerheds-
 * certifikater er centrale ansættelses-signaler.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ HEADER BAND (slate, fuld bredde):                        │
 *   │   Navn (hvid, oversize) + tagline + kontakt              │
 *   ├──────────────────────────────────┬───────────────────────┤
 *   │ Hovedkolonne 2/3 (narrative)     │ Sidebar 1/3           │
 *   │   Faglig profil                  │   Foto                │
 *   │   Erhvervserfaring               │   Certificeringer     │
 *   │   Uddannelse (incl. svendebrev)  │   Kompetencer         │
 *   │                                  │   Sprog               │
 *   └──────────────────────────────────┴───────────────────────┘
 *
 * Visuel karakter:
 *   - Slate header-bånd #334155 trækker sig fuld bredde og bryder med
 *     den traditionelle "name centered on white"-stil — mere
 *     industriel og fast-grebs-feel.
 *   - Hvid hovedkolonne, light grey sidebar (#F1F5F9) for visuel
 *     hierarki.
 *   - Sektionsoverskrifter i ALL-CAPS tracked +0.12em — workmanship
 *     register, ikke æstetisk-kreativ.
 *   - Certificeringer fremhævet i sidebar med datokomponent — det
 *     første en faglært-recruiter scanner.
 *   - Foto kvadrat 90 px, sub-tle grå border. Kvadrat snarere end
 *     cirkel signalerer "praktisk, ikke prangende".
 *
 * Industri-fit: el-installatør, vvs, smed, maskinmekaniker, industri-
 * tekniker, automekaniker, snedker, blikkenslager, isolatør,
 * metalarbejder. Lars Andersen-segmentet.
 */

"use client";

import { TemplateFrame } from "./frame";
import { EditableSectionTitle, SectionBody } from "./components";
import { SectionActions } from "./section-actions";
import {
  elementStyle,
  photoBorderStyle,
  positionStyle,
  resolveDesign,
  visibleSections,
} from "./shared";
import type { ResumeData, Section, SectionType } from "@/types/resume";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

// Sidebar tager certifikater + kompetencer + sprog. Resten (faglig
// profil, erhvervserfaring, uddannelse, projekter, frivilligt arbejde)
// hører til hovedkolonnen.
const SIDEBAR_TYPES = new Set<SectionType>([
  "certifications",
  "skills",
  "languages",
  "hobbies",
  "references",
]);

export function AalborgTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const sidebar = visible.filter((s) => SIDEBAR_TYPES.has(s.type));
  const main = visible.filter((s) => !SIDEBAR_TYPES.has(s.type));

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Header band — fuld bredde slate. Den eneste accent-blok i
          hele CV'et. Templatet inverter "negativ space" hvor navn er
          hvidt på mørkt — får trades-CV'et til at læse "robust",
          ikke "delicate". */}
      <header
        data-section-id="personal"
        className="-m-4 mb-6 cursor-pointer p-5"
        style={{ background: design.accentColor }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.4em] font-bold leading-[1.05] tracking-tight"
              style={{
                color: "#FFFFFF",
                fontFamily: "var(--cv-title-font, Inter), Inter, sans-serif",
                ...elementStyle(data, "personal.name"),
              }}
            >
              {personal.fullName || "Dit navn"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-1 block w-fit cursor-text text-[0.95em] font-semibold uppercase tracking-[0.14em]"
                style={{
                  color: "#FFFFFFCC",
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
            <BandContact data={data} />
          </div>
          {design.photo.enabled && personal.photoUrl && (
            <div
              data-element-id="personal.photo"
              className="cursor-grab overflow-hidden rounded-md"
              style={{
                width: 90,
                height: 90,
                flexShrink: 0,
                // box-shadow + design.photo.borderColor override (Design → Photo → Border)
                boxShadow: `0 0 0 2px transparent, 0 0 0 4px ${design.photo.borderColor || "rgba(255,255,255,0.3)"}`,
                ...elementStyle(data, "personal.photo"),
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={personal.photoUrl}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </div>
      </header>

      {/* Body — 2/3 main + 1/3 sidebar grid */}
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        {/* Main kolonne — faglig profil, erhvervserfaring, uddannelse */}
        <div className="space-y-5">
          {main.map((s) => (
            <MainSection key={s.id} section={s} data={data} />
          ))}
        </div>

        {/* Sidebar kolonne — certifikater + kompetencer + sprog */}
        <aside
          className="rounded-md p-3"
          style={{ background: "#F1F5F9", minHeight: "100%" }}
        >
          <div className="space-y-4">
            {sidebar.map((s) => (
              <SidebarSection
                key={s.id}
                section={s}
                data={data}
                accent={design.accentColor}
              />
            ))}
          </div>
        </aside>
      </div>
    </TemplateFrame>
  );
}

/** Kontakt-linjer i header-båndet — hvide tone på slate. Inline med
 *  punkt-separator, samme klikbare data-element-id pattern som
 *  resten af templatesne. */
function BandContact({ data }: { data: ResumeData }) {
  const { personal } = data;
  const dot = (
    <span aria-hidden style={{ color: "rgba(255,255,255,0.4)" }}>
      ·
    </span>
  );
  const items: React.ReactNode[] = [];
  if (personal.email) {
    items.push(
      <span
        key="email"
        data-element-id="personal.email"
        className="cursor-text"
        style={elementStyle(data, "personal.email")}
      >
        {personal.email}
      </span>,
    );
  }
  if (personal.phone) {
    items.push(
      <span
        key="phone"
        data-element-id="personal.phone"
        className="cursor-text"
        style={elementStyle(data, "personal.phone")}
      >
        {personal.phone}
      </span>,
    );
  }
  if (personal.location) {
    items.push(
      <span
        key="location"
        data-element-id="personal.location"
        className="cursor-text"
        style={elementStyle(data, "personal.location")}
      >
        {personal.location}
      </span>,
    );
  }
  // Kørekort (dansk CV-norm) — kritisk for håndværkere med servicebil
  // / firmakøretøj. Inline i header-båndet.
  if (personal.koreekort) {
    items.push(
      <span
        key="koreekort"
        data-element-id="personal.koreekort"
        className="cursor-text"
        style={elementStyle(data, "personal.koreekort")}
      >
        Kørekort: {personal.koreekort}
      </span>,
    );
  }
  for (const l of personal.links) {
    items.push(
      <a
        key={l.id}
        data-element-id={`personal.links.${l.id}`}
        className="cursor-text hover:underline"
        href={l.url.startsWith("http") ? l.url : `https://${l.url}`}
        target="_blank"
        rel="noopener noreferrer"
        style={elementStyle(data, `personal.links.${l.id}`)}
      >
        {l.label || l.url}
      </a>,
    );
  }
  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.84em]"
      style={{ color: "rgba(255,255,255,0.85)" }}
    >
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {it}
          {i < items.length - 1 && dot}
        </span>
      ))}
    </div>
  );
}

function MainSection({
  section,
  data,
}: {
  section: Section;
  data: ResumeData;
}) {
  const d = resolveDesign(data.design, section);
  return (
    <section
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1"
    >
      <h2
        className="mb-2 text-[0.92em] font-bold uppercase tracking-[0.14em]"
        style={{ color: d.accentColor }}
      >
        <EditableSectionTitle sid={section.id} data={data}>
          {section.title}
        </EditableSectionTitle>
      </h2>
      <div
        aria-hidden
        className="mb-2 h-px w-full"
        style={{ background: `${d.accentColor}33` }}
      />
      <SectionBody section={section} design={d} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function SidebarSection({
  section,
  data,
  accent,
}: {
  section: Section;
  data: ResumeData;
  accent: string;
}) {
  const d = resolveDesign(data.design, section);
  return (
    <section
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1"
    >
      <h3
        className="mb-2 text-[0.78em] font-bold uppercase tracking-[0.16em]"
        style={{ color: accent }}
      >
        <EditableSectionTitle sid={section.id} data={data}>
          {section.title}
        </EditableSectionTitle>
      </h3>
      <SectionBody section={section} design={d} data={data} />
      <SectionActions section={section} />
    </section>
  );
}
