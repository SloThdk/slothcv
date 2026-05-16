/**
 * Stanford — modern tech-academia CV. Where Boston feels Computer-Modern,
 * Stanford feels "Inter on the body, EB Garamond on the name, fresh".
 *
 * Visual character:
 *   - Cardinal-red `#8c1515` accent on every section title (full underline,
 *     not just hairline) — signals tech academia / SAIL / HAI alumni
 *   - EB Garamond ONLY on the name (display); Inter for everything else.
 *     Mixing display-serif + clean-sans is the modern academic move
 *   - TWO-COLUMN body for publications and grants — wider page is rare in
 *     academic CVs, the columns are the stand-out
 *   - Mid-density: more breathing room than Boston, but still publications-first
 *   - Inline section title + content (titles sit ON TOP of the rule, not above)
 *   - White bg, no photo
 *
 * Industry-fit: ML/CV PhDs, AI researchers, applied scientists, Google Brain
 * alumni, anyone who wants to read "Stanford-tier" without naming a university.
 *
 * Accent is Stanford-Cardinal-locked because that's the template identity —
 * users tune body color via design.textColor.
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
  CareerBreakSection,
  ExperienceSection,
  GlobalDesign,
  PublicationsSection,
  ResumeData,
  Section,
  TalksSection,
} from "@/types/resume";
import { EditableFallback, EditableSectionTitle } from "./components";

const CARDINAL = "#8c1515";
const INK = "#1a1a1a";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function StanfordTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Header — display-serif name in cardinal red, sans body. */}
      <header data-section-id="personal" className="mb-6 cursor-pointer">
        <h1
          data-element-id="personal.name"
          className="block w-fit cursor-text text-[2.7em] leading-[1.02] tracking-tight"
          style={{
            color: CARDINAL,
            fontFamily: "var(--cv-title-font, var(--font-eb-garamond, 'EB Garamond'), 'Source Serif 4', serif)",
            fontWeight: 600,
            ...elementStyle(data, "personal.name"),
          }}
        >
          {personal.fullName || "Your Name"}
        </h1>
        {personal.headline && (
          <p
            data-element-id="personal.headline"
            className="mt-0.5 block w-fit cursor-text text-[0.95em]"
            style={{
              color: INK,
              fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
              fontWeight: 500,
              ...elementStyle(data, "personal.headline"),
            }}
          >
            {personal.headline}
          </p>
        )}
        <StanfordContact data={data} />
      </header>

      <div className="space-y-5">
        {visible.map((s) => (
          <StanfordSection key={s.id} section={s} design={design} data={data} />
        ))}
      </div>
    </TemplateFrame>
  );
}

