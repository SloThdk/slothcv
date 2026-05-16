/**
 * Davos — strategy / board executive CV. The "I've stopped trying to
 * impress" template: Mayfair retired, Manhattan grew up, Davos is what's
 * left. Reads "WEF panelist, advisor at PE shops, $50M+ scope".
 *
 * Visual character:
 *   - VERY wide outer spacing — implicit 100px gutter via `px-14` inner pad
 *     so even a "narrow" margin user gets the Davos breathing room
 *   - All-caps section heads at 0.18em letter-spacing — the only emphasis
 *     in the entire document. No bold body text anywhere
 *   - Inter at weight 300 (Light) for everything — the wispy, paper-thin
 *     body is the point. At 11pt with line-height 1.55 it reads like a
 *     consulting deck appendix
 *   - Light gray hairline rules (0.5px) — `#0c0a09` text on `#fafaf9`
 *   - One-pager bias: medium content density, single column, generous
 *     paragraph gaps
 *   - No accent color whatsoever — neutrals only. Restraint as luxury
 *
 * Industry-fit: VC partners, PE operators, board directors, ex-McK/Bain
 * partners now advising, sovereign wealth fund execs. The "I am not
 * looking for a job, but here's the document if you insist" CV.
 *
 * Hardcoded near-black + warm-white = Davos identity. No accent override
 * — deliberately monochromatic.
 */

"use client";

import { TemplateFrame } from "./frame";
import { SectionActions } from "./section-actions";
import {
  elementStyle,
  formatDateRange,
  positionStyle,
  visibleBullets,
  visibleSections,
} from "./shared";
import type {
  Bullet,
  CareerBreakSection,
  ExperienceSection,
  GlobalDesign,
  ResumeData,
  Section,
} from "@/types/resume";
import { EditableFallback, EditableSectionTitle } from "./components";

