/**
 * Cambridge — academic / publications-heavy template.
 *
 * Visual character:
 *   - EB Garamond serif throughout (academic exception to the sans rule)
 *   - 12/88 split with year-in-gutter for every entry — the year sits
 *     in the left margin, right-aligned, while the entry body fills the
 *     right column. Reads like a journal.
 *   - Italic small-caps section headings, hairline rule beneath
 *   - Oxford burgundy accent used SPARINGLY (links only)
 *   - No photo (academic norm)
 *
 * Industry-fit: professors, PhD candidates, researchers, scientists.
 * Mirrors the CV format every academic has read 1000 times — fitting in
 * is more important than standing out.
 */

"use client";

import { TemplateFrame } from "./frame";
import { SectionActions } from "./section-actions";
import {
  bulletGlyph,
  elementStyle,
  formatDateRange,
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

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

const BURGUNDY = "#5C0E1F";

export function CambridgeTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Header — name + degrees inline (academic convention). No photo. */}
      <header
        data-section-id="personal"
        className="mb-6 cursor-pointer pb-3"
        style={{ borderBottom: "0.5px solid #00000022" }}
      >
        <h1
          data-element-id="personal.name"
          className="block w-fit cursor-text text-[2.2em] leading-[1.05] tracking-tight transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
          style={{
            color: "#1A1A1A",
            fontFamily:
              "var(--font-eb-garamond, 'EB Garamond'), 'Source Serif 4', serif",
            fontWeight: 500,
            ...elementStyle(data, "personal.name"),
          }}
        >
          {personal.fullName || "Your Name"}
        </h1>
        {personal.headline && (
          <p
            data-element-id="personal.headline"
            className="mt-1 block w-fit cursor-text text-[1em] italic transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
            style={{
              color: "#3a3a3a",
              fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
              fontWeight: 400,
              ...elementStyle(data, "personal.headline"),
            }}
          >
            {personal.headline}
          </p>
        )}
        <CambridgeContact data={data} />
      </header>

      <div className="space-y-6">
        {visible.map((s) => (
          <CambridgeSection
            key={s.id}
            section={s}
            design={design}
            data={data}
          />
        ))}
      </div>
    </TemplateFrame>
  );
}

