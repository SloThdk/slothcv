/**
 * Manhattan — corporate executive. Navy + muted gold.
 *
 * Visual character:
 *   - Lora serif H1 in deep navy
 *   - 35/65 sidebar layout — left holds contact + skills + key
 *     certifications. Right holds the experience narrative.
 *   - All-caps tracked section headings under thin gold rules
 *   - Inter body, 9.5pt for density (executives have a lot to say)
 *   - No watermark — gravitas comes from layout, not decoration
 *
 * Industry-fit: VPs, C-suite, MBA candidates, banking, consulting.
 * Navy + gold reads "boardroom" without being aggressive.
 */

"use client";

import { TemplateFrame } from "./frame";
import { SectionBody } from "./components";
import { SectionActions } from "./section-actions";
import {
  elementStyle,
  positionStyle,
  resolveDesign,
  visibleSections,
} from "./shared";
import type { ResumeData, Section } from "@/types/resume";

const SIDEBAR_TYPES = new Set<Section["type"]>([
  "skills",
  "languages",
  "certifications",
  "awards",
  "hobbies",
  "references",
]);

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

const NAVY = "#0A1F44";
const GOLD = "#B8924B";

export function ManhattanTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const sidebar = visible.filter((s) => SIDEBAR_TYPES.has(s.type));
  const main = visible.filter((s) => !SIDEBAR_TYPES.has(s.type));

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Top header — name LEFT, optional photo top-right */}
      <header
        data-section-id="personal"
        className="mb-5 flex cursor-pointer items-start justify-between gap-5 pb-4"
        style={{ borderBottom: `1.5px solid ${GOLD}` }}
      >
        <div className="flex-1">
          <h1
            data-element-id="personal.name"
            className="block w-fit cursor-text text-[2.6em] leading-[1.05] tracking-tight transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
            style={{
              color: NAVY,
              fontFamily:
                "var(--font-lora, 'Lora'), 'Source Serif 4', serif",
              fontWeight: 600,
              ...elementStyle(data, "personal.name"),
            }}
          >
            {personal.fullName || "Your Name"}
          </h1>
          {personal.headline && (
            <p
              data-element-id="personal.headline"
              className="mt-1 block w-fit cursor-text text-[0.95em] uppercase transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
              style={{
                color: GOLD,
                fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                fontWeight: 600,
                letterSpacing: "0.14em",
                ...elementStyle(data, "personal.headline"),
              }}
            >
              {personal.headline}
            </p>
          )}
        </div>
        {design.photo.enabled && personal.photoUrl && (
          <div
            data-element-id="personal.photo"
            className="cursor-grab"
            style={elementStyle(data, "personal.photo")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={personal.photoUrl}
              alt=""
              referrerPolicy="no-referrer"
              draggable={false}
              className="h-24 w-24 rounded-sm object-cover"
              style={{ outline: `1.5px solid ${NAVY}` }}
            />
          </div>
        )}
      </header>

      {/* Body — 35/65 split */}
      <div className="grid gap-7" style={{ gridTemplateColumns: "35% 1fr" }}>
        <aside className="space-y-5">
          <ManhattanContact data={data} />
          {sidebar.map((s) => (
            <ManhattanSection
              key={s.id}
              section={s}
              data={data}
              compact
            />
          ))}
        </aside>
        <div className="space-y-5">
          {main.map((s) => (
            <ManhattanSection key={s.id} section={s} data={data} />
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

function ManhattanContact({ data }: { data: ResumeData }) {
  const { personal } = data;
  return (
    <div>
      <h2
        className="mb-2 text-[0.78em] uppercase"
        style={{
          color: NAVY,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          fontWeight: 600,
          letterSpacing: "0.16em",
        }}
      >
        Contact
      </h2>
      <div
        className="h-px w-full"
        style={{ background: GOLD }}
      />
      <div
        className="mt-2 space-y-1 text-[0.85em]"
        style={{ color: "#1A1A1A" }}
      >
        {personal.email && (
          <div
            data-element-id="personal.email"
            className="block w-fit cursor-text rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
            style={elementStyle(data, "personal.email")}
          >
            {personal.email}
          </div>
        )}
        {personal.phone && (
          <div
            data-element-id="personal.phone"
            className="block w-fit cursor-text rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
            style={elementStyle(data, "personal.phone")}
          >
            {personal.phone}
          </div>
        )}
        {personal.location && (
          <div
            data-element-id="personal.location"
            className="block w-fit cursor-text rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
            style={elementStyle(data, "personal.location")}
          >
            {personal.location}
          </div>
        )}
        {personal.links.map((l) => {
          const id = `personal.links.${l.id}`;
          return (
            <a
              key={l.id}
              data-element-id={id}
              href={l.url.startsWith("http") ? l.url : `https://${l.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-fit cursor-text rounded-sm underline-offset-2 transition-shadow hover:underline hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
              style={{ color: NAVY, ...elementStyle(data, id) }}
            >
              {l.label || l.url}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function ManhattanSection({
  section,
  data,
  compact,
}: {
  section: Section;
  data: ResumeData;
  compact?: boolean;
}) {
  const d = resolveDesign(data.design, section);
  const titleId = `section.${section.id}.title`;
  return (
    <section
      data-section-id={section.id}
      style={positionStyle(section)}
      className={`group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-neutral-100/60 hover:ring-2 hover:ring-neutral-900/15 ${compact ? "" : ""}`}
    >
      <h2
        data-element-id={titleId}
        className="mb-1.5 inline-block cursor-text text-[0.82em] uppercase transition-shadow hover:ring-2 hover:ring-neutral-900/30 hover:ring-offset-2"
        style={{
          color: NAVY,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          fontWeight: 600,
          letterSpacing: "0.14em",
          ...elementStyle(data, titleId),
        }}
      >
        {section.title}
      </h2>
      <div
        className="mb-2.5 h-px w-full"
        style={{ background: `${GOLD}` }}
      />
      <SectionBody
        section={section}
        design={{
          ...d,
          accentColor: NAVY,
          secondaryColor: GOLD,
          textColor: "#1A1A1A",
        }}
        data={data}
      />
      <SectionActions section={section} />
    </section>
  );
}
