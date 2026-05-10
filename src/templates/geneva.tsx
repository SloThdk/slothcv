/**
 * Geneva — Swiss-precision banking. The right sidebar carries the data,
 * the left main carries the prose.
 *
 * Visual character:
 *   - 38% / 62% split inverted from the usual layout (sidebar on the RIGHT
 *     so the eye lands on the narrative first, KPI tiles second)
 *   - Sidebar is a soft slate-50 (#f1f5f9) panel with KPI tiles —
 *     {"AUM: $2.1B"} pulled from `it.location` or the first bullet of each role
 *   - Navy #1e3a8a accent, used sparingly: name underline + KPI tile borders
 *     + section heading caps
 *   - Source Serif 4 for the name (gravitas), Inter everywhere else (clarity)
 *   - Photo lives top of right sidebar, sized down — banking CVs aren't
 *     supposed to feel like portfolios
 *
 * Industry-fit: investment banking, private wealth, institutional asset
 * management, M&A advisory. The KPI tiles read as deal-list shorthand to
 * a banking eye — a UX choice that's intrinsic to the template's identity.
 *
 * Hardcoded color note: navy `#1e3a8a` is intrinsic to "banking" — overriding
 * via the Design tab still works (text/accent are sourced from `design`),
 * but the slate sidebar background and the navy KPI border are part of
 * the template's identity, like Aurora's mint.
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
import type {
  ExperienceSection,
  ResumeData,
  Section,
} from "@/types/resume";

// Banking-eye sidebar: short, scannable proof points.
const SIDEBAR_TYPES = new Set<Section["type"]>([
  "skills",
  "languages",
  "certifications",
  "awards",
]);

// Hardcoded navy + slate — intrinsic to Geneva's banking identity.
const NAVY = "#1e3a8a";
const SLATE_BG = "#f1f5f9";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function GenevaTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const sidebar = visible.filter((s) => SIDEBAR_TYPES.has(s.type));
  const main = visible.filter((s) => !SIDEBAR_TYPES.has(s.type));
  // Find the experience section so KPI tiles can pull deal-shorthand from it.
  const experience = visible.find(
    (s): s is ExperienceSection => s.type === "experience",
  );

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Header — name LEFT, big serif. No photo here; photo lives in sidebar. */}
      <header
        data-section-id="personal"
        className="mb-6 cursor-pointer pb-3"
        style={{ borderBottom: `2px solid ${NAVY}` }}
      >
        <h1
          data-element-id="personal.name"
          className="block w-fit cursor-text text-[2.5em] leading-[1.05] tracking-tight"
          style={{
            color: NAVY,
            fontFamily:
              "var(--font-source-serif-4, 'Source Serif 4'), Georgia, serif",
            fontWeight: 600,
            ...elementStyle(data, "personal.name"),
          }}
        >
          {personal.fullName || "Your Name"}
        </h1>
        {personal.headline && (
          <p
            data-element-id="personal.headline"
            className="mt-1 block w-fit cursor-text text-[0.92em] uppercase"
            style={{
              color: `${design.textColor}99`,
              fontFamily: "var(--font-inter, 'Inter'), sans-serif",
              fontWeight: 500,
              letterSpacing: "0.14em",
              ...elementStyle(data, "personal.headline"),
            }}
          >
            {personal.headline}
          </p>
        )}
      </header>

      {/* Body — 62% main / 38% sidebar (right) */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "62% 1fr" }}>
        {/* ---- Main ---- */}
        <div className="space-y-5">
          {main.map((s) => (
            <GenevaMainSection key={s.id} section={s} data={data} />
          ))}
        </div>

        {/* ---- Right sidebar ---- */}
        <aside
          className="space-y-4 rounded-md p-4"
          style={{ background: SLATE_BG }}
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
                className="h-20 w-20 rounded-sm object-cover"
                // box-shadow (not outline) survives PDF export
                style={{ boxShadow: `0 0 0 1.5px ${NAVY}` }}
              />
            </div>
          )}

          {/* Contact stack */}
          <GenevaContact data={data} />

          {/* KPI tiles pulled from experience — banking shorthand */}
          {experience && <KpiTiles experience={experience} />}

          {/* Sidebar sections */}
          {sidebar.map((s) => (
            <GenevaSidebarSection key={s.id} section={s} data={data} />
          ))}
        </aside>
      </div>
    </TemplateFrame>
  );
}

/** Contact stack — quiet uppercase labels above each value, banking-form feel. */
function GenevaContact({ data }: { data: ResumeData }) {
  const { personal, design } = data;
  const grab =
    "block w-fit cursor-text rounded-sm";
  return (
    <div>
      <h3
        className="mb-1.5 text-[0.7em] uppercase"
        style={{
          color: NAVY,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          fontWeight: 700,
          letterSpacing: "0.18em",
        }}
      >
        Contact
      </h3>
      <div
        className="space-y-0.5 text-[0.78em]"
        style={{
          color: design.textColor,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
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

/** KPI tiles — pulls deal-shorthand from each role.
 *  Reads `location` first (where bankers stash AUM / portfolio size), falls
 *  back to the first bullet truncated to ~30 chars. */
function KpiTiles({ experience }: { experience: ExperienceSection }) {
  // Pull up to 3 visible items, take their proof point.
  const tiles = experience.items
    .filter((i) => i.visible)
    .slice(0, 3)
    .map((it) => {
      const proof =
        it.location ||
        it.bullets.find((b) => b.visible && b.text.trim())?.text ||
        "";
      const short = proof.length > 38 ? `${proof.slice(0, 35)}…` : proof;
      return { role: it.role, company: it.company, proof: short };
    })
    .filter((t) => t.proof);

  if (tiles.length === 0) return null;

  return (
    <div>
      <h3
        className="mb-1.5 text-[0.7em] uppercase"
        style={{
          color: NAVY,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          fontWeight: 700,
          letterSpacing: "0.18em",
        }}
      >
        Highlights
      </h3>
      <div className="space-y-1.5">
        {tiles.map((t, i) => (
          <div
            key={i}
            className="rounded-sm bg-white px-2.5 py-1.5 text-[0.78em]"
            style={{ borderLeft: `3px solid ${NAVY}` }}
          >
            <div
              className="font-semibold"
              style={{
                color: NAVY,
                fontFamily: "var(--font-inter, 'Inter'), sans-serif",
              }}
            >
              {t.proof}
            </div>
            <div
              className="text-[0.85em]"
              style={{ color: "#475569" }}
            >
              {t.role}
              {t.company ? ` · ${t.company}` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Main column section — serifed name above content, navy uppercase title. */
function GenevaMainSection({
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
          color: NAVY,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          fontWeight: 700,
          letterSpacing: "0.16em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <div
        className="mb-2 h-[1.5px] w-8"
        style={{ background: NAVY }}
      />
      <SectionBody
        section={section}
        design={{ ...d, accentColor: NAVY }}
        data={data}
      />
      <SectionActions section={section} />
    </section>
  );
}

/** Sidebar sections — same body but smaller title + tighter margins. */
function GenevaSidebarSection({
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
        className="mb-1.5 inline-block cursor-text text-[0.7em] uppercase"
        style={{
          color: NAVY,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          fontWeight: 700,
          letterSpacing: "0.18em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <SectionBody
        section={section}
        design={{ ...d, accentColor: NAVY }}
        data={data}
      />
      <SectionActions section={section} />
    </section>
  );
}
