/**
 * Dubai — luxury private bank. The CV equivalent of an embossed business
 * card on Carlton House Terrace stationery.
 *
 * Visual character:
 *   - Full-page deep navy `#0e1a3a` background — the design.pageBg is
 *     hardcoded-overridden via an absolute layer
 *   - Warm gold `#c9a449` accent — the only color besides ink and navy.
 *     Gold ornament marks (◆ diamond) before each section heading
 *   - 70% main / 30% right sidebar in slightly LIGHTER navy
 *     `#162347` so the sidebar reads as a brushed-metal panel
 *   - Gold hairline rules between sidebar items — never thicker than 0.5px
 *   - EB Garamond throughout — the only typeface allowed in the room.
 *     Italic for the headline, small caps for section titles
 *   - All text is warm-cream `#e7d9b8` to read on navy
 *
 * Industry-fit: family office, private wealth, luxury real estate, Gulf
 * sovereign-fund work, art advisory. Reads "discreet" — the opposite of
 * the public-tech LinkedIn aesthetic.
 *
 * Hardcoded colors: navy `#0e1a3a` body + gold `#c9a449` accent + cream
 * `#e7d9b8` text are intrinsic to Dubai's identity. Design-tab text/accent
 * still apply where flagged.
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

const NAVY = "#0e1a3a";
const NAVY_PANEL = "#162347";
const GOLD = "#c9a449";
const CREAM = "#e7d9b8";
const CREAM_MUTED = "#b9a578";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function DubaiTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const sidebar = visible.filter((s) => SIDEBAR_TYPES.has(s.type));
  const main = visible.filter((s) => !SIDEBAR_TYPES.has(s.type));

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Hard navy background — overrides design.pageBg for identity. */}
      <div
        className="absolute inset-0"
        style={{ background: NAVY, zIndex: 0 }}
        aria-hidden
      />

      <div
        className="relative z-[1]"
        style={{
          color: CREAM,
          fontFamily: "var(--cv-title-font, var(--font-eb-garamond, 'EB Garamond'), Garamond, serif)",
        }}
      >
        {/* Header — name centered, italic headline, gold rule */}
        <header
          data-section-id="personal"
          className="mb-6 cursor-pointer pb-4"
          style={{ borderBottom: `0.5px solid ${GOLD}` }}
        >
          <h1
            data-element-id="personal.name"
            className="block w-fit cursor-text text-[2.7em] leading-[1.05] tracking-tight"
            style={{
              color: CREAM,
              fontFamily: "var(--cv-title-font, var(--font-eb-garamond, 'EB Garamond'), Garamond, serif)",
              fontWeight: 500,
              ...elementStyle(data, "personal.name"),
            }}
          >
            {personal.fullName || "Your Name"}
          </h1>
          {personal.headline && (
            <p
              data-element-id="personal.headline"
              className="mt-1 block w-fit cursor-text text-[1em] italic"
              style={{
                color: GOLD,
                fontFamily: "var(--cv-title-font, var(--font-eb-garamond, 'EB Garamond'), Garamond, serif)",
                fontWeight: 400,
                ...elementStyle(data, "personal.headline"),
              }}
            >
              {personal.headline}
            </p>
          )}
        </header>

        {/* Body — 70 / 30 split */}
        <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 30%" }}>
          {/* Main */}
          <div className="space-y-5">
            {main.map((s) => (
              <DubaiMainSection key={s.id} section={s} data={data} />
            ))}
          </div>

          {/* Right sidebar — slightly lighter navy panel */}
          <aside
            className="space-y-4 rounded-sm p-4"
            style={{
              background: NAVY_PANEL,
              // box-shadow (not outline) survives PDF export
              boxShadow: `0 0 0 0.5px ${GOLD}66`,
            }}
          >
            {/* Photo top, gold-outlined */}
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
                  // box-shadow + design.photo.borderColor override (Design → Photo → Border)
                  style={{ boxShadow: `0 0 0 1px ${design.photo.borderColor || GOLD}` }}
                />
              </div>
            )}
            <DubaiContact data={data} />
            {sidebar.map((s) => (
              <DubaiSidebarSection key={s.id} section={s} data={data} />
            ))}
          </aside>
        </div>
      </div>
    </TemplateFrame>
  );
}

/** Gold diamond ornament rendered before each section heading. */
function GoldOrnament() {
  return (
    <span
      aria-hidden
      className="select-none"
      style={{ color: GOLD, marginRight: "6px", fontSize: "0.8em" }}
    >
      ◆
    </span>
  );
}

function DubaiContact({ data }: { data: ResumeData }) {
  const { personal } = data;
  const grab =
    "block w-fit cursor-text rounded-sm";
  return (
    <div>
      <h3
        className="mb-1 text-[0.85em]"
        style={{
          color: GOLD,
          fontFamily: "var(--cv-title-font, var(--font-eb-garamond, 'EB Garamond'), Garamond, serif)",
          fontWeight: 600,
          fontVariant: "small-caps",
          letterSpacing: "0.12em",
        }}
      >
        <GoldOrnament />
        Contact
      </h3>
      <div
        className="space-y-0.5 text-[0.85em] break-words"
        style={{ color: CREAM }}
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
            style={{ color: CREAM_MUTED, ...elementStyle(data, "personal.location") }}
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
              style={{ color: GOLD, ...elementStyle(data, id) }}
            >
              {l.label || l.url}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function DubaiSidebarSection({
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
        className="mb-1 inline-block cursor-text text-[0.85em]"
        style={{
          color: GOLD,
          fontFamily: "var(--cv-title-font, var(--font-eb-garamond, 'EB Garamond'), Garamond, serif)",
          fontWeight: 600,
          fontVariant: "small-caps",
          letterSpacing: "0.12em",
          ...elementStyle(data, titleId),
        }}
      >
        <GoldOrnament />
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <div
        className="mb-1.5 h-px w-full"
        style={{ background: GOLD, opacity: 0.4 }}
      />
      {/* Override colors for the dark panel — light text + gold accent. */}
      <SectionBody
        section={section}
        design={{ ...d, accentColor: GOLD, textColor: CREAM }}
        data={data}
      />
      <SectionActions section={section} />
    </section>
  );
}

function DubaiMainSection({
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
        className="mb-2 inline-block cursor-text text-[1em]"
        style={{
          color: GOLD,
          fontFamily: "var(--cv-title-font, var(--font-eb-garamond, 'EB Garamond'), Garamond, serif)",
          fontWeight: 600,
          fontVariant: "small-caps",
          letterSpacing: "0.1em",
          ...elementStyle(data, titleId),
        }}
      >
        <GoldOrnament />
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <div
        className="mb-2 h-px w-full"
        style={{ background: GOLD, opacity: 0.5 }}
      />
      <SectionBody
        section={section}
        design={{ ...d, accentColor: GOLD, textColor: CREAM }}
        data={data}
      />
      <SectionActions section={section} />
    </section>
  );
}
