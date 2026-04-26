/**
 * Helvetica — pure Swiss minimalism. Typography is the design.
 *
 * Visual character:
 *   - Inter (the closest free Helvetica analogue) throughout the body.
 *   - 0.5px hairline rules instead of any heavy borders. Section heads
 *     wear their underline like a Müller-Brockmann grid, not a button.
 *   - Ragged-right body — left-aligned with no justification (justified
 *     copy is for newspapers, not CVs).
 *   - JetBrains Mono dates and numbers — the only typographic departure.
 *     Reads as "I respect engineers" without screaming about it.
 *   - Strict monochrome. Section titles, body, dates all derive from
 *     `design.textColor`. Accent color is intentionally NOT used in the
 *     layout — restraint is the design.
 *   - 12-column feel achieved via a 1fr/auto two-column header line per
 *     experience entry (role left, dates right) — same trick as Vignelli's
 *     NYC subway timetables.
 *
 * Industry-fit: senior product designers, UX leads, IC engineers at
 * design-respecting companies (Linear, Stripe, Vercel, Figma). The kind
 * of CV that wins because it doesn't try.
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
  ExperienceSection,
  GlobalDesign,
  LanguagesSection,
  ProjectsSection,
  ResumeData,
  Section,
  SkillsSection,
} from "@/types/resume";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function HelveticaTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Header — name + headline + contact. No photo block by default;
          users who need it can flip on design.photo.enabled. */}
      <header
        data-section-id="personal"
        className="mb-10 cursor-pointer pb-5"
        style={{ borderBottom: `0.5px solid ${design.textColor}33` }}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.6em] leading-[1.0] tracking-tight transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
              style={{
                color: design.textColor,
                fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                ...elementStyle(data, "personal.name"),
              }}
            >
              {personal.fullName || "Your name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-1.5 block w-fit cursor-text text-[0.95em] transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
                style={{
                  color: `${design.textColor}99`,
                  fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                  fontWeight: 400,
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
            <HelveticaContact data={data} />
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
                className="h-20 w-20 rounded-sm object-cover"
                style={{ outline: `0.5px solid ${design.textColor}33` }}
              />
            </div>
          )}
        </div>
      </header>

      {/* Body — single column, hairline section rules, strict monochrome. */}
      <div className="space-y-8">
        {visible.map((s) => {
          const d = resolveDesign(design, s);
          return (
            <HelveticaSection
              key={s.id}
              section={s}
              design={d}
              data={data}
            />
          );
        })}
      </div>
    </TemplateFrame>
  );
}

