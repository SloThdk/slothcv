/**
 * Eclipse — dark editorial sibling to Aurora. Where Aurora reads as
 * "tech + Scandinavian + mint", Eclipse reads as "editorial + warm +
 * paper-white-on-near-black-with-amber-accent". Same dark-mode body
 * skeleton, very different mood.
 *
 * Visual character:
 *   - Pure single column (no sidebar) — focus on the writing
 *   - Big italic Fraunces display name in warm amber
 *   - Paper-white body text on near-black background — softer than
 *     pure white-on-black, reads less digital
 *   - Section heads small-caps with hairline amber rule
 *   - Date metadata in JetBrains Mono so the typographic mix lands
 *     editorial-meets-engineer (a senior IC vibe)
 *   - No watermark by default — restraint is the design
 */

"use client";

import { TemplateFrame } from "./frame";
import { ContactLine } from "./scratch";
import {
  bulletGlyph,
  elementStyle,
  formatDateRange,
  positionStyle,
  visibleBullets,
  visibleSections,
} from "./shared";
import { SectionActions } from "./section-actions";
import type {
  Bullet,
  ExperienceSection,
  GlobalDesign,
  ProjectsSection,
  ResumeData,
  Section,
} from "@/types/resume";
import { EditableFallback, EditableSectionTitle } from "./components";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function EclipseTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Header — italic display serif name, contact under */}
      <header
        data-section-id="personal"
        className="relative mb-7 cursor-pointer pb-5"
        style={{ borderBottom: `1px solid ${design.accentColor}33` }}
      >
        <h1
          data-element-id="personal.name"
          className="block w-fit cursor-text text-[3.4em] leading-[1.05] tracking-tight transition-shadow hover:ring-2 hover:ring-white/30 hover:ring-offset-2 hover:ring-offset-transparent"
          style={{
            color: design.accentColor,
            fontFamily:
              "var(--font-fraunces, 'Fraunces'), 'Source Serif 4', serif",
            fontWeight: 500,
            fontStyle: "italic",
            ...elementStyle(data, "personal.name"),
          }}
        >
          {personal.fullName || "Your Name"}
        </h1>
        {personal.headline && (
          <p
            data-element-id="personal.headline"
            className="mt-2 block w-fit cursor-text text-[0.9em] uppercase tracking-[0.16em] transition-shadow hover:ring-2 hover:ring-white/30 hover:ring-offset-2 hover:ring-offset-transparent"
            style={{
              color: `${design.textColor}cc`,
              fontFamily:
                "var(--font-albert-sans, 'Albert Sans'), Inter, sans-serif",
              fontWeight: 500,
              ...elementStyle(data, "personal.headline"),
            }}
          >
            {personal.headline}
          </p>
        )}
        <div className="mt-3">
          <ContactLine data={data} />
        </div>
      </header>

      {/* Body — single column, generous gap */}
      <div className="space-y-7">
        {visible.map((s) => (
          <EclipseSection key={s.id} section={s} design={design} data={data} />
        ))}
      </div>
    </TemplateFrame>
  );
}

