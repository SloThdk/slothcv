/**
 * Linear — editorial dark cream. Engineering polish.
 *
 * Visual character:
 *   - Dark cream #f8f7f4 background — the off-white of an art-school
 *     sketchbook. Warmer than Notion's tint, cooler than newspaper.
 *   - Inter for body, JetBrains Mono for dates and Linear-style "issue
 *     badge" labels on each role (e.g. ENG-148 / DES-92).
 *   - Indigo #5e6ad2 (Linear's actual brand color) on links + thin
 *     2px section-title underlines.
 *   - Each experience role gets a small "issue badge" prefix
 *     auto-generated from the company initials + role index — reads as
 *     "this person ships tickets" without being literal.
 *   - Compact 1.45 line-height. Engineers want signal density.
 *
 * Industry-fit: mid-to-senior engineers at design-respecting product
 * companies (Linear obviously, but also Vercel, Stripe, Replit,
 * Anthropic). The CV that says "I closed 30 issues last sprint."
 */

"use client";

import { TemplateFrame } from "./frame";
import { SectionActions } from "./section-actions";
import {
  bulletGlyph,
  elementStyle,
  formatDateRange,
  positionStyle,
  resolveDesign,
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
  ProjectsSection,
  ResumeData,
  Section,
  SkillsSection,
} from "@/types/resume";
import { EditableFallback, EditableSectionTitle } from "./components";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

// Linear's exact brand indigo — used on links and section-title underline.
// Hardcoded because the indigo hue IS the Linear identity; users who want
// a different theme switch templates rather than recolor this.
const INDIGO = "#5e6ad2";

// Dark cream — softer than #fff, warmer than a generic off-white. Hardcoded
// because flipping to pure white would erase the editorial mood.
const CREAM = "#f8f7f4";

export function LinearTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  // Override pageBg → cream. Defensive: the user can still set their own
  // pageBg through the Design tab; we only retint pure white.
  const tinted: ResumeData = {
    ...data,
    design: {
      ...design,
      pageBg:
        design.pageBg === "#FFFFFF" || design.pageBg === "#ffffff"
          ? CREAM
          : design.pageBg,
    },
  };

  return (
    <TemplateFrame data={tinted} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <header
        data-section-id="personal"
        className="mb-9 cursor-pointer pb-5"
        style={{ borderBottom: `1px solid ${design.textColor}1a` }}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.5em] leading-[1.05]"
              style={{
                color: design.textColor,
                fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                ...elementStyle(data, "personal.name"),
              }}
            >
              {personal.fullName || "Your name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-1 block w-fit cursor-text text-[0.95em]"
                style={{
                  color: `${design.textColor}99`,
                  fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
                  fontWeight: 400,
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
            <LinearContact data={data} />
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
                className="h-20 w-20 rounded-md object-cover"
                // box-shadow + design.photo.borderColor override (Design → Photo → Border)
                style={{ boxShadow: `0 0 0 1px ${design.photo.borderColor || (design.textColor + "1a")}` }}
              />
            </div>
          )}
        </div>
      </header>

      <div className="space-y-7">
        {visible.map((s) => {
          const d = resolveDesign(design, s);
          return (
            <LinearSection key={s.id} section={s} design={d} data={data} />
          );
        })}
      </div>
    </TemplateFrame>
  );
}

