/**
 * Singapore — designerly East/West fusion. Vertical rotated section labels
 * read like a tea-house signpost; cream body + signal red accent give it a
 * graphic-novel poster feel.
 *
 * Visual character:
 *   - 78% main / 22% right sidebar — the sidebar is more decorative than
 *     functional, focused on contact + chips
 *   - Section titles in the MAIN column rotate -90deg into a left gutter
 *     beside each block. A 2px red vertical accent line runs the height
 *     of each section, with the rotated title pinned to the top of the line
 *   - Cream body `#fffbeb`, signal red `#dc2626` accent, off-black text
 *   - Onest for the name (rounded geometric) + Source Serif 4 for headlines
 *     of items — playful pairing
 *   - Photo top-right of sidebar, square — feels like a stamp
 *
 * Industry-fit: design leads, brand strategists, agency creative directors,
 * fashion/streetwear brand work, anyone whose CV is itself a portfolio piece.
 *
 * Hardcoded colors: cream `#fffbeb` body and red `#dc2626` accent are part
 * of Singapore's identity. Other colors flow from `design`.
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

const SIDEBAR_TYPES = new Set<Section["type"]>([
  "skills",
  "languages",
  "certifications",
  "hobbies",
]);

const RED = "#dc2626";
const CREAM = "#fffbeb";
const INK = "#1c1917";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function SingaporeTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const sidebar = visible.filter((s) => SIDEBAR_TYPES.has(s.type));
  const main = visible.filter((s) => !SIDEBAR_TYPES.has(s.type));

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Hard cream background — overrides design.pageBg deliberately for
          identity. Design tab can still re-tint via accent/text. */}
      <div
        className="absolute inset-0"
        style={{ background: CREAM, zIndex: 0 }}
        aria-hidden
      />

      <div className="relative z-[1]">
        {/* Header with name, big — Onest for the rounded geometric feel */}
        <header
          data-section-id="personal"
          className="mb-6 flex cursor-pointer items-start justify-between gap-4 pb-3"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {/* Red square stamp before the name — graphic accent */}
              <div
                className="h-8 w-1.5"
                style={{ background: RED }}
                aria-hidden
              />
              <h1
                data-element-id="personal.name"
                className="block w-fit cursor-text text-[2.4em] leading-[1.05] tracking-tight"
                style={{
                  color: INK,
                  fontFamily: "var(--cv-title-font, var(--font-onest, 'Onest'), Inter, sans-serif)",
                  fontWeight: 600,
                  ...elementStyle(data, "personal.name"),
                }}
              >
                {personal.fullName || "Your Name"}
              </h1>
            </div>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-1 block w-fit cursor-text pl-[18px] text-[1em] italic"
                style={{
                  color: RED,
                  fontFamily: "var(--cv-body-font, var(--font-source-serif-4, 'Source Serif 4'), Georgia, serif)",
                  fontWeight: 400,
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
          </div>
        </header>

        {/* Body — main with rotated gutter labels + small right sidebar */}
        <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 22%" }}>
          {/* Main with rotated labels */}
          <div className="space-y-4">
            {main.map((s) => (
              <SingaporeMainSection key={s.id} section={s} data={data} />
            ))}
          </div>

          {/* Right sidebar — photo (top, square), then sidebar sections */}
          <aside
            className="space-y-4"
            style={{ borderLeft: `2px solid ${RED}`, paddingLeft: "12px" }}
          >
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
                  className="h-24 w-24 object-cover"
                  // box-shadow + design.photo.borderColor override (Design → Photo → Border)
                  style={{ boxShadow: `0 0 0 2px ${design.photo.borderColor || RED}` }}
                />
              </div>
            )}
            <SingaporeContact data={data} />
            {sidebar.map((s) => (
              <SingaporeSidebarSection key={s.id} section={s} data={data} />
            ))}
          </aside>
        </div>
      </div>
    </TemplateFrame>
  );
}

function SingaporeContact({ data }: { data: ResumeData }) {
  const { personal } = data;
  const grab =
    "block w-fit cursor-text rounded-sm";
  return (
    <div>
      <h3
        className="mb-1.5 text-[0.7em] uppercase"
        style={{
          color: RED,
          fontFamily: "var(--cv-title-font, var(--font-onest, 'Onest'), sans-serif)",
          fontWeight: 700,
          letterSpacing: "0.2em",
        }}
      >
        Contact
      </h3>
      <div
        className="space-y-0.5 text-[0.75em] break-words"
        style={{
          color: INK,
          fontFamily: "var(--cv-title-font, var(--font-onest, 'Onest'), sans-serif)",
        }}
      >
        {personal.email && (
          <div
            data-element-id="personal.email"
            className={grab}
            style={elementStyle(data, "personal.email")}
          >
            {personal.email}
          </div>
        )}
        {personal.phone && (
          <div
            data-element-id="personal.phone"
            className={grab}
            style={elementStyle(data, "personal.phone")}
          >
            {personal.phone}
          </div>
        )}
        {personal.location && (
          <div
            data-element-id="personal.location"
            className={grab}
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
              className={`${grab} underline-offset-2 hover:underline`}
              style={{ color: RED, ...elementStyle(data, id) }}
            >
              {l.label || l.url}
            </a>
          );
        })}
      </div>
    </div>
  );
}

/** Main section with rotated label in a left gutter. The section flex-rows
 *  the rotated label + a vertical accent line + the body. */
function SingaporeMainSection({
  section,
  data,
}: {
  section: Section;
  data: ResumeData;
}) {
  const d = resolveDesign(data.design, section);
  const titleId = `section.${section.id}.title`;
  return (
    <section
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 pl-2"
    >
      <div className="grid gap-3" style={{ gridTemplateColumns: "auto 1fr" }}>
        {/* Rotated label gutter */}
        <div className="relative w-6">
          <div
            className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2"
            style={{ background: RED }}
            aria-hidden
          />
          <h2
            data-element-id={titleId}
            className="absolute left-1/2 top-3 inline-block origin-top-left -translate-x-1/2 cursor-text whitespace-nowrap text-[0.7em] uppercase"
            style={{
              transform: "translateX(-50%) rotate(-90deg) translateY(0)",
              transformOrigin: "center top",
              top: "44px",
              color: RED,
              fontFamily: "var(--cv-title-font, var(--font-onest, 'Onest'), sans-serif)",
              fontWeight: 700,
              letterSpacing: "0.22em",
              background: CREAM,
              padding: "2px 6px",
              ...elementStyle(data, titleId),
            }}
          >
            <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
          </h2>
        </div>
        {/* Section body */}
        <div>
          <SectionBody
            section={section}
            design={{ ...d, accentColor: RED }}
            data={data}
          />
        </div>
      </div>
      <SectionActions section={section} />
    </section>
  );
}

function SingaporeSidebarSection({
  section,
  data,
}: {
  section: Section;
  data: ResumeData;
}) {
  const d = resolveDesign(data.design, section);
  const titleId = `section.${section.id}.title`;
  return (
    <section
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1"
    >
      <h2
        data-element-id={titleId}
        className="mb-1 inline-block cursor-text text-[0.7em] uppercase"
        style={{
          color: RED,
          fontFamily: "var(--cv-title-font, var(--font-onest, 'Onest'), sans-serif)",
          fontWeight: 700,
          letterSpacing: "0.2em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <SectionBody
        section={section}
        design={{ ...d, accentColor: RED }}
        data={data}
      />
      <SectionActions section={section} />
    </section>
  );
}
