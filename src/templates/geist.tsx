/**
 * Geist — Vercel-flavored. Frontend dev native.
 *
 * Visual character:
 *   - Geist Sans for body, Geist Mono for dates and metric callouts.
 *   - Off-white #fafafa page (Vercel docs) — softer than pure white,
 *     reads as "modern web app screenshot".
 *   - Tight 1.4 line-height. Engineers like density.
 *   - Right-side metric strip on every experience entry — uses the
 *     `location` field as a free-form signal (e.g. "★ 12k stars" or
 *     "↑ 3.2x revenue") rendered in mono on the right of each role.
 *   - Hairline #00000014 dividers, never filled bars.
 *   - Section titles in tracked-tight Geist Mono, lowercase — reads as
 *     a CLI prompt.
 *
 * Industry-fit: frontend / full-stack engineers, DX advocates, dev
 * tools founders. The CV that says "I deploy on Friday afternoons."
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

export function GeistTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <header
        data-section-id="personal"
        className="mb-8 cursor-pointer pb-4"
        style={{ borderBottom: `1px solid ${design.textColor}14` }}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.4em] leading-[1.0] transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
              style={{
                color: design.textColor,
                fontFamily: "var(--font-geist, 'Geist'), Inter, sans-serif",
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
                className="mt-1 block w-fit cursor-text text-[0.88em] transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
                style={{
                  color: `${design.textColor}88`,
                  fontFamily:
                    "var(--font-geist-mono, 'Geist Mono'), 'JetBrains Mono', monospace",
                  fontWeight: 400,
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
            <GeistContact data={data} />
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
                style={{ outline: `1px solid ${design.textColor}1a` }}
              />
            </div>
          )}
        </div>
      </header>

      <div className="space-y-7">
        {visible.map((s) => {
          const d = resolveDesign(design, s);
          return (
            <GeistSection key={s.id} section={s} design={d} data={data} />
          );
        })}
      </div>
    </TemplateFrame>
  );
}

function GeistContact({ data }: { data: ResumeData }) {
  const { personal, design } = data;
  const items: { id: string; label: string; href?: string; prefix: string }[] = [];
  if (personal.email)
    items.push({ id: "personal.email", label: personal.email, prefix: "$" });
  if (personal.phone)
    items.push({ id: "personal.phone", label: personal.phone, prefix: "#" });
  if (personal.location)
    items.push({ id: "personal.location", label: personal.location, prefix: "@" });
  for (const l of personal.links) {
    items.push({
      id: `personal.links.${l.id}`,
      label: l.label || l.url,
      href: l.url,
      prefix: "→",
    });
  }
  if (items.length === 0) return null;
  const grab =
    "inline-block cursor-text transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2 rounded-sm";
  return (
    <div
      className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.82em]"
      style={{
        color: `${design.textColor}99`,
        fontFamily:
          "var(--font-geist-mono, 'Geist Mono'), 'JetBrains Mono', monospace",
      }}
    >
      {items.map((it) => (
        <span key={it.id}>
          <span
            className="select-none"
            style={{ color: `${design.textColor}55` }}
          >
            {it.prefix}{" "}
          </span>
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

function GeistSection({
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
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-neutral-900/[0.03] hover:ring-2 hover:ring-neutral-900/10"
    >
      <h2
        data-element-id={titleId}
        className="mb-3 inline-block cursor-text text-[0.78em] lowercase transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
        style={{
          color: design.textColor,
          fontFamily:
            "var(--font-geist-mono, 'Geist Mono'), 'JetBrains Mono', monospace",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          ...elementStyle(data, titleId),
        }}
      >
        <span style={{ color: `${design.textColor}55` }}>{"// "}</span>
        {section.title.toLowerCase()}
      </h2>
      <GeistBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function GeistBody({
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
          className="cursor-text whitespace-pre-wrap text-[0.95em] leading-[1.5] transition-shadow hover:ring-2 hover:ring-neutral-900/15"
          style={{
            color: design.textColor,
            fontFamily: "var(--font-geist, 'Geist'), Inter, sans-serif",
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Add a short summary."}
        </p>
      );
    }
    case "experience":
      return <GeistExperience section={section} design={design} data={data} />;
    case "projects":
      return <GeistProjects section={section} design={design} data={data} />;
    case "education":
      return <GeistEducation section={section} design={design} data={data} />;
    case "skills":
      return <GeistSkills section={section} design={design} data={data} />;
    case "certifications":
      return <GeistCerts section={section} design={design} data={data} />;
    default:
      return <GeistFallback section={section} design={design} data={data} />;
  }
}

function GeistExperience({
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
            <div className="grid grid-cols-[1fr_auto] items-baseline gap-3">
              <h3
                className="text-[1em]"
                style={{
                  color: design.textColor,
                  fontFamily: "var(--font-geist, 'Geist'), Inter, sans-serif",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                {it.role}
                {it.company && (
                  <span
                    style={{
                      color: design.accentColor,
                      fontWeight: 500,
                    }}
                  >
                    {" @ "}
                    {it.company}
                  </span>
                )}
              </h3>
              <span
                className="text-[0.78em]"
                style={{
                  color: `${design.textColor}77`,
                  fontFamily:
                    "var(--font-geist-mono, 'Geist Mono'), 'JetBrains Mono', monospace",
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
            {/* Metrics column — uses the location field as a free-form signal.
                Renders as a mono pill if it looks like a metric (contains a
                digit or one of the metric prefix glyphs). Otherwise, falls
                back to a normal location display. */}
            {it.location && <GeistMetric text={it.location} design={design} />}
            <GeistBullets
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