/** Pipe-separated contact line — Swiss tradition is dense, not stacked. */
function HelveticaContact({ data }: { data: ResumeData }) {
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
    "inline-block cursor-text transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2 rounded-sm";
  return (
    <div
      className="mt-3 text-[0.85em]"
      style={{
        color: `${design.textColor}88`,
        fontFamily: "var(--font-inter, 'Inter'), sans-serif",
      }}
    >
      {items.map((it, i) => (
        <span key={it.id}>
          {i > 0 && (
            <span
              className="mx-2 select-none"
              style={{ color: `${design.textColor}44` }}
            >
              /
            </span>
          )}
          {it.href ? (
            <a
              data-element-id={it.id}
              href={it.href.startsWith("http") ? it.href : `https://${it.href}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${grab} underline-offset-2 hover:underline`}
              style={{ color: design.textColor, ...elementStyle(data, it.id) }}
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

function HelveticaSection({
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
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-neutral-100/40 hover:ring-2 hover:ring-neutral-900/10"
    >
      {/* Section title sits above its 0.5px rule — flush left, no decoration. */}
      <h2
        data-element-id={titleId}
        className="mb-1.5 inline-block cursor-text text-[0.78em] uppercase transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
        style={{
          color: design.textColor,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          fontWeight: 700,
          letterSpacing: "0.16em",
          ...elementStyle(data, titleId),
        }}
      >
        {section.title}
      </h2>
      <div
        className="mb-3 w-full"
        style={{
          height: "0.5px",
          background: `${design.textColor}33`,
        }}
      />
      <HelveticaBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function HelveticaBody({
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
          className="cursor-text whitespace-pre-wrap text-left text-[0.95em] leading-[1.55] transition-shadow hover:ring-2 hover:ring-neutral-900/15"
          style={{
            color: design.textColor,
            fontFamily: "var(--font-inter, 'Inter'), sans-serif",
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Add a short summary."}
        </p>
      );
    }
    case "experience":
      return (
        <HelveticaExperience section={section} design={design} data={data} />
      );
    case "projects":
      return (
        <HelveticaProjects section={section} design={design} data={data} />
      );
    case "education":
      return (
        <HelveticaEducation section={section} design={design} data={data} />
      );
    case "skills":
      return <HelveticaSkills section={section} design={design} data={data} />;
    case "languages":
      return (
        <HelveticaLanguages section={section} design={design} data={data} />
      );
    case "certifications":
      return (
        <HelveticaCerts section={section} design={design} data={data} />
      );
    default:
      return <HelveticaFallback section={section} design={design} data={data} />;
  }
}

function HelveticaExperience({
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
    <div className="space-y-4">
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        return (
          <article
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3
                className="text-[1em]"
                style={{
                  color: design.textColor,
                  fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                  fontWeight: 600,
                }}
              >
                {it.role}
                {it.company && (
                  <span
                    style={{
                      color: `${design.textColor}99`,
                      fontWeight: 400,
                    }}
                  >
                    {" — "}
                    {it.company}
                  </span>
                )}
              </h3>
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
                {it.location}
              </div>
            )}
            <HelveticaBullets
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

function HelveticaProjects({
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
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        return (
          <article
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3
                className="text-[1em]"
                style={{
                  color: design.textColor,
                  fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                  fontWeight: 600,
                }}
              >
                {it.url ? (
                  <a
                    href={it.url.startsWith("http") ? it.url : `https://${it.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline"
                    style={{ color: design.textColor }}
                  >
                    {it.name}
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
                    {" — "}
                    {it.role}
                  </span>
                )}
              </h3>
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
                {it.techStack}
              </div>
            )}
            <HelveticaBullets
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

function HelveticaEducation({
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
    <div className="space-y-3">
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        return (
          <article
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3
                className="text-[0.95em]"
                style={{
                  color: design.textColor,
                  fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                  fontWeight: 600,
                }}
              >
                {it.degree}
                {it.field ? ` — ${it.field}` : ""}
              </h3>
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
            <div
              className="text-[0.85em]"
              style={{ color: `${design.textColor}99` }}
            >
              {it.institution}
              {it.location ? ` · ${it.location}` : ""}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function HelveticaSkills({
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
  // Group by category, render as "label: comma-separated names" — Swiss
  // tables, not chip clusters.
  const groups = new Map<string, typeof items>();
  for (const s of items) {
    const key = s.group || "Skills";
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }
  return (
    <div className="space-y-1.5 text-[0.9em]" style={{ color: design.textColor }}>
      {[...groups.entries()].map(([group, list]) => (
        <div key={group} className="flex gap-3">
          <span
            className="w-32 shrink-0 text-[0.85em]"
            style={{
              color: `${design.textColor}88`,
              fontFamily:
                "var(--font-jetbrains-mono, 'JetBrains Mono'), monospace",
            }}
          >
            {group.toLowerCase()}
          </span>
          <span className="flex-1">
            {list.map((s, i) => {
              const id = `section.${section.id}.item.${s.id}`;
              return (
                <span key={s.id}>
                  {i > 0 && (
                    <span style={{ color: `${design.textColor}44` }}>, </span>
                  )}
                  <span
                    data-element-id={id}
                    className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
                    style={elementStyle(data, id)}
                  >
                    {s.name}
                  </span>
                </span>
              );
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

function HelveticaLanguages({
  section,
  design,
  data,
}: {
  section: LanguagesSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-1 text-[0.9em]" style={{ color: design.textColor }}>
      {items.map((l) => {
        const id = `section.${section.id}.item.${l.id}`;
        return (
          <div
            key={l.id}
            data-element-id={id}
            className="flex cursor-grab items-baseline justify-between rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <span>{l.name}</span>
            <span
              className="text-[0.85em]"
              style={{
                color: `${design.textColor}88`,
                fontFamily:
                  "var(--font-jetbrains-mono, 'JetBrains Mono'), monospace",
              }}
            >
              {l.proficiency}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HelveticaCerts({
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
            className="flex cursor-grab items-baseline justify-between gap-3 rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <span>
              <span style={{ fontWeight: 600 }}>{c.name}</span>
              {c.issuer && (
                <span style={{ color: `${design.textColor}99` }}>
                  {" — "}
                  {c.issuer}
                </span>
              )}
            </span>
            {c.date && (
              <span
                className="text-[0.85em]"
                style={{
                  color: `${design.textColor}88`,
                  fontFamily:
                    "var(--font-jetbrains-mono, 'JetBrains Mono'), monospace",
                }}
              >
                {c.date}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HelveticaFallback({
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
        className="cursor-text whitespace-pre-wrap text-[0.92em] transition-shadow hover:ring-2 hover:ring-neutral-900/15"
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
        <HelveticaBullets
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

function HelveticaBullets({
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
            className="flex cursor-grab gap-2 rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            {glyph && (
              <span
                className="select-none"
                style={{ color: `${design.textColor}66` }}
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
