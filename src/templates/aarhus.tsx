/**
 * Aarhus — klassisk dansk CV. Sidebar med foto, fuld personalia-blok,
 * navy + creme palette. Modelleret på Ase's kanoniske rækkefølge for
 * dansk CV-opbygning (research/danish-cv-templates.md):
 *
 *   ┌──────────────────────────┬──────────────────────────────────┐
 *   │ creme sidebar (32%)      │ main column (68%)                │
 *   │   • foto (cirkel)        │   navn + faglig titel            │
 *   │   • Kontaktoplysninger   │   Faglig profil                  │
 *   │   • Sprog                │   Erhvervserfaring               │
 *   │   • IT-kompetencer       │   Uddannelse                     │
 *   │   • Kørekort             │   Fritidsinteresser (valgfri)    │
 *   │   • Referencer           │                                  │
 *   └──────────────────────────┴──────────────────────────────────┘
 *
 * Visuel karakter:
 *   - Sidebar med #F4F1EC (creme) baggrund, dæmpet Dannebrog-navy
 *     (#1F3A5F) som primær accent.
 *   - Foto øverst, cirkulær, 110 px diameter med 2 px accent-ring.
 *   - Sektionsoverskrifter i sidebar er små-caps, tracked accent-tinted.
 *   - Hovedkolonnen har navn på 2.4em, faglig titel som understreget
 *     accent-tekst, og hver sektion har en tynd accent-streg over.
 *   - Tilstrækkeligt formel til offentlig sektor og finans, ikke så
 *     stiv at den støder yngre mid-niveau ansøgere væk.
 *
 * Industri-fit: offentlig sektor, finans, jura, sundhedsadministration,
 * SMV i Jylland. Rekrutterer 45+ der skimmer en bunke på papir.
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

// Sektioner der hører til sidebar-spalten i et klassisk dansk CV.
// Faglig profil + Erhvervserfaring + Uddannelse + Fritidsinteresser
// hører til hovedkolonnen; resten i sidebar.
const SIDEBAR_TYPES = new Set<SectionType>([
  "skills",
  "languages",
  "certifications",
  "references",
]);

export function AarhusTemplate({ data, fixedSize, skipOverlay }: Props) {
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
        {/* Sidebar — creme baggrund, ingen accent-stripe (mere afdæmpet
            end Berlin's mere energiske look). */}
        <aside
          className="relative -m-4 p-5"
          style={{
            background: "#F4F1EC",
            minHeight: "100%",
          }}
        >
          {design.photo.enabled && personal.photoUrl && (
            <div
              data-element-id="personal.photo"
              className="mb-5 cursor-grab overflow-hidden rounded-full"
              style={{
                width: 110,
                height: 110,
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

          {/* Kontaktoplysninger — labels på dansk. Hver række er
              data-element-id-tagget så brugeren kan free-drag og
              inline-edit individuelle felter. */}
          <SidebarHeading title="Kontakt" accent={design.accentColor} />
          <div className="mb-6 space-y-1 text-[0.78em]">
            {personal.email && (
              <Detail
                label="E-mail"
                value={personal.email}
                accent={design.accentColor}
                id="personal.email"
                data={data}
              />
            )}
            {personal.phone && (
              <Detail
                label="Telefon"
                value={personal.phone}
                accent={design.accentColor}
                id="personal.phone"
                data={data}
              />
            )}
            {personal.location && (
              <Detail
                label="Adresse"
                value={personal.location}
                accent={design.accentColor}
                id="personal.location"
                data={data}
              />
            )}
            {personal.links.map((l) => (
              <Detail
                key={l.id}
                label={l.label || "Link"}
                value={l.url}
                href={l.url}
                accent={design.accentColor}
                id={`personal.links.${l.id}`}
                data={data}
              />
            ))}
          </div>

          {/* Sidebar-sektioner: Sprog, Kompetencer, Certificeringer,
              Referencer. Hver renderes med en lille accent-tracked
              overskrift — mere "kontorlig dansk" end Berlin's mere
              prangende stil. */}
          <div className="space-y-5">
            {sidebar.map((s) => (
              <SidebarSection key={s.id} section={s} data={data} />
            ))}
          </div>
        </aside>

        {/* Main column */}
        <div className="pt-1">
          <header
            data-section-id="personal"
            className="mb-6 cursor-pointer rounded-md p-1 -m-1"
          >
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.4em] font-semibold leading-[1.05] tracking-tight"
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
                className="mt-1 block w-fit cursor-text text-[0.95em] font-medium tracking-[0.06em]"
                style={{
                  color: design.accentColor,
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
            {/* Tynd accent-rule under navn + titel — afsluttet med en
                dansk-typisk subtil signal om at "her starter CV'et". */}
            <div
              aria-hidden
              className="mt-3 h-px w-16"
              style={{ background: design.accentColor }}
            />
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

function SidebarHeading({ title, accent }: { title: string; accent: string }) {
  return (
    <h2
      className="mb-2 text-[0.7em] font-semibold uppercase tracking-[0.18em]"
      style={{ color: accent }}
    >
      {title}
    </h2>
  );
}

function Detail({
  label,
  value,
  accent,
  id,
  data,
  href,
}: {
  label: string;
  value: string;
  accent: string;
  id: string;
  data: ResumeData;
  href?: string;
}) {
  const valueClass = "block w-fit cursor-text leading-snug";
  return (
    <div
      data-element-id={id}
      className="cursor-grab"
      style={elementStyle(data, id)}
    >
      <span
        className="block text-[0.85em] font-medium uppercase tracking-[0.12em]"
        style={{ color: `${accent}cc` }}
      >
        {label}
      </span>
      {href ? (
        <a
          className={`${valueClass} hover:underline`}
          style={{ color: "#1F2937" }}
          href={href.startsWith("http") ? href : `https://${href}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {value}
        </a>
      ) : (
        <span className={valueClass}>{value}</span>
      )}
    </div>
  );
}

function SidebarSection({
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
      <SidebarHeading title={section.title} accent={d.accentColor} />
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
      {/* Accent-streg ovenover hver sektions-overskrift — danskerne
          skimmer typisk fra venstre, så en tynd top-rule signalerer
          ny sektion uden at støje. */}
      <div
        aria-hidden
        className="mb-2 h-px w-full"
        style={{ background: `${d.accentColor}33` }}
      />
      <h2
        className="mb-2 text-[1em] font-semibold uppercase tracking-[0.12em]"
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