function LinearContact({ data }: { data: ResumeData }) {
  const { personal, design } = data;
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
    <div
      className="mt-3 text-[0.85em]"
      style={{ color: `${design.textColor}99` }}
    >
      {items.map((it, i) => (
        <span key={it.id}>
          {i > 0 && (
            <span className="mx-2" style={{ color: `${design.textColor}33` }}>
              ·
            </span>
          )}
          {it.href ? (
            <a
              data-element-id={it.id}
              href={it.href.startsWith("http") ? it.href : `https://${it.href}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${grab} underline-offset-2 hover:underline`}
              style={{ color: INDIGO, ...elementStyle(data, it.id) }}
            >
              {it.label}
            </a>
          ) : (
            <span
              data-element-id={it.id}
              className={grab}
              style={elementStyle(data, it.id)}
            >
              {it.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function LinearSection({
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
      <h2
        data-element-id={titleId}
        className="mb-3 inline-block cursor-text pb-0.5 text-[0.85em] uppercase"
        style={{
          color: design.textColor,
          fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
          fontWeight: 600,
          letterSpacing: "0.12em",
          borderBottom: `2px solid ${INDIGO}`,
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <LinearBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function LinearBody({
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
          className="cursor-text whitespace-pre-wrap text-[0.95em] leading-[1.5]"
          style={{
            color: design.textColor,
            fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Add a short summary."}
        </p>
      );
    }
    case "careerBreak":
    case "experience":
      return <LinearExperience section={section} design={design} data={data} />;
    case "projects":
      return <LinearProjects section={section} design={design} data={data} />;
    case "education":
      return <LinearEducation section={section} design={design} data={data} />;
    case "skills":
      return <LinearSkills section={section} design={design} data={data} />;
    case "certifications":
      return <LinearCerts section={section} design={design} data={data} />;
    default:
      return <LinearFallback section={section} design={design} data={data} />;
  }
}

/** Generate a Linear-style issue badge from the company name + index.
 *  e.g. "Acme Corp" + idx 1 → "ACM-001". Falls back to "ROLE-N" when
 *  there's no company. Pure presentation — not editable, just decorative. */
function issueBadge(company: string, idx: number): string {
  const base = (company || "ROLE")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, 3) || "ROL";
  return `${base}-${String(idx + 1).padStart(3, "0")}`;
}

function LinearExperience({
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
    <div className="space-y-4">
      {items.map((it, idx) => {
        const id = `section.${section.id}.item.${it.id}`;
        return (
          <article
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm"
            style={elementStyle(data, id)}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span
                  className="rounded px-1.5 py-0.5 text-[0.7em]"
                  style={{
                    background: `${INDIGO}1a`,
                    color: INDIGO,
                    fontFamily:
                      "var(--font-jetbrains-mono, 'JetBrains Mono'), monospace",
                    fontWeight: 500,
                    letterSpacing: "0.03em",
                  }}
                >
                  {issueBadge(it.company, idx)}
                </span>
                <h3
                  className="text-[1em]"
                  style={{
                    color: design.textColor,
                    fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
                    fontWeight: 600,
                  }}
                >
                  <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                  {it.company && (
                    <span
                      style={{
                        color: `${design.textColor}99`,
                        fontWeight: 400,
                      }}
                    >
                      {" · "}
                      <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.company`} value={it.company} placeholder="Company" />
                    </span>
                  )}
                </h3>
              </div>
              <span
                className="text-[0.78em]"
                style={{
                  color: `${design.textColor}88`,
                  fontFamily:
                    "var(--font-jetbrains-mono, 'JetBrains Mono'), monospace",
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
                style={{ color: `${design.textColor}77` }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.location`} value={it.location} placeholder="Location" />
              </div>
            )}
            <LinearBullets
              bullets={it.bullets}
              design={design}
              data={data}
              sectionId={section.id}
            />
          </article>
        );
      })}
    </div>
  );
}

function LinearProjects({
  section,
  design,
  data,
}: {
  section: ProjectsSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-4">
      {items.map((it, idx) => {
        const id = `section.${section.id}.item.${it.id}`;
        return (
          <article
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm"
            style={elementStyle(data, id)}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span
                  className="rounded px-1.5 py-0.5 text-[0.7em]"
                  style={{
                    background: `${INDIGO}1a`,
                    color: INDIGO,
                    fontFamily:
                      "var(--font-jetbrains-mono, 'JetBrains Mono'), monospace",
                    fontWeight: 500,
                  }}
                >
                  {issueBadge(it.name, idx)}
                </span>
                <h3
                  className="text-[1em]"
                  style={{
                    color: design.textColor,
                    fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
                    fontWeight: 600,
                  }}
                >
                  {it.url ? (
                    <a
                      href={
                        it.url.startsWith("http") ? it.url : `https://${it.url}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline-offset-2 hover:underline"
                      style={{ color: INDIGO }}
                    >
                      <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.name`} value={it.name} placeholder="Name" />
                    </a>
                  ) : (
                    it.name
                  )}
                  {it.role && (
                    <span
                      style={{
                        color: `${design.textColor}99`,
                        fontWeight: 400,
                      }}
                    >
                      {" · "}
                      <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                    </span>
                  )}
                </h3>
              </div>
              {(it.startDate || it.endDate || it.current) && (
                <span
                  className="text-[0.78em]"
                  style={{
                    color: `${design.textColor}88`,
                    fontFamily:
                      "var(--font-jetbrains-mono, 'JetBrains Mono'), monospace",
                  }}
                >
                  {formatDateRange(
                    it.startDate,
                    it.endDate,
                    it.current,
                    design.dateFormat,
                  )}
                </span>
              )}
            </div>
            {it.techStack && (
              <div
                className="text-[0.82em]"
                style={{
                  color: `${design.textColor}88`,
                  fontFamily:
                    "var(--font-jetbrains-mono, 'JetBrains Mono'), monospace",
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.techStack`} value={it.techStack} placeholder="Tech stack" />
              </div>
            )}
            <LinearBullets
              bullets={it.bullets}
              design={design}
              data={data}
              sectionId={section.id}
            />
          </article>
        );
      })}
    </div>
  );
}

function LinearEducation({
  section,
  design,
  data,
}: {
  section: EducationSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        return (
          <article
            key={it.id}
            data-element-id={id}
            className="grid cursor-grab grid-cols-[1fr_auto] items-baseline gap-3 rounded-sm"
            style={elementStyle(data, id)}
          >
            <div>
              <span
                className="text-[0.95em]"
                style={{
                  color: design.textColor,
                  fontWeight: 600,
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.degree`} value={it.degree} placeholder="Degree" />
                {it.field ? ` · ${it.field || "Field of study"}` : ""}
              </span>
              <span
                className="ml-2 text-[0.85em]"
                style={{ color: `${design.textColor}99` }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.institution`} value={it.institution} placeholder="Institution" />
              </span>
            </div>
            <span
              className="text-[0.78em]"
              style={{
                color: `${design.textColor}88`,
                fontFamily:
                  "var(--font-jetbrains-mono, 'JetBrains Mono'), monospace",
              }}
            >
              {formatDateRange(
                it.startDate,
                it.endDate,
                it.current,
                design.dateFormat,
              )}
            </span>
          </article>
        );
      })}
    </div>
  );
}

function LinearSkills({
  section,
  design,
  data,
}: {
  section: SkillsSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  if (items.length === 0) return null;
  const groups = new Map<string, typeof items>();
  for (const s of items) {
    const key = s.group || "Skills";
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }
  return (
    <div className="space-y-2">
      {[...groups.entries()].map(([group, list]) => (
        <div key={group}>
          {groups.size > 1 && (
            <div
              className="mb-1 text-[0.78em] uppercase"
              style={{
                color: `${design.textColor}66`,
                fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
                fontWeight: 600,
                letterSpacing: "0.1em",
              }}
            >
              {group}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {list.map((s) => {
              const id = `section.${section.id}.item.${s.id}`;
              return (
                <span
                  key={s.id}
                  data-element-id={id}
                  className="cursor-grab rounded px-2 py-0.5 text-[0.82em]"
                  style={{
                    background: `${INDIGO}10`,
                    border: `1px solid ${INDIGO}33`,
                    color: design.textColor,
                    ...elementStyle(data, id),
                  }}
                >
                  <EditableFallback data={data} fieldId={`section.${section.id}.item.${s.id}.name`} value={s.name} placeholder="Name" />
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function LinearCerts({
  section,
  design,
  data,
}: {
  section: CertificationsSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-1.5 text-[0.9em]" style={{ color: design.textColor }}>
      {items.map((c) => {
        const id = `section.${section.id}.item.${c.id}`;
        return (
          <div
            key={c.id}
            data-element-id={id}
            className="grid cursor-grab grid-cols-[1fr_auto] items-baseline gap-3 rounded-sm"
            style={elementStyle(data, id)}
          >
            <span>
              <span style={{ fontWeight: 600 }}><EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.name`} value={c.name} placeholder="Name" /></span>
              {c.issuer && (
                <span style={{ color: `${design.textColor}88` }}>
                  {" · "}
                  <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.issuer`} value={c.issuer} placeholder="Issuer" />
                </span>
              )}
            </span>
            {c.date && (
              <span
                className="text-[0.82em]"
                style={{
                  color: `${design.textColor}77`,
                  fontFamily:
                    "var(--font-jetbrains-mono, 'JetBrains Mono'), monospace",
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.date`} value={c.date} placeholder="Date" />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LinearFallback({
  section,
  design,
  data,
}: {
  section: Section;
  design: GlobalDesign;
  data: ResumeData;
}) {
  if ("body" in section && (section as { body?: string }).body) {
    const id = `section.${section.id}.body`;
    return (
      <p
        data-element-id={id}
        className="cursor-text whitespace-pre-wrap text-[0.92em]"
        style={{ color: design.textColor, ...elementStyle(data, id) }}
      >
        {(section as { body: string }).body}
      </p>
    );
  }
  if ("items" in section) {
    const its = (section as { items: Bullet[] | unknown[] }).items as unknown[];
    if (
      its.length > 0 &&
      typeof its[0] === "object" &&
      its[0] !== null &&
      "text" in (its[0] as object)
    ) {
      return (
        <LinearBullets
          bullets={its as Bullet[]}
          design={design}
          data={data}
          sectionId={section.id}
        />
      );
    }
  }
  return null;
}

function LinearBullets({
  bullets,
  design,
  data,
  sectionId,
}: {
  bullets: Bullet[];
  design: GlobalDesign;
  data: ResumeData;
  sectionId: string;
}) {
  const list = visibleBullets(bullets);
  if (list.length === 0) return null;
  const glyph = bulletGlyph(design);
  return (
    <ul
      className="mt-1.5 space-y-1 text-[0.92em]"
      style={{ color: design.textColor }}
    >
      {list.map((b) => {
        const id = `section.${sectionId}.bullet.${b.id}`;
        return (
          <li
            key={b.id}
            data-element-id={id}
            className="flex cursor-grab gap-2 rounded-sm"
            style={elementStyle(data, id)}
          >
            {glyph && (
              <span
                className="select-none"
                style={{ color: INDIGO }}
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
