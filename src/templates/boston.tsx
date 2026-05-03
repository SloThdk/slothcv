/**
 * Boston — STEM PhD academic CV in the LaTeX/Computer Modern tradition.
 *
 * Visual character:
 *   - EB Garamond serif throughout (the closest free proxy to Computer Modern)
 *   - Pure single-column, dense, hairline rules — reads like a journal page
 *   - Dark red `#7f1d1d` accent, used ONLY for section title hairlines and the
 *     small "[N]" publication numbers — never on body text
 *   - Section titles in small-caps with a thin full-width rule beneath
 *   - Publications rendered as a NUMBERED list with hanging indent (the
 *     LaTeX `enumitem` look) — "[1]", "[2]" flush left, body indented
 *   - Years right-flush in JetBrains Mono so dates are vertically scannable
 *   - White background; no photo (academic norm)
 *
 * Industry-fit: PhD candidates in physics/CS/math/biology, postdocs,
 * tenure-track applicants. The format every search committee has seen 1000
 * times — fitting in is the design goal, not standing out.
 *
 * Hardcoded colors are intentional (Boston identity = oxblood + ivory + black);
 * `design.textColor` is reserved for body so the user can darken/lighten if they
 * want, while the accent stays Boston.
 */

"use client";

import { TemplateFrame } from "./frame";
import { SectionActions } from "./section-actions";
import {
  elementStyle,
  positionStyle,
  visibleBullets,
  visibleSections,
} from "./shared";
import type {
  Bullet,
  CertificationsSection,
  EducationSection,
  ExperienceSection,
  GlobalDesign,
  PublicationsSection,
  ResumeData,
  Section,
  TalksSection,
} from "@/types/resume";
import { EditableFallback, EditableSectionTitle } from "./components";

// Hardcoded Boston identity colors. Body text falls through to design.textColor
// so users can still tune contrast — but the accent stays oxblood.
const BOSTON_RED = "#7f1d1d";
const BOSTON_INK = "#0f0f0f";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function BostonTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Header — academic style: name, then degrees-and-affiliation line.
          No photo, no big graphic. Hairline rule below. */}
      <header
        data-section-id="personal"
        className="mb-5 cursor-pointer pb-3"
        style={{ borderBottom: `0.5px solid ${BOSTON_INK}55` }}
      >
        <h1
          data-element-id="personal.name"
          className="block w-fit cursor-text text-[2.4em] leading-[1.05] tracking-tight"
          style={{
            color: BOSTON_INK,
            fontFamily:
              "var(--font-eb-garamond, 'EB Garamond'), 'Source Serif 4', serif",
            fontWeight: 600,
            ...elementStyle(data, "personal.name"),
          }}
        >
          {personal.fullName || "Your Name"}
        </h1>
        {personal.headline && (
          <p
            data-element-id="personal.headline"
            className="mt-1 block w-fit cursor-text text-[0.95em] italic"
            style={{
              color: BOSTON_INK,
              fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
              ...elementStyle(data, "personal.headline"),
            }}
          >
            {personal.headline}
          </p>
        )}
        <BostonContact data={data} />
      </header>

      {/* Body — narrow gaps, dense. */}
      <div className="space-y-5">
        {visible.map((s) => (
          <BostonSection key={s.id} section={s} design={design} data={data} />
        ))}
      </div>
    </TemplateFrame>
  );
}

/** Inline pipe-separated contact line — academic convention. */
function BostonContact({ data }: { data: ResumeData }) {
  const { personal } = data;
  const items: { id: string; label: string; href?: string }[] = [];
  if (personal.email)
    items.push({ id: "personal.email", label: personal.email });
  if (personal.phone)
    items.push({ id: "personal.phone", label: personal.phone });
  if (personal.location)
    items.push({ id: "personal.location", label: personal.location });
  for (const l of personal.links) {
    items.push({
      id: `personal.links.${l.id}`,
      label: l.label || l.url,
      href: l.url,
    });
  }
  if (items.length === 0) return null;
  const grab =
    "inline-block cursor-text rounded-sm";
  return (
    <p
      className="mt-2 text-[0.85em]"
      style={{
        color: BOSTON_INK,
        fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
      }}
    >
      {items.map((p, i) => (
        <span key={p.id}>
          {i > 0 && <span className="mx-2 opacity-50">|</span>}
          {p.href ? (
            <a
              data-element-id={p.id}
              href={p.href.startsWith("http") ? p.href : `https://${p.href}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${grab} underline-offset-2 hover:underline`}
              style={{ color: BOSTON_RED, ...elementStyle(data, p.id) }}
            >
              {p.label}
            </a>
          ) : (
            <span
              data-element-id={p.id}
              className={grab}
              style={elementStyle(data, p.id)}
            >
              {p.label}
            </span>
          )}
        </span>
      ))}
    </p>
  );
}