function StanfordContact({ data }: { data: ResumeData }) {
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
        color: INK,
        fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
      }}
    >
      {items.map((p, i) => (
        <span key={p.id}>
          {i > 0 && <span className="mx-2 opacity-40">·</span>}
          {p.href ? (
            <a
              data-element-id={p.id}
              href={p.href.startsWith("http") ? p.href : `https://${p.href}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${grab} underline-offset-2 hover:underline`}
              style={{ color: CARDINAL, ...elementStyle(data, p.id) }}
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

function StanfordSection({
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
      {/* Title sits flush above a 2px cardinal-red rule. The combination
          looks like an academic h2 from a Stanford research group homepage. */}
      <h2
        data-element-id={titleId}
        className="inline-block cursor-text text-[1.05em] uppercase"
        style={{
          color: CARDINAL,
          fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
          fontWeight: 700,
          letterSpacing: "0.06em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <div
        className="mb-2.5 mt-1 h-[2px] w-full"
        style={{ background: CARDINAL }}
      />
      <StanfordBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function StanfordBody({
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
          className="cursor-text text-[0.95em] leading-[1.55]"
          style={{
            color: INK,
            fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Add a research statement."}
        </p>
      );
    }
    case "careerBreak":
    case "experience":
      return (
        <StanfordExperience section={section} design={design} data={data} />
      );
    case "education":
      return (
        <StanfordEducation section={section} design={design} data={data} />
      );
    case "publications":
      // Two-column treatment — Stanford's signature.
      return <StanfordTwoCol section={section} data={data} kind="pub" />;
    case "talks":
      return <StanfordTwoCol section={section} data={data} kind="talk" />;
    case "certifications":
      return <StanfordCerts section={section} data={data} />;
    default:
      return <StanfordFallback section={section} data={data} />;
  }
}

function StanfordExperience({
  section,
  data,
}: {
  section: ExperienceSection | CareerBreakSection;
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
            className="cursor-grab rounded-sm"
            style={elementStyle(data, id)}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div
                style={{
                  fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
                  color: INK,
                }}
              >
                <span className="font-semibold"><EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" /></span>
                {it.company && (
                  <span style={{ color: CARDINAL }}>
                    {", "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.company`} value={it.company} placeholder="Company" />
                  </span>
                )}
                {it.location && (
                  <span className="opacity-70"> — <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.location`} value={it.location} placeholder="Location" /></span>
                )}
              </div>
              <span
                className="text-[0.82em] tabular-nums"
                style={{
                  color: `${INK}99`,
                  fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
                }}
              >
                {year}
              </span>
            </div>
            <StanfordBullets
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

function StanfordEducation({
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
            className="flex cursor-grab items-baseline justify-between gap-3 rounded-sm"
            style={elementStyle(data, id)}
          >
            <div
              className="text-[0.95em]"
              style={{
                fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
                color: INK,
              }}
            >
              <div className="font-semibold">
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.degree`} value={it.degree} placeholder="Degree" />
                {it.field ? `, ${it.field || "Field of study"}` : ""}
              </div>
              <div style={{ color: CARDINAL }}>
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.institution`} value={it.institution} placeholder="Institution" />
                {it.location && (
                  <span className="opacity-80"> — <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.location`} value={it.location} placeholder="Location" /></span>
                )}
              </div>
            </div>
            <span
              className="text-[0.82em] tabular-nums"
              style={{ color: `${INK}99` }}
            >
              {year}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Two-column dispatch — used by publications and talks. The visual hook is
 *  that wider page real estate dedicated to scrollable lists puts more
 *  publications above the fold without pretending the document is one page. */
function StanfordTwoCol({
  section,
  data,
  kind,
}: {
  section: PublicationsSection | TalksSection;
  data: ResumeData;
  kind: "pub" | "talk";
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
      {items.map((p_raw, i) => {
        // Narrow p to the union shape with optional fields so TS can render
        // them — `in` operator alone leaves the union with unknown leaves.
        const p = p_raw as { id: string; title?: string; date?: string; authors?: string; venue?: string };
        const id = `section.${section.id}.item.${p.id}`;
        return (
          <div
            key={p.id}
            data-element-id={id}
            className="cursor-grab rounded-sm text-[0.88em]"
            style={{
              color: INK,
              fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
              ...elementStyle(data, id),
            }}
          >
            <span style={{ color: CARDINAL, fontWeight: 600 }}>
              {String(i + 1).padStart(2, "0")}.{" "}
            </span>
            <span className="font-semibold">{String(p.title ?? "")}</span>
            {kind === "pub" && "authors" in p && p.authors && (
              <span style={{ color: `${INK}aa` }}> — {String(p.authors)}</span>
            )}
            {kind === "pub" && "venue" in p && p.venue && (
              <span className="italic"> — {String(p.venue)}</span>
            )}
            {kind === "talk" && "venue" in p && p.venue && (
              <span style={{ color: `${INK}aa` }}> — {String(p.venue)}</span>
            )}
            {p.date && (
              <span style={{ color: `${INK}88` }}> ({String(p.date)})</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StanfordCerts({
  section,
  data,
}: {
  section: CertificationsSection;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="grid gap-x-6 gap-y-1 md:grid-cols-2">
      {items.map((c) => {
        const id = `section.${section.id}.item.${c.id}`;
        return (
          <div
            key={c.id}
            data-element-id={id}
            className="cursor-grab rounded-sm text-[0.9em]"
            style={{
              color: INK,
              fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
              ...elementStyle(data, id),
            }}
          >
            <span className="font-semibold"><EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.name`} value={c.name} placeholder="Name" /></span>
            {c.issuer && (
              <span style={{ color: `${INK}99` }}> — <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.issuer`} value={c.issuer} placeholder="Issuer" /></span>
            )}
            {c.date && (
              <span style={{ color: `${INK}88` }}> · <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.date`} value={c.date} placeholder="Date" /></span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StanfordFallback({
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
        className="cursor-text whitespace-pre-wrap text-[0.95em]"
        style={{
          color: INK,
          fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
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
      <div className="flex flex-wrap gap-1.5">
        {visible.map((it) => {
          const id = `section.${section.id}.item.${it.id}`;
          return (
            <span
              key={it.id}
              data-element-id={id}
              className="cursor-grab rounded-md px-2 py-0.5 text-[0.85em]"
              style={{
                background: `${CARDINAL}10`,
                border: `1px solid ${CARDINAL}33`,
                color: INK,
                fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
                ...elementStyle(data, id),
              }}
            >
              {it.name ?? it.text ?? ""}
            </span>
          );
        })}
      </div>
    );
  }
  return null;
}

function StanfordBullets({
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
      className="mt-1 space-y-0.5 pl-1 text-[0.9em] leading-[1.5]"
      style={{
        color: INK,
        fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
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
              style={{ color: CARDINAL, fontWeight: 700 }}
              aria-hidden
            >
              ›
            </span>
            <span className="flex-1 whitespace-pre-wrap">{b.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function formatYearOnly(start: string, end: string, current: boolean): string {
  if (current) {
    const y = extractYear(start);
    return y ? `${y}–Present` : "Present";
  }
  const sy = extractYear(start);
  const ey = extractYear(end);
  if (sy && ey && sy !== ey) return `${sy}–${ey}`;
  return ey || sy || "";
}

function extractYear(raw: string): string {
  const m = /(\d{4})/.exec(raw);
  return m ? m[1] : "";
}