function EclipseSection({
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
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-white/[0.04] hover:ring-2 hover:ring-white/15"
    >
      <div className="mb-3 flex items-baseline gap-3">
        <h2
          data-element-id={titleId}
          className="inline-block cursor-text text-[0.78em] uppercase tracking-[0.18em] transition-shadow hover:ring-2 hover:ring-white/30 hover:ring-offset-2 hover:ring-offset-transparent"
          style={{
            color: design.accentColor,
            fontFamily:
              "var(--font-fraunces, 'Fraunces'), 'Source Serif 4', serif",
            fontWeight: 500,
            ...elementStyle(data, titleId),
          }}
        >
          <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
        </h2>
        <span
          className="h-px flex-1"
          style={{ background: `${design.accentColor}26` }}
        />
      </div>
      <EclipseBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function EclipseBody({
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
          className="cursor-text whitespace-pre-wrap text-[0.95em] leading-[1.6] transition-shadow hover:ring-2 hover:ring-white/15 hover:ring-offset-2 hover:ring-offset-transparent"
          style={{
            color: design.textColor,
            fontFamily:
              "var(--font-albert-sans, 'Albert Sans'), Inter, sans-serif",
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Add a short summary."}
        </p>
      );
    }
    case "experience":
      return <EclipseExperience section={section} design={design} data={data} />;
    case "projects":
      return <EclipseProjects section={section} design={design} data={data} />;
    case "skills": {
      const items = section.items.filter((i) => i.visible);
      return (
        <div className="flex flex-wrap gap-1.5">
          {items.map((s) => {
            const id = `section.${section.id}.item.${s.id}`;
            return (
              <span
                key={s.id}
                data-element-id={id}
                className="cursor-grab rounded-full px-2.5 py-0.5 text-[0.82em] transition-shadow hover:ring-2 hover:ring-white/30"
                style={{
                  background: `${design.accentColor}14`,
                  border: `1px solid ${design.accentColor}40`,
                  color: design.textColor,
                  ...elementStyle(data, id),
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${s.id}.name`} value={s.name} placeholder="Name" />
              </span>
            );
          })}
        </div>
      );
    }
    default:
      return <EclipseFallback section={section} design={design} data={data} />;
  }
}

function EclipseExperience({
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
    <div className="space-y-5">
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        return (
          <article
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-white/20"
            style={elementStyle(data, id)}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3
                className="text-[1em]"
                style={{
                  color: design.textColor,
                  fontFamily:
                    "var(--font-fraunces, 'Fraunces'), serif",
                  fontWeight: 500,
                  fontStyle: "italic",
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                {it.company ? (
                  <span style={{ color: `${design.textColor}cc` }}>
                    {" — "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.company`} value={it.company} placeholder="Company" />
                  </span>
                ) : null}
              </h3>
              <span
                className="text-[0.78em]"
                style={{
                  color: `${design.textColor}99`,
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
                style={{ color: `${design.textColor}88` }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.location`} value={it.location} placeholder="Location" />
              </div>
            )}
            <EclipseBullets
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

function EclipseProjects({
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
            className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-white/20"
            style={elementStyle(data, id)}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3
                className="text-[1em]"
                style={{
                  color: design.textColor,
                  fontFamily:
                    "var(--font-fraunces, 'Fraunces'), serif",
                  fontWeight: 500,
                }}
              >
                {it.url ? (
                  <a
                    href={it.url.startsWith("http") ? it.url : `https://${it.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: design.accentColor }}
                    className="underline-offset-2 hover:underline"
                  >
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.name`} value={it.name} placeholder="Name" />
                  </a>
                ) : (
                  it.name
                )}
                {it.role ? ` · ${it.role || "Role"}` : ""}
              </h3>
              <span
                className="text-[0.78em]"
                style={{
                  color: `${design.textColor}99`,
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
            {it.techStack && (
              <div
                className="text-[0.82em]"
                style={{ color: `${design.textColor}88` }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.techStack`} value={it.techStack} placeholder="Tech stack" />
              </div>
            )}
            <EclipseBullets
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

function EclipseFallback({
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
        className="cursor-text whitespace-pre-wrap text-[0.92em] transition-shadow hover:ring-2 hover:ring-white/20"
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
        <EclipseBullets
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

function EclipseBullets({
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
    <ul className="mt-1.5 space-y-1 text-[0.92em]">
      {list.map((b) => {
        const id = `section.${sectionId}.bullet.${b.id}`;
        return (
          <li
            key={b.id}
            data-element-id={id}
            className="flex cursor-grab gap-2 rounded-sm transition-shadow hover:ring-2 hover:ring-white/15"
            style={{ color: design.textColor, ...elementStyle(data, id) }}
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
