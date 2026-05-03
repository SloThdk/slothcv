/**
 * Frederiksberg — sundheds- og social-CV. Til SOSU-assistenter,
 * sygeplejersker, pædagoger, fysioterapeuter, ergoterapeuter,
 * socialrådgivere — segmenter hvor AUTORISATION (Styrelsen for
 * Patientsikkerhed-nummer) og kliniske/pædagogiske kompetencer er de
 * primære recruiter-signaler.
 *
 * Layout:
 *   ┌──────────────────────┬──────────────────────────────────┐
 *   │ Tintet sidebar (32%) │ Main kolonne (68%)               │
 *   │   • foto (cirkel)    │   navn + faglig titel            │
 *   │   • Kontakt          │   Faglig profil                  │
 *   │   • Autorisationer   │   Erhvervserfaring               │
 *   │   • Kompetencer      │   Uddannelse                     │
 *   │   • Sprog            │   Fritidsinteresser              │
 *   │   • Kørekort (links) │                                  │
 *   └──────────────────────┴──────────────────────────────────┘
 *
 * Visuel karakter:
 *   - Soft teal #0D9488 accent — sundheds-/care-register uden at være
 *     kliniske US-medical (cyan/scrub-blue). Dansk public-health
 *     paletten ligner mere muted sea-foam end neon-medical.
 *   - Sidebar baggrund #F0FDFA (very light teal) — tonal accent uden
 *     at konkurrere med foto + autorisations-blok.
 *   - Foto øverst-venstre i sidebar, cirkulær 100 px diameter med
 *     2 px accent-ring — sundheds-CVer er fortsat foto-positive
 *     (kontaktfag).
 *   - Sektionsoverskrifter i sidebar har en accent-prik foran for at
 *     signalere "kompakt blok-sektion" snarere end narrative.
 *   - Hovedkolonne sektioner har en tynd accent-streg over og
 *     titlecase overskrifter — fagligt, ikke skrigende.
 *
 * Industri-fit: SOSU-hjælper, SOSU-assistent, sygeplejerske,
 * sundhedsassistent, pædagog, dagplejer, jordemoder, ergoterapeut,
 * fysioterapeut, socialrådgiver, plejehjemsmedarbejder. Anne
 * Sørensen-segmentet.
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

// Sidebar — kompakte blok-sektioner. Autorisationer/certifikater er
// CENTRALE i sundheds-CVer så de placeres her hvor recruiter scanner
// først.
const SIDEBAR_TYPES = new Set<SectionType>([
  "certifications",
  "skills",
  "languages",
  "references",
]);

export function FrederiksbergTemplate({
  data,
  fixedSize,
  skipOverlay,
}: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const sidebar = visible.filter((s) => SIDEBAR_TYPES.has(s.type));
  const main = visible.filter((s) => !SIDEBAR_TYPES.has(s.type));
  const sidebarPct = Math.round(design.sidebarWidth * 100);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <div
        className="grid gap-6"
        style={{
          gridTemplateColumns: `${sidebarPct}% 1fr`,
        }}
      >
        {/* Sidebar — light-teal baggrund */}
        <aside
          className="relative -m-4 p-5"
          style={{
            background: "#F0FDFA",
            minHeight: "100%",
          }}
        >
          {design.photo.enabled && personal.photoUrl && (
            <div
              data-element-id="personal.photo"
              className="mb-5 cursor-grab overflow-hidden rounded-full mx-auto"
              style={{
                width: 100,
                height: 100,
                ...photoBorderStyle(design, design.accentColor),
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

          <SidebarBlock title="Kontakt" accent={design.accentColor}>
            <div className="space-y-1.5 text-[0.78em]" style={{ color: "#1F2937" }}>
              {personal.email && (
                <div
                  data-element-id="personal.email"
                  className="cursor-grab break-words"
                  style={elementStyle(data, "personal.email")}
                >
                  {personal.email}
                </div>
              )}
              {personal.phone && (
                <div
                  data-element-id="personal.phone"
                  className="cursor-grab"
                  style={elementStyle(data, "personal.phone")}
                >
                  {personal.phone}
                </div>
              )}
              {personal.location && (
                <div
                  data-element-id="personal.location"
                  className="cursor-grab"
                  style={elementStyle(data, "personal.location")}
                >
                  {personal.location}
                </div>
              )}
              {/* Kørekort — kun renderet hvis udfyldt. Sundheds-CVer
                  inkluderer ofte B-kørekort fordi mange roller kræver
                  hjemmebesøg / vagtkørsel. */}
              {personal.koreekort && (
                <div
                  data-element-id="personal.koreekort"
                  className="cursor-grab"
                  style={elementStyle(data, "personal.koreekort")}
                >
                  Kørekort: {personal.koreekort}
                </div>
              )}
              {personal.links.map((l) => (
                <a
                  key={l.id}
                  data-element-id={`personal.links.${l.id}`}
                  className="block cursor-grab break-words hover:underline"
                  href={l.url.startsWith("http") ? l.url : `https://${l.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: design.accentColor,
                    ...elementStyle(data, `personal.links.${l.id}`),
                  }}
                >
                  {l.label || l.url}
                </a>
              ))}
            </div>
          </SidebarBlock>

          {/* Sidebar-sektioner: autorisationer, kompetencer, sprog */}
          <div className="mt-5 space-y-5">
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

        {/* Main kolonne — narrative-sektioner */}
        <div className="pt-1">
          <header
            data-section-id="personal"
            className="mb-6 cursor-pointer rounded-md p-1 -m-1"
          >
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.3em] font-semibold leading-[1.05] tracking-tight"
              style={{
                color: design.textColor,
                fontFamily: "var(--cv-title-font, Inter), Inter, sans-serif",
                ...elementStyle(data, "personal.name"),
              }}
            >
              {personal.fullName || "Dit navn"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-1 block w-fit cursor-text text-[1em] font-medium tracking-[0.04em]"
                style={{
                  color: design.accentColor,
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
          </header>

          <div className="space-y-5">
            {main.map((s) => (
              <MainSection key={s.id} section={s} data={data} />
            ))}
          </div>
        </div>
      </div>
    </TemplateFrame>
  );
}

function SidebarBlock({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: accent }}
        />
        <h3
          className="text-[0.72em] font-bold uppercase tracking-[0.18em]"
          style={{ color: accent }}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
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
      <div className="mb-2 flex items-center gap-1.5">
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: accent }}
        />
        <h3
          className="text-[0.72em] font-bold uppercase tracking-[0.18em]"
          style={{ color: accent }}
        >
          <EditableSectionTitle sid={section.id} data={data}>
            {section.title}
          </EditableSectionTitle>
        </h3>
      </div>
      <SectionBody section={section} design={d} data={data} />
      <SectionActions section={section} />
    </section>
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
      <div
        aria-hidden
        className="mb-2 h-px w-full"
        style={{ background: `${d.accentColor}33` }}
      />
      <h2
        className="mb-2 text-[1.05em] font-semibold tracking-tight"
        style={{ color: d.accentColor }}
      >
        <EditableSectionTitle sid={section.id} data={data}>
          {section.title}
        </EditableSectionTitle>
      </h2>
      <SectionBody section={section} design={d} data={data} />
      <SectionActions section={section} />
    </section>
  );
}