function CambridgeContact({ data }: { data: ResumeData }) {
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
    "inline-block cursor-text transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2 rounded-sm";
  return (
    <p
      className="mt-2 text-[0.85em]"
      style={{
        color: "#3a3a3a",
        fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
      }}
    >
      {items.map((p, i) => (
        <span key={p.id}>
          {i > 0 && <span className="mx-2 opacity-60">·</span>}
          {p.href ? (
            <a
              data-element-id={p.id}
              href={p.href.startsWith("http") ? p.href : `https://${p.href}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${grab} underline-offset-2 hover:underline`}
              style={{ color: BURGUNDY, ...elementStyle(data, p.id) }}
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

function CambridgeSection({
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
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-neutral-100/60 hover:ring-2 hover:ring-neutral-900/10"
    >
      <h2
        data-element-id={titleId}
        className="mb-2 inline-block cursor-text italic transition-shadow hover:ring-2 hover:ring-neutral-900/30 hover:ring-offset-2"
        style={{
          color: "#1A1A1A",
          fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
          fontSize: "1.1em",
          fontWeight: 500,
          ...elementStyle(data, titleId),
        }}
      >
        {section.title}
      </h2>
      <div
        className="mb-3 h-px"
        style={{ background: "#00000026", width: "32%" }}
      />
      <CambridgeBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

/** Year-in-gutter row — the signature Cambridge layout primitive.
 *  12% left column for the year, 88% right column for the entry. */
function GutterRow({
  year,
  children,
}: {
  year: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[12%_1fr] gap-4">
      <div
        className="text-right text-[0.82em]"
        style={{
          color: "#666",
          fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
        }}
      >
        {year}
      </div>
      <div>{children}</div>
    </div>
  );
}

function CambridgeBody({
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
          className="cursor-text text-[1em] leading-[1.55] transition-shadow hover:ring-2 hover:ring-neutral-900/15 hover:ring-offset-2"
          style={{
            color: "#1A1A1A",
            fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Add a summary."}
        </p>
      );
    }
    case "experience":
      return (
        <CambridgeExperience section={section} design={design} data={data} />
      );
    case "education":
      return (
        <CambridgeEducation section={section} design={design} data={data} />
      );
    case "publications":
      return (
        <CambridgePublications section={section} design={design} data={data} />
      );
    case "talks":
      return <CambridgeTalks section={section} design={design} data={data} />;
    case "certifications":
      return (
        <CambridgeCerts section={section} design={design} data={data} />
      );
    default:
      // Fallback for skills, languages, awards, hobbies, references
      return (
        <CambridgeFallback section={section} design={design} data={data} />
      );
  }
}

function CambridgeExperience({
  section,
  design,
  data,
}: {
  section: ExperienceSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        const year = formatYearOnly(it.startDate, it.endDate, it.current);
        return (
          <div
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <GutterRow year={year}>
              <div
                style={{
                  fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
                }}
              >
                <div className="font-semibold" style={{ color: "#1A1A1A" }}>
                  {it.role}
                </div>
                {it.company && (
                  <div className="italic" style={{ color: "#3a3a3a" }}>
                    {it.company}
                    {it.location ? `, ${it.location}` : ""}
                  </div>
                )}
                <CambridgeBullets
                  bullets={it.bullets}
                  data={data}
                  sectionId={section.id}
                  design={design}
                />
              </div>
            </GutterRow>
          </div>
        );
      })}
    </div>
  );
}

function CambridgeEducation({
  section,
  data,
}: {
  section: EducationSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        const year = formatYearOnly(it.startDate, it.endDate, it.current);
        return (
          <div
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <GutterRow year={year}>
              <div
                style={{
                  fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
                }}
              >
                <div className="font-semibold" style={{ color: "#1A1A1A" }}>
                  {it.degree}
                  {it.field ? `, ${it.field}` : ""}
                </div>
                <div className="italic" style={{ color: "#3a3a3a" }}>
                  {it.institution}
                  {it.location ? `, ${it.location}` : ""}
                </div>
              </div>
            </GutterRow>
          </div>
        );
      })}
    </div>
  );
}

function CambridgePublications({
  section,
  data,
}: {
  section: PublicationsSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-3">
      {items.map((p) => {
        const id = `section.${section.id}.item.${p.id}`;
        return (
          <div
            key={p.id}
            data-element-id={id}
            className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <GutterRow year={p.date || ""}>
              <div
                className="text-[0.95em]"
                style={{
                  fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
                  color: "#1A1A1A",
                }}
              >
                {p.authors && (
                  <span>
                    {p.authors}.{" "}
                  </span>
                )}
                <span className="font-semibold">{p.title}.</span>
                {p.venue && <span className="italic"> {p.venue}.</span>}
                {p.url && (
                  <>
                    {" "}
                    <a
                      href={
                        p.url.startsWith("http") ? p.url : `https://${p.url}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: BURGUNDY }}
                      className="underline-offset-2 hover:underline"
                    >
                      doi
                    </a>
                  </>
                )}
              </div>
            </GutterRow>
          </div>
        );
      })}
    </div>
  );
}

function CambridgeTalks({
  section,
  data,
}: {
  section: TalksSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-2">
      {items.map((t) => {
        const id = `section.${section.id}.item.${t.id}`;
        return (
          <div
            key={t.id}
            data-element-id={id}
            className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <GutterRow year={t.date || ""}>
              <div
                style={{
                  fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
                  color: "#1A1A1A",
                }}
              >
                <span className="font-semibold">{t.title}</span>
                {t.venue && <span>, {t.venue}</span>}
              </div>
            </GutterRow>
          </div>
        );
      })}
    </div>
  );
}

function CambridgeCerts({
  section,
  data,
}: {
  section: CertificationsSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-2">
      {items.map((c) => {
        const id = `section.${section.id}.item.${c.id}`;
        return (
          <div
            key={c.id}
            data-element-id={id}
            className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <GutterRow year={c.date || ""}>
              <div
                style={{
                  fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
                  color: "#1A1A1A",
                }}
              >
                <span className="font-semibold">{c.name}</span>
                {c.issuer && <span className="italic"> · {c.issuer}</span>}
              </div>
            </GutterRow>
          </div>
        );
      })}
    </div>
  );
}

function CambridgeBullets({
  bullets,
  data,
  sectionId,
  design,
}: {
  bullets: Bullet[];
  data: ResumeData;
  sectionId: string;
  design: GlobalDesign;
}) {
  const list = visibleBullets(bullets);
  if (list.length === 0) return null;
  // Honour the user's chosen bullet style (disc / dash / arrow / square /
  // none) — earlier this was hardcoded to a dash, which was a dead-end
  // for the global design control.
  const glyph = bulletGlyph(design);
  return (
    <ul
      className="mt-1 space-y-0.5 text-[0.9em]"
      style={{
        color: "#1A1A1A",
        fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
      }}
    >
      {list.map((b) => {
        const id = `section.${sectionId}.bullet.${b.id}`;
        return (
          <li
            key={b.id}
            data-element-id={id}
            className="flex cursor-text gap-2 rounded-sm pl-3 transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            {glyph && (
              <span
                className="select-none"
                style={{ color: "#888" }}
                aria-hidden
              >
                {glyph}
              </span>
            )}
            <span className="flex-1 whitespace-pre-wrap">{b.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function CambridgeFallback({
  section,
  design,
  data,
}: {
  section: Section;
  design: GlobalDesign;
  data: ResumeData;
}) {
  // For sections that don't fit the year-in-gutter pattern (skills,
  // languages, awards, hobbies, references) — render as a simple
  // line list with serif typography.
  if ("body" in section && (section as { body?: string }).body) {
    const id = `section.${section.id}.body`;
    return (
      <p
        data-element-id={id}
        className="cursor-text whitespace-pre-wrap text-[0.95em] transition-shadow hover:ring-2 hover:ring-neutral-900/15"
        style={{
          color: "#1A1A1A",
          fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
          ...elementStyle(data, id),
        }}
      >
        {(section as { body: string }).body}
      </p>
    );
  }
  if ("items" in section) {
    const its = (section as { items: { id: string; name?: string; text?: string; visible: boolean }[] }).items;
    const visible = its.filter((i) => i.visible);
    return (
      <ul
        className="space-y-0.5 text-[0.95em]"
        style={{
          color: "#1A1A1A",
          fontFamily: "var(--font-eb-garamond, 'EB Garamond'), serif",
        }}
      >
        {visible.map((it) => {
          const id = `section.${section.id}.item.${it.id}`;
          return (
            <li
              key={it.id}
              data-element-id={id}
              className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
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

/** Compact year extractor — academic CVs prefer "2024" over "Mar 2022 – Present"
 *  in the gutter. We pull the start year (or end year for finished items). */
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
