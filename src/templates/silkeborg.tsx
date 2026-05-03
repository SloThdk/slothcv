/**
 * Silkeborg — detailhandels-CV. Designet til store retail-kæder hvor
 * recruiter typisk er en assisterende butikschef der skanner bunken
 * efter "team-spillere med varekendskab og kasse-erfaring".
 *
 * Layout:
 *   ┌──────────────────────────────────────┬────────────┐
 *   │ Navn (oversize)                      │ [foto]     │
 *   │ Faglig titel (uppercase, navy)       │ kvadrat    │
 *   │ kontakt-linje                        │            │
 *   ├──────────────────────────────────────┴────────────┤
 *   │ Tynd accent-rule fuld bredde                      │
 *   ├──────────────────────────────────┬────────────────┤
 *   │ Venstre 60% (narrative)          │ Højre 40%      │
 *   │   Faglig profil                  │ Kompetencer    │
 *   │   Erhvervserfaring               │ Sprog          │
 *   │   Uddannelse                     │ Certifikater   │
 *   │                                  │ Referencer     │
 *   └──────────────────────────────────┴────────────────┘
 *
 * Visuel karakter:
 *   - Hvid baggrund + navy accent (#1E40AF) — store retail-kæder
 *     bruger overvejende navy eller rød i deres branding; navy reads
 *     mere alsidigt og fagligt.
 *   - Foto kvadrat 80 px i header-højre — practical, ikke prangende.
 *   - Sektionsoverskrifter all-caps tracked +0.12em — direkte
 *     kommercielt register, matcher Bauhaus / Jysk / Føtex visual
 *     vocabulary.
 *   - Højre-spalte sektioner pakkes ind som "blok-kort" med subtil
 *     baggrund (#F1F5F9) for at understrege at de er korte
 *     reference-stykker, ikke narrativ erhvervserfaring.
 *   - Fed font på navn + tagline — recruiter i butik skal kunne
 *     genkende kandidaten på 5 sekunder fra en bunke.
 *
 * Industri-fit: Bauhaus, Silvan, XL-BYG, Jysk, Ilva, IDEmøbler,
 * Føtex, Bilka, Salling, Magasin, Matas, Coop / SuperBrugsen,
 * salgsassistent, kasseoperatør, butiksleder, butiksassistent.
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

// Højre 40%-kolonne: korte blok-sektioner. Venstre 60%: narrative.
const RIGHT_TYPES = new Set<SectionType>([
  "skills",
  "languages",
  "certifications",
  "references",
  "hobbies",
]);

export function SilkeborgTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const left = visible.filter((s) => !RIGHT_TYPES.has(s.type));
  const right = visible.filter((s) => RIGHT_TYPES.has(s.type));

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Header — navn venstre, foto højre */}
      <header
        data-section-id="personal"
        className="mb-5 flex items-start justify-between gap-4 cursor-pointer rounded-md p-1 -m-1"
      >
        <div className="flex-1 min-w-0">
          <h1
            data-element-id="personal.name"
            className="block w-fit cursor-text text-[2.5em] font-bold leading-[1.05] tracking-tight"
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
              className="mt-1 block w-fit cursor-text text-[0.92em] font-bold uppercase tracking-[0.16em]"
              style={{
                color: design.accentColor,
                ...elementStyle(data, "personal.headline"),
              }}
            >
              {personal.headline}
            </p>
          )}
          <ContactRow data={data} />
        </div>
        {design.photo.enabled && personal.photoUrl && (
          <div
            data-element-id="personal.photo"
            className="cursor-grab overflow-hidden rounded-md"
            style={{
              width: 80,
              height: 80,
              flexShrink: 0,
              ...photoBorderStyle(design, `${design.accentColor}55`),
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
      </header>

      {/* Accent-rule i fuld bredde under header */}
      <div
        aria-hidden
        className="mb-5 h-0.5 w-full"
        style={{ background: design.accentColor }}
      />

      {/* Body — 60/40 to-spalte */}
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)" }}
      >
        <div className="space-y-5">
          {left.map((s) => (
            <MainSection key={s.id} section={s} data={data} />
          ))}
        </div>
        <div className="space-y-3">
          {right.map((s) => (
            <BlockSection
              key={s.id}
              section={s}
              data={data}
              accent={design.accentColor}
            />
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

function ContactRow({ data }: { data: ResumeData }) {
  const { personal } = data;
  const dot = (
    <span aria-hidden style={{ color: "#94A3B8" }}>
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
      className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.86em]"
      style={{ color: "#475569" }}
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
      <SectionBody section={section} design={d} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

/** Højre-spalte blok-sektioner — pakket ind med subtil baggrund så
 *  de visuelt læser som "korte reference-blokke" snarere end
 *  narrativ tekst. Hvis flere blok-sektioner stables, gentages
 *  baggrunden så hver blok står tydeligt for sig selv. */
function BlockSection({
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
      className="group relative cursor-pointer break-inside-avoid rounded-md p-3"
      // Subtil grå-tone baggrund så blok-sektionerne læser som
      // "indeholdt info" snarere end "fri tekst".
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 rounded-md"
        style={{ background: "#F1F5F9" }}
      />
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
