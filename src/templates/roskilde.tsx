/**
 * Roskilde — moderne dansk CV. Enkelt-spalte, ingen foto, ATS-venlig.
 *
 * Visuel karakter:
 *   - Single column hele vejen ned. Ingen sidebar, ingen accent-blokke.
 *   - Inter throughout, 10.5pt body / 13pt sektion (uppercase, tracked
 *     +0.1em) / 26pt navn.
 *   - Pure hvid baggrund, sort på hvid, grå metadata. Ingen accent-farve
 *     i grundlayoutet — kun en tynd hairline-rule mellem hver sektion.
 *   - Datoer højrejusteret i en 70 px gutter — recruiters skimmer
 *     erhvervserfaringen fra højre side, så datoerne står hvor øjet
 *     først lander.
 *
 * Sektionsrækkefølge er den moderne Dr.Job-2025 anbefaling: Faglig
 * profil → Erhvervserfaring → Uddannelse → Kompetencer → Sprog →
 * IT-kompetencer → Certificeringer → Referencer. Civilstatus og
 * fødselsdato dropper ud af default-rendering (datafeltet bliver
 * stadig respekteret hvis brugeren tilføjer dem manuelt) — store
 * internationale arbejdsgivere i København [vil ikke have dem](
 * https://www.drjobpro.com/blog/danish-resume-format).
 *
 * Industri-fit: tech, startup, design, NGO, store internationale
 * arbejdsgivere i CPH. 22-35 år, vil køre rent gennem ATS.
 *
 * Modelleret som "Berlin/Helsinki men på dansk" — Danskheden ligger i
 * sektionsnavne og datafelter, ikke i visuelt sprog. ATS-venligt.
 */

"use client";

import { TemplateFrame } from "./frame";
import { EditableSectionTitle, SectionBody } from "./components";
import { SectionActions } from "./section-actions";
import {
  elementStyle,
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

export function RoskildeTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Header — navn dominerer, kontaktlinjen som komma-separeret tekst
          (inline pipe gør ATS-parsere kede af det). */}
      <header
        data-section-id="personal"
        className="mb-7 cursor-pointer rounded-md p-1 -m-1"
      >
        <h1
          data-element-id="personal.name"
          className="block w-fit cursor-text text-[2.6em] font-semibold leading-[1] tracking-tight"
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
            className="mt-1 block w-fit cursor-text text-[1em]"
            style={{
              color: "#525252",
              ...elementStyle(data, "personal.headline"),
            }}
          >
            {personal.headline}
          </p>
        )}
        <ContactLine data={data} />
      </header>

      {/* Body — hver sektion adskilles af en 1 px hairline rule i 10%
          opacity. ingen accent-farve — typografien bærer designet. */}
      <div className="space-y-6">
        {visible.map((s, i) => (
          <RoskildeSection key={s.id} section={s} data={data} firstChild={i === 0} />
        ))}
      </div>
    </TemplateFrame>
  );
}

/** Komma-separeret kontaktlinje i én række. Hver del er
 *  data-element-id-tagget så brugeren kan free-drag og inline-edit
 *  individuelle felter — selvom de visuelt deler én linje. */
function ContactLine({ data }: { data: ResumeData }) {
  const { personal } = data;
  // Pipe-separator mellem felter — mere visuel ro end komma.
  const separator = (
    <span aria-hidden className="text-[0.85em]" style={{ color: "#A3A3A3" }}>
      ·
    </span>
  );
  const itemClass = "cursor-text";
  const items: React.ReactNode[] = [];
  if (personal.email) {
    items.push(
      <span
        key="email"
        data-element-id="personal.email"
        className={itemClass}
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
        className={itemClass}
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
        className={itemClass}
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
        className={`${itemClass} hover:underline`}
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
      className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.88em]"
      style={{ color: "#525252" }}
    >
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {it}
          {i < items.length - 1 && separator}
        </span>
      ))}
    </div>
  );
}

function RoskildeSection({
  section,
  data,
  firstChild,
}: {
  section: Section;
  data: ResumeData;
  firstChild: boolean;
}) {
  const d = resolveDesign(data.design, section);
  return (
    <section
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1"
    >
      {/* Hairline rule mellem sektioner — ikke over første sektion (den
          ville sidde lige under navnet og blive støj). 10% opacity sort
          fungerer på alle skærmtyper og print uden at konkurrere med
          sektionsoverskriften. */}
      {!firstChild && (
        <div
          aria-hidden
          className="mb-4 h-px w-full"
          style={{ background: "#0a0a0a1a" }}
        />
      )}
      <h2
        className="mb-3 text-[0.92em] font-semibold uppercase tracking-[0.14em]"
        style={{ color: d.textColor }}
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
