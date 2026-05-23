/**
 * Vejle — ufaglært dansk CV. 1-side fokus, varm tone, fremhævet
 * kørekort + sproglige kompetencer.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ [foto] Navn                                              │
 *   │        Søger stilling som …                              │
 *   │        e-mail · telefon · adresse · kørekort             │
 *   ├──────────────────────────────────────────────────────────┤
 *   │ Faglig profil (1-2 linjer)                               │
 *   │ Erhvervserfaring                                         │
 *   │ Uddannelse                                               │
 *   │ Kompetencer                                              │
 *   │ Sprog                                                    │
 *   │ Fritidsinteresser                                        │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Visuel karakter:
 *   - Sand-hvid baggrund (#FFFBF2) + varm orange accent (#D97706).
 *     Bevidst IKKE corporate navy/grå — hourly-segmentet får
 *     hyppigere positiv respons på "venlig og menneskelig" CV-tone
 *     end på stiv kontorlig.
 *   - Foto øverst-venstre i kvadrat (mindre formel end cirkel),
 *     90 px stort med 2 px accent-ramme. Foto er en norm i ufaglært
 *     segment hvor recruiters skimmer hurtigt og personligt
 *     genkendelse hjælper.
 *   - "Søger stilling som [X]" som tagline under navnet — eksplicit
 *     intent fanger recruiters opmærksomhed i lager- og butikssegmentet
 *     hvor mange CV'er er generiske.
 *   - Sektionsoverskrifter i titlecase med 2 px accent-streg under,
 *     ingen all-caps (mindre formel og truer ikke ATS).
 *   - Afslappet linjeafstand (1.45) + 11 pt body for ren læsning;
 *     hjælper recruiter der skimmer 50 CV'er i timen.
 *
 * Industri-fit: lager, butik, kantine, rengøring, transport, café,
 * kassebetjening, sæsonarbejde. Kasper Larsen-segmentet.
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
import type { ResumeData, Section } from "@/types/resume";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function VejleTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Header — foto venstre, navn + tagline + kontakt højre */}
      <header
        data-section-id="personal"
        className="mb-6 flex items-start gap-4 cursor-pointer rounded-md p-1 -m-1"
      >
        {design.photo.enabled && (
          <div
            data-element-id="personal.photo"
            className="cursor-grab overflow-hidden rounded-lg"
            style={{
              width: 92,
              height: 92,
              flexShrink: 0,
              ...photoBorderStyle(design, design.accentColor),
              ...elementStyle(data, "personal.photo"),
            }}
          >
            {personal.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={personal.photoUrl}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                aria-hidden="true"
                className="grid h-full w-full place-items-center bg-[color-mix(in_srgb,currentColor_8%,transparent)] text-[color-mix(in_srgb,currentColor_45%,transparent)]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
                </svg>
              </div>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1
            data-element-id="personal.name"
            className="block w-fit cursor-text text-[2.1em] font-bold leading-[1.1] tracking-tight"
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
              className="mt-1 block w-fit cursor-text text-[1em] font-medium"
              style={{
                color: design.accentColor,
                ...elementStyle(data, "personal.headline"),
              }}
            >
              {personal.headline}
            </p>
          )}
          <ContactInline data={data} />
        </div>
      </header>

      {/* Body — single column med varm accent-streg under hver overskrift */}
      <div className="space-y-5">
        {visible.map((s) => (
          <VejleSection key={s.id} section={s} data={data} />
        ))}
      </div>
    </TemplateFrame>
  );
}

/** Inline kontaktlinje — varm gråtone-tekst med accent-prik som
 *  separator. Hver del er fortsat fri-trækbar via data-element-id. */
function ContactInline({ data }: { data: ResumeData }) {
  const { personal, design } = data;
  const dot = (
    <span aria-hidden style={{ color: `${design.accentColor}99` }}>
      •
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
  // Kørekort (dansk CV-norm) — fremhæves med "Kørekort:" prefix.
  // Vejle's persona er typisk i hourly/service-segmentet hvor B +
  // truck-certifikat åbner mange døre. Kun renderet hvis udfyldt.
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
      className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.86em]"
      style={{ color: "#5C4A36" }}
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

function VejleSection({
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
        className="mb-1 text-[1.05em] font-semibold tracking-tight"
        style={{ color: d.accentColor }}
      >
        <EditableSectionTitle sid={section.id} data={data}>
          {section.title}
        </EditableSectionTitle>
      </h2>
      {/* Tynd accent-streg på 36 px under overskrift — markerer
          sektion uden at konkurrere med indholdet. */}
      <div
        aria-hidden
        className="mb-3 h-0.5 w-9 rounded-full"
        style={{ background: d.accentColor }}
      />
      <SectionBody section={section} design={d} data={data} />
      <SectionActions section={section} />
    </section>
  );
}
