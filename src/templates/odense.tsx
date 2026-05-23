/**
 * Odense — skandinavisk hybrid. Header-bånd med valgfrit foto, derefter
 * 60/40 to-spalte body. Mute salviegrøn accent (#7C9082) på cremepapir
 * — visual sprog for "tankefuld dansk professionel" snarere end
 * corporate ATS eller traditionel kontorlig.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Header band (foto venstre, navn/tagline højre)               │
 *   ├──────────────────────────────────────┬───────────────────────┤
 *   │ left column 60% (narrative)          │ right column 40%      │
 *   │   Faglig profil                      │   Kompetencer         │
 *   │   Erhvervserfaring                   │   Sprog               │
 *   │   Uddannelse                         │   Kurser              │
 *   │                                      │   Fritidsinteresser   │
 *   │                                      │   Referencer          │
 *   └──────────────────────────────────────┴───────────────────────┘
 *
 * Visuel karakter:
 *   - Cremehvid baggrund (#FAFAF7) — ekko af dansk designtradition
 *     (Hay, Frama, Muuto materiale-paletter).
 *   - Fraunces serif til navnet i italic 28pt — editorial register
 *     der antyder kreativitet uden at virke flippet.
 *   - Inter 10.5pt body til alt andet. Tæt læsbarhed på A4.
 *   - Salviegrøn accent kun på sektionsoverskrifter + en accent-prik
 *     ved siden af hver. Ikke "danishly aggressive" rød eller
 *     "corporate" navy.
 *   - Foto cirkel 80px i header-båndet, bevidst lille — fotoet er
 *     ON som default men signalerer "dansk valgfri norm" snarere
 *     end at dominere layoutet.
 *
 * Industri-fit: marketing, kommunikation, kreativ generalist,
 * mid-career, undervisningssektor. "Jeg vil gerne ses som et
 * tænkende menneske, ikke en robot"-ansøgeren.
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

// Højre-spalte typer — kortere, blok-orienteret indhold (kompetencer,
// sprog, kurser, fritidsinteresser, referencer). Venstre-spalte tager
// alle de narrative sektioner (summary, experience, education, projects,
// volunteer, awards, publications, talks).
const RIGHT_TYPES = new Set<SectionType>([
  "skills",
  "languages",
  "certifications",
  "hobbies",
  "references",
]);

export function OdenseTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const left = visible.filter((s) => !RIGHT_TYPES.has(s.type));
  const right = visible.filter((s) => RIGHT_TYPES.has(s.type));

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Header band — foto venstre, navn + tagline + kontakt højre.
          Den dæmpede sage-grønne accent under navnet er hele templatets
          eneste kraftige farveelement. */}
      <header
        data-section-id="personal"
        className="mb-7 flex items-start gap-5 cursor-pointer rounded-md p-1 -m-1"
      >
        {design.photo.enabled && (
          <div
            data-element-id="personal.photo"
            className="cursor-grab overflow-hidden rounded-full"
            style={{
              width: 80,
              height: 80,
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
            className="block w-fit cursor-text text-[2.4em] italic leading-[1.05] tracking-tight"
            style={{
              color: design.textColor,
              fontFamily:
                "var(--cv-title-font, Fraunces), Fraunces, Georgia, serif",
              fontWeight: 500,
              ...elementStyle(data, "personal.name"),
            }}
          >
            {personal.fullName || "Dit navn"}
          </h1>
          {personal.headline && (
            <p
              data-element-id="personal.headline"
              className="mt-1 block w-fit cursor-text text-[0.92em] tracking-[0.04em]"
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
      </header>

      {/* Tynd accent-rule på fuld bredde — afslutter header-båndet og
          adskiller fra body. */}
      <div
        aria-hidden
        className="mb-7 h-px w-full"
        style={{ background: `${design.accentColor}55` }}
      />

      {/* Body — 60/40 to-spalte. minmax(0,...) sikrer at lange ord ikke
          presser kolonnerne ud over A4-bredden. */}
      <div
        className="grid gap-7"
        style={{ gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)" }}
      >
        <div className="space-y-5">
          {left.map((s) => (
            <OdenseSection key={s.id} section={s} data={data} />
          ))}
        </div>
        <div className="space-y-5">
          {right.map((s) => (
            <OdenseSection key={s.id} section={s} data={data} />
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

/** Kontaktlinje under navn + tagline. Inline punkt-separation, samme
 *  stil som roskilde — men med dæmpet sage-tonet farve. */
function ContactRow({ data }: { data: ResumeData }) {
  const { personal, design } = data;
  const sep = (
    <span aria-hidden style={{ color: `${design.accentColor}66` }}>
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
  // Kørekort surfaceres kun hvis brugeren har udfyldt det.
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
      className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.85em]"
      style={{ color: "#3F3F3F" }}
    >
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {it}
          {i < items.length - 1 && sep}
        </span>
      ))}
    </div>
  );
}

function OdenseSection({
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
      {/* Sektionsoverskrift med en lille accent-prik foran — Odense's
          eneste decorative tic. Holder layoutet i live uden at virke
          corporate. */}
      <div className="mb-2 flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: d.accentColor }}
        />
        <h2
          className="text-[0.95em] font-semibold tracking-wide"
          style={{
            color: d.accentColor,
            fontFamily: "var(--cv-title-font, Fraunces), Fraunces, serif",
          }}
        >
          <EditableSectionTitle sid={section.id} data={data}>
            {section.title}
          </EditableSectionTitle>
        </h2>
      </div>
      <SectionBody section={section} design={d} data={data} />
      <SectionActions section={section} />
    </section>
  );
}