function BostonSection({
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
      {/* Small-caps title with a thin, full-width Boston-red hairline beneath.
          Letterspacing wide so the small-caps read crisply at this size. */}
      <h2
        data-element-id={titleId}
        className="mb-1 inline-block cursor-text text-[0.8em] uppercase"
        style={{
          color: BOSTON_RED,
          fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
          fontWeight: 700,
          letterSpacing: "0.16em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <div
        className="mb-2 h-px w-full"
        style={{ background: `${BOSTON_RED}66`, height: "0.5px" }}
      />
      <BostonBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function BostonBody({
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
          className="cursor-text text-[0.95em] leading-[1.5]"
          style={{
            color: BOSTON_INK,
            fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Add a research summary."}
        </p>
      );
    }
    case "experience":
      return (
        <BostonExperience section={section} design={design} data={data} />
      );
    case "education":
      return (
        <BostonEducation section={section} design={design} data={data} />
      );
    case "publications":
      return (
        <BostonPublications section={section} design={design} data={data} />
      );
    case "talks":
      return <BostonTalks section={section} design={design} data={data} />;
    case "certifications":
      return <BostonCerts section={section} design={design} data={data} />;
    default:
      return <BostonFallback section={section} design={design} data={data} />;
  }
}

/** Year column class — JetBrains Mono so dates align vertically across rows.
 *  This is the one place a non-serif font appears, intentional contrast. */
const yearStyle = {
  color: `${BOSTON_INK}aa`,
  fontFamily:
    "var(--font-jetbrains-mono, 'JetBrains Mono'), 'IBM Plex Mono', monospace",
  fontSize: "0.78em",
};

function BostonExperience({
  section,
  data,
}: {
  section: ExperienceSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-2.5">
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        const year = formatYearOnly(it.startDate, it.endDate, it.current);
        return (
          <div
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm"
            style={elementStyle(data, id)}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div
                style={{
                  fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
                  color: BOSTON_INK,
                }}
              >
                <span className="font-semibold"><EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" /></span>
                {it.company && (
                  <span className="italic">
                    {" — "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.company`} value={it.company} placeholder="Company" />
                    {it.location ? `, ${it.location || "Location"}` : ""}
                  </span>
                )}
              </div>
              <span style={yearStyle}>{year}</span>
            </div>
            <BostonBullets
              bullets={it.bullets}
              data={data}
              sectionId={section.id}
            />
          </div>
        );
      })}
    </div>
  );
}

function BostonEducation({
  section,
  data,
}: {
  section: EducationSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-2.5">
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        const year = formatYearOnly(it.startDate, it.endDate, it.current);
        return (
          <div
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm"
            style={elementStyle(data, id)}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div
                style={{
                  fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
                  color: BOSTON_INK,
                }}
              >
                <span className="font-semibold">
                  <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.degree`} value={it.degree} placeholder="Degree" />
                  {it.field ? `, ${it.field || "Field of study"}` : ""}
                </span>
                <span className="italic">
                  {" — "}
                  <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.institution`} value={it.institution} placeholder="Institution" />
                  {it.location ? `, ${it.location || "Location"}` : ""}
                </span>
                {it.gpa && (
                  <span className="opacity-70"> · GPA <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.gpa`} value={it.gpa} placeholder="GPA" /></span>
                )}
              </div>
              <span style={yearStyle}>{year}</span>
            </div>
            <BostonBullets
              bullets={it.bullets}
              data={data}
              sectionId={section.id}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Numbered publications with hanging indent — the canonical academic look.
 *  CSS grid handles the [N] / body split so wrapping lines stay aligned with
 *  the body, not the number. */
function BostonPublications({
  section,
  data,
}: {
  section: PublicationsSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <ol className="space-y-1.5">
      {items.map((p, i) => {
        const id = `section.${section.id}.item.${p.id}`;
        return (
          <li
            key={p.id}
            data-element-id={id}
            className="grid cursor-grab grid-cols-[2.2em_1fr] gap-1 rounded-sm text-[0.9em]"
            style={{
              fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
              color: BOSTON_INK,
              ...elementStyle(data, id),
            }}
          >
            <span
              className="text-right tabular-nums"
              style={{ color: BOSTON_RED, fontWeight: 600 }}
            >
              [{i + 1}]
            </span>
            <span className="leading-[1.45]">
              {p.authors && <span><EditableFallback data={data} fieldId={`section.${section.id}.item.${p.id}.authors`} value={p.authors} placeholder="Authors" />. </span>}
              <span className="font-semibold"><EditableFallback data={data} fieldId={`section.${section.id}.item.${p.id}.title`} value={p.title} placeholder="Title" />.</span>
              {p.venue && <span className="italic"> <EditableFallback data={data} fieldId={`section.${section.id}.item.${p.id}.venue`} value={p.venue} placeholder="Venue" />.</span>}
              {p.date && <span> (<EditableFallback data={data} fieldId={`section.${section.id}.item.${p.id}.date`} value={p.date} placeholder="Date" />).</span>}
              {p.url && (
                <>
                  {" "}
                  <a
                    href={p.url.startsWith("http") ? p.url : `https://${p.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: BOSTON_RED }}
                    className="underline-offset-2 hover:underline"
                  >
                    [link]
                  </a>
                </>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function BostonTalks({
  section,
  data,
}: {
  section: TalksSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-1.5">
      {items.map((t) => {
        const id = `section.${section.id}.item.${t.id}`;
        return (
          <div
            key={t.id}
            data-element-id={id}
            className="flex cursor-grab items-baseline justify-between gap-3 rounded-sm text-[0.9em]"
            style={{
              fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
              color: BOSTON_INK,
              ...elementStyle(data, id),
            }}
          >
            <span>
              <span className="font-semibold"><EditableFallback data={data} fieldId={`section.${section.id}.item.${t.id}.title`} value={t.title} placeholder="Title" /></span>
              {t.venue && <span className="italic"> — <EditableFallback data={data} fieldId={`section.${section.id}.item.${t.id}.venue`} value={t.venue} placeholder="Venue" /></span>}
            </span>
            <span style={yearStyle}><EditableFallback data={data} fieldId={`section.${section.id}.item.${t.id}.date`} value={t.date} placeholder="Date" /></span>
          </div>
        );
      })}
    </div>
  );
}

function BostonCerts({
  section,
  data,
}: {
  section: CertificationsSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-1.5">
      {items.map((c) => {
        const id = `section.${section.id}.item.${c.id}`;
        return (
          <div
            key={c.id}
            data-element-id={id}
            className="flex cursor-grab items-baseline justify-between gap-3 rounded-sm text-[0.9em]"
            style={{
              fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
              color: BOSTON_INK,
              ...elementStyle(data, id),
            }}
          >
            <span>
              <span className="font-semibold"><EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.name`} value={c.name} placeholder="Name" /></span>
              {c.issuer && <span className="italic"> — <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.issuer`} value={c.issuer} placeholder="Issuer" /></span>}
            </span>
            <span style={yearStyle}><EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.date`} value={c.date} placeholder="Date" /></span>
          </div>
        );
      })}
    </div>
  );
}

function BostonFallback({
  section,
  data,
}: {
  section: Section;
  design: GlobalDesign;
  data: ResumeData;
}) {
  // Skills, languages, awards, hobbies, references — render compact list.
  if ("body" in section && (section as { body?: string }).body) {
    const id = `section.${section.id}.body`;
    return (
      <p
        data-element-id={id}
        className="cursor-text whitespace-pre-wrap text-[0.9em]"
        style={{
          color: BOSTON_INK,
          fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
          ...elementStyle(data, id),
        }}
      >
        {(section as { body: string }).body}
      </p>
    );
  }
  if ("items" in section) {
    const its = (section as {
      items: { id: string; name?: string; text?: string; visible: boolean }[];
    }).items;
    const visible = its.filter((i) => i.visible);
    return (
      <ul
        className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[0.9em]"
        style={{
          color: BOSTON_INK,
          fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
        }}
      >
        {visible.map((it) => {
          const id = `section.${section.id}.item.${it.id}`;
          return (
            <li
              key={it.id}
              data-element-id={id}
              className="cursor-grab rounded-sm"
              style={elementStyle(data, id)}
            >
              {it.name ?? it.text ?? ""}
            </li>
          );
        })}
      </ul>
    );
  }
  return null;
}

/** Footnote-style bullet list — small, indented, with a thin glyph. */
function BostonBullets({
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
      className="mt-1 space-y-0.5 pl-3 text-[0.88em] leading-[1.5]"
      style={{
        color: BOSTON_INK,
        fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
      }}
    >
      {list.map((b) => {
        const id = `section.${sectionId}.bullet.${b.id}`;
        return (
          <li
            key={b.id}
            data-element-id={id}
            className="flex cursor-text gap-2 rounded-sm"
            style={elementStyle(data, id)}
          >
            <span
              className="select-none"
              style={{ color: `${BOSTON_INK}66` }}
              aria-hidden
            >
              –
            </span>
            <span className="flex-1 whitespace-pre-wrap">{b.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Year-only formatter used by every Boston entry. Same logic as Cambridge,
 *  duplicated to avoid coupling sister templates' internals. */
function formatYearOnly(start: string, end: string, current: boolean): string {
  if (current) {
    const y = extractYear(start);
    return y ? `${y}–` : "";
  }
  const sy = extractYear(start);
  const ey = extractYear(end);
  if (sy && ey && sy !== ey) return `${sy}–${ey.slice(2)}`;
  return ey || sy || "";
}

function extractYear(raw: string): string {
  const m = /(\d{4})/.exec(raw);
  return m ? m[1] : "";
}
