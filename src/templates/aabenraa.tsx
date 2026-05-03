/**
 * Aabenraa — transport- og chauffør-CV. Designet til lastbilchauffør,
 * varevognschauffør, taxi, kurer, busschauffør — segmenter hvor
 * KØREKORT-KATEGORIER og certifikater (ADR, EU-direktiv 5) er det
 * recruiter SCANNER for inden noget andet.
 *
 * Layout:
 *   ┌──────────────────────┬──────────────────────────────────┐
 *   │ Sidebar (32%)        │ Main (68%)                       │
 *   │   [foto kvadrat]     │   navn (oversize)                │
 *   │                      │   faglig titel                   │
 *   │   ◄ KØREKORT ►       │   kontakt-linje                  │
 *   │   [B] [C] [CE] [ADR] │ ─────────────────────────────────│
 *   │                      │   Faglig profil                  │
 *   │   ◄ CERTIFIKATER ►   │   Erhvervserfaring               │
 *   │   • ADR-bevis        │   Uddannelse                     │
 *   │   • EU-direktiv 5    │                                  │
 *   │   • Førstehjælp      │                                  │
 *   │                      │                                  │
 *   │   ◄ KOMPETENCER ►    │                                  │
 *   │   ◄ SPROG ►          │                                  │
 *   └──────────────────────┴──────────────────────────────────┘
 *
 * Visuel karakter:
 *   - Sort + hvid + gul accent (#FACC15) — minder om vejskilte og
 *     reflekterende vest-aestetik. Funktionel snarere end smuk.
 *   - Kørekort-kategorier rendres som BADGES (visuelle blokke med
 *     gul baggrund + sort tekst), placeret prominent øverst i
 *     sidebar. Recruiter skanner sidebar først, godkender eller
 *     afviser CV'et på 5 sekunder baseret på kategorier.
 *   - Foto kvadrat 90 px med skarp 2 px sort kant — ingen rounded-
 *     corner softhed; matcher industrielt register.
 *   - Sektionsoverskrifter all-caps med pile-glyph (◄ ►) som
 *     visuel separator — minder om vejmarkering.
 *
 * Den unikke "kørekort badge"-blok er det der adskiller Aabenraa fra
 * Aalborg (faglærte håndværk). Begge har sidebar med certifikater,
 * men Aabenraa visualiserer kategorier som badges, fordi B / C / CE / D
 * er BINÆRE go/no-go felter — recruiteren scanner efter "har personen
 * CE?" snarere end "hvor mange certifikater har personen?".
 *
 * Industri-fit: lastbilchauffør (C, CE), varevognschauffør (B), taxi,
 * kurer, levering, busschauffør (D), tankvognchauffør (ADR), togfører,
 * mobilkran (B+E).
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
import type { ResumeData, Section, SectionType } from "@/types/resume";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

// Sidebar typer — kompetencer + certifikater + sprog. Resten i main.
const SIDEBAR_TYPES = new Set<SectionType>([
  "skills",
  "certifications",
  "languages",
  "references",
]);

/** Yellow road-sign accent for kørekort-badges. Hardcoded fordi
 *  badges-bevidst skal matche standard EU-vejskilt-gult, ikke
 *  template-accent. */
const ROAD_YELLOW = "#FACC15";

export function AabenraaTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const sidebar = visible.filter((s) => SIDEBAR_TYPES.has(s.type));
  const main = visible.filter((s) => !SIDEBAR_TYPES.has(s.type));
  const sidebarPct = Math.round(design.sidebarWidth * 100);

  // Udled kørekort-badges fra personal.links — det er sådan personaer
  // typisk surfacer kategorier i den eksisterende schema. Filtrerer
  // efter labels der starter med "Kørekort" eller "ADR".
  const koreekortBadges = personal.links.filter(
    (l) =>
      /^k(ø|o)rekort\b/i.test(l.label || "") ||
      /^adr\b/i.test(l.label || ""),
  );

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <div
        className="grid gap-6"
        style={{
          gridTemplateColumns: `${sidebarPct}% 1fr`,
        }}
      >
        {/* Sidebar */}
        <aside
          className="relative -m-4 p-5"
          style={{
            background: "#0A0A0A",
            color: "#F5F5F5",
            minHeight: "100%",
          }}
        >
          {design.photo.enabled && personal.photoUrl && (
            <div
              data-element-id="personal.photo"
              className="mb-5 cursor-grab overflow-hidden rounded-md"
              style={{
                width: 90,
                height: 90,
                outline: "2px solid #F5F5F5",
                outlineOffset: "2px",
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

          {/* Kørekort badges — visuelt fremtrædende, vejskilt-gul.
              Fås kun frem hvis brugeren har tagget kørekort i sit
              personal.links (kanonisk pattern: label="Kørekort B + C"). */}
          {koreekortBadges.length > 0 && (
            <div className="mb-5">
              <SidebarHeading title="Kørekort" />
              <div className="flex flex-wrap gap-1.5">
                {koreekortBadges.map((badge) => {
                  // Splitter "Kørekort B + C + CE" → ["B", "C", "CE"]
                  // for at rendere hver kategori som sit eget kort.
                  const labelText = (badge.label || "").replace(
                    /^k(ø|o)rekort\s*/i,
                    "",
                  );
                  const codes = labelText
                    .split(/[+,/]+/)
                    .map((s) => s.trim())
                    .filter(Boolean);
                  // Hvis splittet ikke kunne dele op (fx ren "ADR-bevis"),
                  // render hele label som enkelt badge.
                  const all = codes.length > 0 ? codes : [badge.label || ""];
                  return all.map((code, i) => (
                    <span
                      key={`${badge.id}-${i}`}
                      data-element-id={`personal.links.${badge.id}`}
                      className="cursor-grab inline-flex items-center justify-center rounded-sm px-2 py-1 text-[0.78em] font-bold uppercase tracking-wider"
                      style={{
                        background: ROAD_YELLOW,
                        color: "#0A0A0A",
                        ...elementStyle(data, `personal.links.${badge.id}`),
                      }}
                    >
                      {code}
                    </span>
                  ));
                })}
              </div>
            </div>
          )}

          {/* Kontakt-blok */}
          <div className="mb-5">
            <SidebarHeading title="Kontakt" />
            <div className="space-y-1 text-[0.78em]">
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
            </div>
          </div>

          {/* Sidebar-sektioner: certifikater, kompetencer, sprog */}
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
                className="mt-1 block w-fit cursor-text text-[0.95em] font-bold uppercase tracking-[0.14em]"
                style={{
                  color: design.accentColor,
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
          </header>

          {/* Tynd accent-rule */}
          <div
            aria-hidden
            className="mb-5 h-0.5 w-full"
            style={{ background: ROAD_YELLOW }}
          />

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

function SidebarHeading({ title }: { title: string }) {
  return (
    <h3
      className="mb-2 text-[0.74em] font-bold uppercase tracking-[0.18em]"
      style={{ color: ROAD_YELLOW }}
    >
      ◄ {title} ►
    </h3>
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
      <h3
        className="mb-2 text-[0.74em] font-bold uppercase tracking-[0.18em]"
        style={{ color: ROAD_YELLOW }}
      >
        ◄{" "}
        <EditableSectionTitle sid={section.id} data={data}>
          {section.title}
        </EditableSectionTitle>{" "}
        ►
      </h3>
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
      <h2
        className="mb-2 text-[0.95em] font-bold uppercase tracking-[0.14em]"
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