const INK = "#0c0a09";
const SURFACE = "#fafaf9";
const RULE = "#d6d3d1"; // Stone-300, the only "color" in the template.

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function DavosTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Surface wash — Davos warm-white regardless of user pageBg. */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: SURFACE }}
        aria-hidden
      />
      <div className="relative px-10">
        {/* Header — name top-left, contact aligned RIGHT. The asymmetric
            layout reads like a corporate letterhead. */}
        <header
          data-section-id="personal"
          className="mb-10 flex cursor-pointer items-end justify-between gap-6 pb-4"
          style={{ borderBottom: `0.5px solid ${RULE}` }}
        >
          <div>
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.2em] leading-[1] tracking-tight"
              style={{
                color: INK,
                fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
                fontWeight: 300,
                letterSpacing: "-0.01em",
                ...elementStyle(data, "personal.name"),
              }}
            >
              {personal.fullName || "Your Name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-1.5 block w-fit cursor-text text-[0.78em] uppercase"
                style={{
                  color: `${INK}88`,
                  fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
                  fontWeight: 400,
                  letterSpacing: "0.22em",
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
          </div>
          <DavosContactStack data={data} />
        </header>

        <div className="space-y-9">
          {visible.map((s) => (
            <DavosSection key={s.id} section={s} design={design} data={data} />
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

/** Contact aligned right — stacked, monospace-feel via tabular-nums.
 *  Each line is its own draggable element. */
function DavosContactStack({ data }: { data: ResumeData }) {
  const { personal } = data;
  return (
    <div className="text-right text-[0.8em] tabular-nums">
      {personal.email && (
        <div
          data-element-id="personal.email"
          className="cursor-text rounded-sm"
          style={{ color: INK, ...elementStyle(data, "personal.email") }}
        >
          {personal.email}
        </div>
      )}
      {personal.phone && (
        <div
          data-element-id="personal.phone"
          className="cursor-text rounded-sm"
          style={{ color: INK, ...elementStyle(data, "personal.phone") }}
        >
          {personal.phone}
        </div>
      )}
      {personal.location && (
        <div
          data-element-id="personal.location"
          className="cursor-text rounded-sm"
          style={{
            color: `${INK}cc`,
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
            className="block cursor-text rounded-sm underline-offset-2 hover:underline"
            style={{ color: INK, ...elementStyle(data, id) }}
          >
            {l.label || l.url}
          </a>
        );
      })}
    </div>
  );
}

function DavosSection({
  section,
  design,
  data,
}: {
  section: Section;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const titleId = `section.${section.id}.title`;
  return (
    <section
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1"
    >
      {/* All-caps tracked title — the ONLY emphasis Davos allows. */}
      <h2
        data-element-id={titleId}
        className="mb-3 inline-block cursor-text text-[0.7em] uppercase"
        style={{
          color: INK,
          fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
          fontWeight: 500,
          letterSpacing: "0.18em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <DavosBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function DavosBody({
  section,
  design,
  data,
}: {
  section: Section;
  design: GlobalDesign;
  data: ResumeData;
}) {
  switch (section.type) {
    case "summary": {
      const id = `section.${section.id}.body`;
      return (
        <p
          data-element-id={id}
          className="cursor-text text-[0.95em] leading-[1.6]"
          style={{
            color: INK,
            fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
            fontWeight: 300,
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Add a brief positioning statement."}
        </p>
      );
    }
    case "careerBreak":
    case "experience":
      return (
        <DavosExperience section={section} design={design} data={data} />
      );
    default:
      return <DavosFallback section={section} data={data} />;
  }
}

function DavosExperience({
  section,
  design,
  data,
}: {
  section: ExperienceSection | CareerBreakSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-5">
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        return (
          <article
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm"
            style={elementStyle(data, id)}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3
                className="text-[1em]"
                style={{
                  color: INK,
                  fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
                  fontWeight: 500,
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                {it.company && (
                  <span style={{ color: `${INK}aa`, fontWeight: 300 }}>
                    {" — "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.company`} value={it.company} placeholder="Company" />
                  </span>
                )}
              </h3>
              <span
                className="text-[0.78em] tabular-nums"
                style={{
                  color: `${INK}88`,
                  fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
                  fontWeight: 300,
                  letterSpacing: "0.04em",
                }}
              >
                {formatDateRange(
                  it.startDate,
                  it.endDate,
                  it.current,
                  design.dateFormat,
                )}
              </span>
            </div>
            {it.location && (
              <div
                className="text-[0.82em]"
                style={{ color: `${INK}77`, fontWeight: 300 }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.location`} value={it.location} placeholder="Location" />
              </div>
            )}
            <DavosBullets
              bullets={it.bullets}
              data={data}
              sectionId={section.id}
            />
          </article>
        );
      })}
    </div>
  );
}

function DavosBullets({
  bullets,
  data,
  sectionId,
}: {
  bullets: Bullet[];
  data: ResumeData;
  sectionId: string;
}) {
  const list = visibleBullets(bullets);
  if (list.length === 0) return null;
  return (
    <ul
      className="mt-2 space-y-1 text-[0.92em] leading-[1.55]"
      style={{
        color: INK,
        fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
        fontWeight: 300,
      }}
    >
      {list.map((b) => {
        const id = `section.${sectionId}.bullet.${b.id}`;
        return (
          <li
            key={b.id}
            data-element-id={id}
            className="flex cursor-text gap-3 rounded-sm"
            style={elementStyle(data, id)}
          >
            {/* Em-dash, not a glyph — quietest possible bullet. */}
            <span
              className="select-none pt-[0.4em]"
              style={{ color: `${INK}aa` }}
              aria-hidden
            >
              —
            </span>
            <span className="flex-1 whitespace-pre-wrap">{b.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function DavosFallback({
  section,
  data,
}: {
  section: Section;
  data: ResumeData;
}) {
  if ("body" in section && (section as { body?: string }).body) {
    const id = `section.${section.id}.body`;
    return (
      <p
        data-element-id={id}
        className="cursor-text whitespace-pre-wrap text-[0.95em] leading-[1.6]"
        style={{
          color: INK,
          fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
          fontWeight: 300,
          ...elementStyle(data, id),
        }}
      >
        {(section as { body: string }).body}
      </p>
    );
  }
  if ("items" in section) {
    const its = (section as {
      items: {
        id: string;
        name?: string;
        text?: string;
        proficiency?: string;
        visible: boolean;
      }[];
    }).items;
    const visible = its.filter((i) => i.visible);
    return (
      <ul
        className="space-y-1 text-[0.92em]"
        style={{
          color: INK,
          fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
          fontWeight: 300,
        }}
      >
        {visible.map((it) => {
          const id = `section.${section.id}.item.${it.id}`;
          const label = it.name ?? it.text ?? "";
          return (
            <li
              key={it.id}
              data-element-id={id}
              className="flex cursor-grab justify-between gap-3 rounded-sm border-b"
              style={{
                borderColor: RULE,
                paddingBottom: "0.25em",
                ...elementStyle(data, id),
              }}
            >
              <span>{label}</span>
              {it.proficiency && (
                <span style={{ color: `${INK}77` }}><EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.proficiency`} value={it.proficiency} placeholder="Proficiency" /></span>
              )}
            </li>
          );
        })}
      </ul>
    );
  }
  return null;
}
