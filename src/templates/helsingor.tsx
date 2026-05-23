/**
 * Helsingør — café- og hospitality-CV. Cremepapir + terracotta accent
 * + serif-name som signalerer "håndværk og service" snarere end
 * corporate eller ufaglært-rå.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ [foto cirkel] Navn (Lora serif)                          │
 *   │               Faglig titel · email · telefon · sted      │
 *   ├──────────────────────────────────────────────────────────┤
 *   │ ◦ Faglig profil                                          │
 *   │ ◦ Erhvervserfaring                                       │
 *   │ ◦ Uddannelse                                             │
 *   │ ◦ Kompetencer                                            │
 *   │ ◦ Sprog                                                  │
 *   │ ◦ Fritidsinteresser                                      │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Visuel karakter:
 *   - Cremepapir (#FBF8F3) — håndværker-kaffebar-feel snarere end
 *     pure-white corporate.
 *   - Terracotta accent (#B45309) — varm jord-tone, mest brugt på
 *     sektionsoverskrifter + en lille åben cirkel ved siden af.
 *   - Lora serif på navn + sektioner (matcher specialty-coffee /
 *     fine-dining typografi-traditionen). Inter på body for
 *     læsbarhed på A4 i print.
 *   - Foto cirkel 78 px med subtil terracotta ring.
 *   - Generøs linjeafstand (1.55) og 11.5 pt body — recruiter i
 *     hospitality skanner mere end stresset HR-tæt-CV.
 *
 * Industri-fit: barista, kok, tjener, hotel-receptionist, sommelier,
 * bartender, take-away-medhjælper, hotel-housekeeping.
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

export function HelsingorTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Header — foto cirkel venstre, navn + kontakt til højre */}
      <header
        data-section-id="personal"
        className="mb-6 flex items-start gap-5 cursor-pointer rounded-md p-1 -m-1"
      >
        {design.photo.enabled && (
          <div
            data-element-id="personal.photo"
            className="cursor-grab overflow-hidden rounded-full"
            style={{
              width: 78,
              height: 78,
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
            className="block w-fit cursor-text text-[2.3em] leading-[1.05] tracking-tight"
            style={{
              color: design.textColor,
              fontFamily:
                "var(--cv-title-font, Lora), Lora, Georgia, serif",
              fontWeight: 600,
              ...elementStyle(data, "personal.name"),
            }}
          >
            {personal.fullName || "Dit navn"}
          </h1>
          {personal.headline && (
            <p
              data-element-id="personal.headline"
              className="mt-1 block w-fit cursor-text text-[0.95em] tracking-[0.02em]"
              style={{
                color: design.accentColor,
                fontFamily:
                  "var(--cv-title-font, Lora), Lora, Georgia, serif",
                fontStyle: "italic",
                ...elementStyle(data, "personal.headline"),
              }}
            >
              {personal.headline}
            </p>
          )}
          <ContactInline data={data} />
        </div>
      </header>

      {/* Tynd accent-rule under header */}
      <div
        aria-hidden
        className="mb-6 h-px w-full"
        style={{ background: `${design.accentColor}55` }}
      />

      {/* Body — single column med "◦"-mark foran hver overskrift */}
      <div className="space-y-5">
        {visible.map((s) => (
          <HelsingorSection key={s.id} section={s} data={data} />
        ))}
      </div>
    </TemplateFrame>
  );
}

/** Inline kontakt-linje med små accent-prik separators. */
function ContactInline({ data }: { data: ResumeData }) {
  const { personal, design } = data;
  const dot = (
    <span aria-hidden style={{ color: `${design.accentColor}80` }}>
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
  // Kørekort er valgfrit i hospitality-segmentet, men hvis brugeren
  // har udfyldt det i formularen surfacer vi det her så data ikke
  // tabes når feltet er sat på et dansk template.
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
      style={{ color: "#6B5340" }}
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

function HelsingorSection({
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
      {/* "◦"-mark foran overskrift — Helsingørs eneste decorative tic.
          Åben cirkel snarere end fyldt prik = "lighter touch", matcher
          specialty-coffee logo-traditionen. */}
      <div className="mb-2 flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full border"
          style={{ borderColor: d.accentColor }}
        />
        <h2
          className="text-[1.05em] tracking-tight"
          style={{
            color: d.accentColor,
            fontFamily: "var(--cv-title-font, Lora), Lora, Georgia, serif",
            fontWeight: 600,
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