function GeistMetric({ text, design }: { text: string; design: GlobalDesign }) {
  // Treat anything that looks numeric / metric-y as a metric pill.
  const looksMetric = /[0-9★↑↓→×%$]/.test(text);
  return (
    <div
      className="mt-0.5 text-[0.82em]"
      style={{
        color: looksMetric ? design.accentColor : `${design.textColor}88`,
        fontFamily: looksMetric
          ? "var(--font-geist-mono, 'Geist Mono'), 'JetBrains Mono', monospace"
          : "var(--font-geist, 'Geist'), Inter, sans-serif",
      }}
    >
      {text}
    </div>
  );
}

function GeistProjects({
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
            <div className="grid grid-cols-[1fr_auto] items-baseline gap-3">
              <h3
                className="text-[1em]"
                style={{
                  color: design.textColor,
                  fontFamily: "var(--font-geist, 'Geist'), Inter, sans-serif",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                {it.url ? (
                  <a
                    href={it.url.startsWith("http") ? it.url : `https://${it.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline"
                    style={{ color: design.accentColor }}
                  >
                    {it.name}
                  </a>
                ) : (
                  it.name
                )}
                {it.role && (
                  <span style={{ color: `${design.textColor}88`, fontWeight: 400 }}>
                    {" · "}
                    {it.role}
                  </span>
                )}
              </h3>
              {(it.startDate || it.endDate || it.current) && (
                <span
                  className="text-[0.78em]"
                  style={{
                    color: `${design.textColor}77`,
                    fontFamily:
                      "var(--font-geist-mono, 'Geist Mono'), 'JetBrains Mono', monospace",
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
                    "var(--font-geist-mono, 'Geist Mono'), 'JetBrains Mono', monospace",
                }}
              >
                {it.techStack
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((t, i, arr) => (
                    <span key={i}>
                      {t}
                      {i < arr.length - 1 && (
                        <span style={{ color: `${design.textColor}33` }}>
                          {" / "}
                        </span>
                      )}
                    </span>
                  ))}
              </div>
            )}
            <GeistBullets
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

function GeistEducation({
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
            className="grid cursor-grab grid-cols-[1fr_auto] items-baseline gap-3 rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <div>
              <span
                className="text-[0.95em]"
                style={{
                  color: design.textColor,
                  fontWeight: 600,
                  fontFamily: "var(--font-geist, 'Geist'), Inter, sans-serif",
                }}
              >
                {it.degree}
                {it.field ? ` · ${it.field}` : ""}
              </span>
              <span
                className="ml-2 text-[0.85em]"
                style={{ color: `${design.textColor}99` }}
              >
                {it.institution}
              </span>
            </div>
            <span
              className="text-[0.78em]"
              style={{
                color: `${design.textColor}77`,
                fontFamily:
                  "var(--font-geist-mono, 'Geist Mono'), 'JetBrains Mono', monospace",
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

function GeistSkills({
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
              className="mb-1 text-[0.78em] lowercase"
              style={{
                color: `${design.textColor}66`,
                fontFamily:
                  "var(--font-geist-mono, 'Geist Mono'), 'JetBrains Mono', monospace",
              }}
            >
              {group.toLowerCase()}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {list.map((s) => {
              const id = `section.${section.id}.item.${s.id}`;
              return (
                <span
                  key={s.id}
                  data-element-id={id}
                  className="cursor-grab rounded-md px-2 py-0.5 text-[0.82em] transition-shadow hover:ring-2 hover:ring-neutral-900/20"
                  style={{
                    background: `${design.textColor}06`,
                    border: `1px solid ${design.textColor}14`,
                    color: design.textColor,
                    fontFamily:
                      "var(--font-geist-mono, 'Geist Mono'), 'JetBrains Mono', monospace",
                    ...elementStyle(data, id),
                  }}
                >
                  {s.name}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function GeistCerts({
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
            className="grid cursor-grab grid-cols-[1fr_auto] items-baseline gap-3 rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <span>
              <span style={{ fontWeight: 600 }}>{c.name}</span>
              {c.issuer && (
                <span style={{ color: `${design.textColor}88` }}>
                  {" · "}
                  {c.issuer}
                </span>
              )}
            </span>
            {c.date && (
              <span
                className="text-[0.82em]"
                style={{
                  color: `${design.textColor}77`,
                  fontFamily:
                    "var(--font-geist-mono, 'Geist Mono'), 'JetBrains Mono', monospace",
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

function GeistFallback({
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
        <GeistBullets
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

function GeistBullets({
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
                style={{ color: design.accentColor }}
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
