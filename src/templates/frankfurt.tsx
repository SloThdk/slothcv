/**
 * Frankfurt — German engineering. No frills, all weight, all alignment.
 *
 * Visual character:
 *   - 30% heavy BLACK (#171717) left sidebar with off-white text. Photo
 *     sits at the very top, full sidebar width
 *   - 70% main column on a soft `#fafafa` body — the negative space is
 *     intentional. White around black around content
 *   - Skills sit in the dark sidebar as proof badges, light text on dark
 *   - Inter at weight 700 for the name (and weight 600 for section
 *     titles) — typography does the heavy lifting; no underlines, no
 *     accent stripes, no nothing
 *   - Section titles in caps, tightly tracked
 *   - Body Inter for content density
 *
 * Industry-fit: senior engineers, plant managers, automotive / industrial
 * leadership, German-speaking markets where Bauhaus restraint reads as
 * competence.
 *
 * Hardcoded colors: black `#171717` sidebar and `#fafafa` body are
 * intrinsic identity. Accent flows from `design`.
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
]);

const BLACK = "#171717";
const SIDEBAR_TEXT = "#f5f5f5";
const SIDEBAR_MUTED = "#a3a3a3";
const BODY_BG = "#fafafa";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function FrankfurtTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const sidebar = visible.filter((s) => SIDEBAR_TYPES.has(s.type));
  const main = visible.filter((s) => !SIDEBAR_TYPES.has(s.type));

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <div
        className="-m-[var(--frankfurt-pad,0)] grid"
        style={{
          // Negate the TemplateFrame padding so the black sidebar runs
          // edge-to-edge — a deliberate "industrial" effect.
          margin: "calc(var(--frankfurt-undo, 0))",
          gridTemplateColumns: "30% 1fr",
          minHeight: "calc(100% + 0px)",
          background: BODY_BG,
        }}
      >
        {/* ---- Heavy black left sidebar ---- */}
        <aside
          className="space-y-5 p-5"
          style={{
            background: BLACK,
            color: SIDEBAR_TEXT,
            fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          }}
        >
          {/* Photo top — full sidebar width effect via square */}
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
                className="h-32 w-full object-cover"
                style={{ outline: `1px solid ${SIDEBAR_MUTED}` }}
              />
            </div>
          )}

          {/* Personal info — name at top of sidebar in heavy weight */}
          <div data-section-id="personal" className="cursor-pointer">
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[1.6em] leading-[1.05] tracking-tight transition-shadow hover:ring-2 hover:ring-white/30 hover:ring-offset-2 hover:ring-offset-transparent"
              style={{
                color: SIDEBAR_TEXT,
                fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                fontWeight: 700,
                ...elementStyle(data, "personal.name"),
              }}
            >
              {personal.fullName || "Your Name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-1 block w-fit cursor-text text-[0.78em] uppercase transition-shadow hover:ring-2 hover:ring-white/30 hover:ring-offset-2 hover:ring-offset-transparent"
                style={{
                  color: SIDEBAR_MUTED,
                  fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.16em",
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
            <FrankfurtContact data={data} />
          </div>

          {sidebar.map((s) => (
            <FrankfurtSidebarSection key={s.id} section={s} data={data} />
          ))}
        </aside>

        {/* ---- Right main column ---- */}
        <div className="space-y-5 p-6">
          {main.map((s) => (
            <FrankfurtMainSection key={s.id} section={s} data={data} />
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

/** Contact in the dark sidebar — muted gray labels, white values. */
function FrankfurtContact({ data }: { data: ResumeData }) {
  const { personal } = data;
  const grab =
    "block w-fit cursor-text rounded-sm transition-shadow hover:ring-2 hover:ring-white/20 hover:ring-offset-1 hover:ring-offset-transparent";
  return (
    <div className="mt-3 space-y-0.5 text-[0.78em] break-words">
      {personal.email && (
        <div
          data-element-id="personal.email"
          className={grab}
          style={{ color: SIDEBAR_TEXT, ...elementStyle(data, "personal.email") }}
        >
          {personal.email}
        </div>
      )}
      {personal.phone && (
        <div
          data-element-id="personal.phone"
          className={grab}
          style={{ color: SIDEBAR_TEXT, ...elementStyle(data, "personal.phone") }}
        >
          {personal.phone}
        </div>
      )}
      {personal.location && (
        <div
          data-element-id="personal.location"
          className={grab}
          style={{
            color: SIDEBAR_MUTED,
            ...elementStyle(data, "personal.location"),
          }}
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
            style={{ color: SIDEBAR_TEXT, ...elementStyle(data, id) }}
          >
            {l.label || l.url}
          </a>
        );
      })}
    </div>
  );
}

function FrankfurtSidebarSection({
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
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-white/[0.06] hover:ring-2 hover:ring-white/20"
    >
      <h2
        data-element-id={titleId}
        className="mb-1.5 inline-block cursor-text text-[0.7em] uppercase transition-shadow hover:ring-2 hover:ring-white/30 hover:ring-offset-1 hover:ring-offset-transparent"
        style={{
          color: SIDEBAR_TEXT,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          fontWeight: 700,
          letterSpacing: "0.2em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <div
        className="mb-2 h-px w-full"
        style={{ background: SIDEBAR_MUTED, opacity: 0.4 }}
      />
      {/* Override the section design so SectionBody renders text in the
          sidebar palette (light on dark) instead of the global theme. */}
      <SectionBody
        section={section}
        design={{
          ...d,
          accentColor: SIDEBAR_TEXT,
          textColor: SIDEBAR_TEXT,
        }}
        data={data}
      />
      <SectionActions section={section} />
    </section>
  );
}

function FrankfurtMainSection({
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
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-neutral-200/40 hover:ring-2 hover:ring-neutral-900/15"
    >
      <h2
        data-element-id={titleId}
        className="mb-1.5 inline-block cursor-text text-[0.85em] uppercase transition-shadow hover:ring-2 hover:ring-neutral-900/30 hover:ring-offset-2"
        style={{
          color: BLACK,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          fontWeight: 700,
          letterSpacing: "0.16em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <div
        className="mb-2 h-[2px] w-6"
        style={{ background: BLACK }}
      />
      <SectionBody
        section={section}
        design={{ ...d, accentColor: BLACK }}
        data={data}
      />
      <SectionActions section={section} />
    </section>
  );
}
