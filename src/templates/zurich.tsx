/**
 * Zurich — McKinsey/BCG/Bain consulting form. Narrow proof-stack on the
 * left, wide narrative column on the right.
 *
 * Visual character:
 *   - 25% left sidebar / 75% main — the inverse of Geneva's split. The
 *     wide right column is for the case-study language consultants
 *     write in
 *   - Sidebar background `#e2e8f0` (muted slate-200) with no decoration
 *     beyond compact section heads — proof points need to feel inevitable,
 *     not decorated
 *   - Slate `#334155` accent only — no warm tones. Consulting decks are
 *     achromatic; this is a deck rendered as a CV
 *   - Manrope sans throughout. Neither too friendly (Geist) nor too cold
 *     (Helvetica) — reads as "I have an MBA"
 *   - Photo lives top-left in the sidebar — square crop, strict outline
 *
 * Industry-fit: management consulting, corporate strategy, post-MBA roles,
 * private equity associates.
 *
 * Hardcoded colors: slate `#334155` and sidebar bg `#e2e8f0` are intrinsic
 * to Zurich's discipline. Other colors flow from `design`.
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
  "awards",
  "hobbies",
]);

const SLATE = "#334155";
const SIDEBAR_BG = "#e2e8f0";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function ZurichTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const sidebar = visible.filter((s) => SIDEBAR_TYPES.has(s.type));
  const main = visible.filter((s) => !SIDEBAR_TYPES.has(s.type));

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Body — 25% / 75% with no separate header band; the sidebar carries
          the photo + contact, the main column starts with the name. */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "25% 1fr" }}>
        {/* ---- Narrow left sidebar ---- */}
        <aside
          className="space-y-4 rounded-md p-3.5"
          style={{ background: SIDEBAR_BG }}
        >
          {/* Photo top of sidebar */}
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
                style={{ outline: `1.5px solid ${SLATE}` }}
              />
            </div>
          )}

          {/* Personal block in sidebar — tagged `personal` so the form jumps
              when clicked anywhere here. */}
          <div data-section-id="personal">
            <ZurichContact data={data} />
          </div>

          {sidebar.map((s) => (
            <ZurichSidebarSection key={s.id} section={s} data={data} />
          ))}
        </aside>

        {/* ---- Wide right main column ---- */}
        <div className="space-y-5">
          {/* Header — name first, big sans, slate underline */}
          <header
            data-section-id="personal"
            className="cursor-pointer pb-3"
            style={{ borderBottom: `1.5px solid ${SLATE}` }}
          >
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.4em] leading-[1.05] tracking-tight"
              style={{
                color: SLATE,
                fontFamily:
                  "var(--font-manrope, 'Manrope'), Inter, sans-serif",
                fontWeight: 700,
                ...elementStyle(data, "personal.name"),
              }}
            >
              {personal.fullName || "Your Name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-1 block w-fit cursor-text text-[0.95em]"
                style={{
                  color: `${design.textColor}99`,
                  fontFamily:
                    "var(--font-manrope, 'Manrope'), sans-serif",
                  fontWeight: 500,
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
          </header>

          {main.map((s) => (
            <ZurichMainSection key={s.id} section={s} data={data} />
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

/** Contact block in the narrow sidebar — uppercase mini labels, tight stack. */
function ZurichContact({ data }: { data: ResumeData }) {
  const { personal, design } = data;
  const grab =
    "block w-fit cursor-text rounded-sm";
  return (
    <div>
      <h3
        className="mb-1 text-[0.65em] uppercase"
        style={{
          color: SLATE,
          fontFamily: "var(--font-manrope, 'Manrope'), sans-serif",
          fontWeight: 700,
          letterSpacing: "0.18em",
        }}
      >
        Contact
      </h3>
      <div
        className="space-y-0.5 text-[0.75em] break-words"
        style={{
          color: design.textColor,
          fontFamily: "var(--font-manrope, 'Manrope'), sans-serif",
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
              style={{ color: SLATE, ...elementStyle(data, id) }}
            >
              {l.label || l.url}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function ZurichSidebarSection({
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
        className="mb-1 inline-block cursor-text text-[0.65em] uppercase"
        style={{
          color: SLATE,
          fontFamily: "var(--font-manrope, 'Manrope'), sans-serif",
          fontWeight: 700,
          letterSpacing: "0.18em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <SectionBody
        section={section}
        design={{ ...d, accentColor: SLATE }}
        data={data}
      />
      <SectionActions section={section} />
    </section>
  );
}

function ZurichMainSection({
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
        className="mb-2 inline-block cursor-text text-[0.85em] uppercase"
        style={{
          color: SLATE,
          fontFamily: "var(--font-manrope, 'Manrope'), sans-serif",
          fontWeight: 700,
          letterSpacing: "0.14em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <div
        className="mb-2 h-px w-full"
        style={{ background: `${SLATE}40` }}
      />
      <SectionBody
        section={section}
        design={{ ...d, accentColor: SLATE }}
        data={data}
      />
      <SectionActions section={section} />
    </section>
  );
}
