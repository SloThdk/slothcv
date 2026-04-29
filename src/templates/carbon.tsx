/**
 * Carbon — IBM Plex Mono everywhere. Targets the IBM Carbon Design System aesthetic directly.
 *
 * Visual character:
 *   - Hardcoded #161616 page (IBM's Carbon Design System "gray-100" — the
 *     official IBM dark surface). Pale blue #0f62fe accent (IBM's Carbon
 *     blue-60 — the iconic IBM blue).
 *   - IBM Plex Mono for ALL text (yes, even body prose and headings).
 *     Reads like a terminal session that someone's putting on a CV.
 *   - Strict 12-column-feel grid: every experience entry uses a 1fr
 *     date-on-left / 5fr role-on-right layout. The dates are the spine.
 *   - Section heads in caps with a subtle leading underline. No bg color.
 *   - Body color #f4f4f4 (Carbon gray-10, the IBM token for primary text
 *     on dark surfaces).
 *   - Compact 1.4 line-height — mono is wider than sans, density matters.
 *
 * Industry-fit: platform engineers at scale, SRE / DevOps, mainframe
 * modernization consultants, anyone who has touched RHEL professionally.
 * IBM, Red Hat, Oracle, and any bank that runs Spring Boot on bare metal.
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
import { EditableFallback, EditableSectionTitle } from "./components";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

// IBM Carbon Design System tokens. Hardcoded because Carbon = IBM identity.
const SURFACE = "#161616"; // Carbon gray-100 (dark surface)
const BLUE = "#0f62fe"; // Carbon blue-60 (interactive primary)
const TEXT_PRIMARY = "#f4f4f4"; // Carbon gray-10 (text on dark)
const TEXT_SECONDARY = "#c6c6c6"; // Carbon gray-30
const TEXT_TERTIARY = "#8d8d8d"; // Carbon gray-50

// Mono font stack — IBM Plex Mono first, JetBrains Mono fallback.
const MONO =
  "var(--font-ibm-plex-mono, 'IBM Plex Mono'), 'JetBrains Mono', monospace";

export function CarbonTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  const themed: ResumeData = {
    ...data,
    design: {
      ...design,
      pageBg: SURFACE,
      textColor: TEXT_PRIMARY,
    },
  };

  return (
    <TemplateFrame data={themed} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <header
        data-section-id="personal"
        className="mb-8 cursor-pointer pb-4"
        style={{ borderBottom: `1px solid ${BLUE}` }}
      >
        <div className="grid grid-cols-[1fr_auto] items-end gap-4">
          <div>
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.2em] uppercase leading-[1.05] transition-shadow hover:ring-2 hover:ring-white/30 hover:ring-offset-2 hover:ring-offset-transparent"
              style={{
                color: TEXT_PRIMARY,
                fontFamily: MONO,
                fontWeight: 500,
                letterSpacing: "0.02em",
                ...elementStyle(data, "personal.name"),
              }}
            >
              {personal.fullName || "Your name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-2 block w-fit cursor-text text-[0.85em] uppercase transition-shadow hover:ring-2 hover:ring-white/30 hover:ring-offset-2 hover:ring-offset-transparent"
                style={{
                  color: BLUE,
                  fontFamily: MONO,
                  letterSpacing: "0.16em",
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
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
                className="h-20 w-20 object-cover"
                style={{ outline: `1px solid ${BLUE}` }}
              />
            </div>
          )}
        </div>
        <CarbonContact data={data} />
      </header>

      <div className="space-y-7">
        {visible.map((s) => {
          const d = resolveDesign(design, s);
          return (
            <CarbonSection key={s.id} section={s} design={d} data={data} />
          );
        })}
      </div>
    </TemplateFrame>
  );
}

function CarbonContact({ data }: { data: ResumeData }) {
  const { personal } = data;
  const items: { id: string; label: string; href?: string; key: string }[] = [];
  if (personal.email)
    items.push({ id: "personal.email", label: personal.email, key: "EMAIL" });
  if (personal.phone)
    items.push({ id: "personal.phone", label: personal.phone, key: "TEL" });
  if (personal.location)
    items.push({
      id: "personal.location",
      label: personal.location,
      key: "LOC",
    });
  for (const l of personal.links) {
    items.push({
      id: `personal.links.${l.id}`,
      label: l.label || l.url,
      href: l.url,
      key: "URL",
    });
  }
  if (items.length === 0) return null;
  const grab =
    "inline-block cursor-text transition-shadow hover:ring-2 hover:ring-white/20 hover:ring-offset-2 hover:ring-offset-transparent rounded-sm";
  return (
    <div
      className="mt-3 grid grid-cols-2 gap-x-6 gap-y-0.5 text-[0.78em]"
      style={{ color: TEXT_SECONDARY, fontFamily: MONO }}
    >
      {items.map((it) => (
        <div key={it.id} className="flex gap-2">
          <span style={{ color: TEXT_TERTIARY, width: 36 }} className="shrink-0">
            {it.key}
          </span>
          {it.href ? (
            <a
              data-element-id={it.id}
              href={it.href.startsWith("http") ? it.href : `https://${it.href}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${grab} underline-offset-2 hover:underline`}
              style={{ color: BLUE, ...elementStyle(data, it.id) }}
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
        </div>
      ))}
    </div>
  );
}

function CarbonSection({
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
      className="group relative cursor-pointer break-inside-avoid rounded-sm p-1 -m-1 transition-[background-color,box-shadow] hover:bg-white/[0.04] hover:ring-2 hover:ring-white/10"
    >
      <h2
        data-element-id={titleId}
        className="mb-3 inline-block cursor-text pb-0.5 text-[0.82em] uppercase transition-shadow hover:ring-2 hover:ring-white/20 hover:ring-offset-2 hover:ring-offset-transparent"
        style={{
          color: TEXT_PRIMARY,
          fontFamily: MONO,
          fontWeight: 500,
          letterSpacing: "0.18em",
          borderBottom: `1px solid ${TEXT_PRIMARY}`,
          ...elementStyle(data, titleId),
        }}
      >
        {`> $<EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>`}
      </h2>
      <CarbonBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function CarbonBody({
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
          className="cursor-text whitespace-pre-wrap text-[0.88em] leading-[1.55] transition-shadow hover:ring-2 hover:ring-white/15"
          style={{
            color: TEXT_PRIMARY,
            fontFamily: MONO,
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Add a short summary."}
        </p>
      );
    }
    case "experience":
      return <CarbonExperience section={section} design={design} data={data} />;
    case "projects":
      return <CarbonProjects section={section} design={design} data={data} />;
    case "education":
      return <CarbonEducation section={section} design={design} data={data} />;
    case "skills":
      return <CarbonSkills section={section} design={design} data={data} />;
    case "certifications":
      return <CarbonCerts section={section} design={design} data={data} />;
    default:
      return <CarbonFallback section={section} design={design} data={data} />;
  }
}

/** Carbon's date-as-spine grid — left column for dates, right for content. */
function GridRow({
  date,
  children,
}: {
  date: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1fr_5fr] gap-4 text-[0.88em]">
      <div
        className="text-right"
        style={{ color: TEXT_TERTIARY, fontFamily: MONO }}
      >
        {date}
      </div>
      <div style={{ fontFamily: MONO }}>{children}</div>
    </div>
  );
}

function CarbonExperience({
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
        return (
          <article
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-white/15"
            style={elementStyle(data, id)}
          >
            <GridRow
              date={formatDateRange(
                it.startDate,
                it.endDate,
                it.current,
                design.dateFormat,
              )}
            >
              <div style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                {it.company && (
                  <span style={{ color: BLUE }}>
                    {" :: "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.company`} value={it.company} placeholder="Company" />
                  </span>
                )}
              </div>
              {it.location && (
                <div style={{ color: TEXT_TERTIARY }} className="text-[0.92em]">
                  <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.location`} value={it.location} placeholder="Location" />
                </div>
              )}
              <CarbonBullets
                bullets={it.bullets}
                data={data}
                sectionId={section.id}
                design={design}
              />
            </GridRow>
          </article>
        );
      })}
    </div>
  );
}

function CarbonProjects({
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
    <div className="space-y-3">
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        return (
          <article
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-white/15"
            style={elementStyle(data, id)}
          >
            <GridRow
              date={
                it.startDate || it.endDate || it.current
                  ? formatDateRange(
                      it.startDate,
                      it.endDate,
                      it.current,
                      design.dateFormat,
                    )
                  : "—"
              }
            >
              <div style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>
                {it.url ? (
                  <a
                    href={it.url.startsWith("http") ? it.url : `https://${it.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline"
                    style={{ color: BLUE }}
                  >
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.name`} value={it.name} placeholder="Name" />
                  </a>
                ) : (
                  it.name
                )}
                {it.role && (
                  <span style={{ color: TEXT_SECONDARY, fontWeight: 400 }}>
                    {" :: "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                  </span>
                )}
              </div>
              {it.techStack && (
                <div style={{ color: TEXT_TERTIARY }} className="text-[0.92em]">
                  [<EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.techStack`} value={it.techStack} placeholder="Tech stack" />]
                </div>
              )}
              <CarbonBullets
                bullets={it.bullets}
                data={data}
                sectionId={section.id}
                design={design}
              />
            </GridRow>
          </article>
        );
      })}
    </div>
  );
}

function CarbonEducation({
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
            className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-white/15"
            style={elementStyle(data, id)}
          >
            <GridRow
              date={formatDateRange(
                it.startDate,
                it.endDate,
                it.current,
                design.dateFormat,
              )}
            >
              <div style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.degree`} value={it.degree} placeholder="Degree" />
                {it.field ? ` :: ${it.field || "Field of study"}` : ""}
              </div>
              <div style={{ color: TEXT_SECONDARY }}>
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.institution`} value={it.institution} placeholder="Institution" />
                {it.location ? ` // ${it.location || "Location"}` : ""}
              </div>
            </GridRow>
          </article>
        );
      })}
    </div>
  );
}

function CarbonSkills({
  section,
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
    <div className="space-y-1.5 text-[0.85em]" style={{ fontFamily: MONO }}>
      {[...groups.entries()].map(([group, list]) => (
        <div key={group} className="grid grid-cols-[1fr_5fr] gap-4">
          <span
            className="text-right uppercase"
            style={{ color: TEXT_TERTIARY, letterSpacing: "0.08em" }}
          >
            {group}
          </span>
          <span style={{ color: TEXT_PRIMARY }}>
            {list.map((s, i) => {
              const id = `section.${section.id}.item.${s.id}`;
              return (
                <span key={s.id}>
                  {i > 0 && <span style={{ color: TEXT_TERTIARY }}> | </span>}
                  <span
                    data-element-id={id}
                    className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-white/20"
                    style={elementStyle(data, id)}
                  >
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${s.id}.name`} value={s.name} placeholder="Name" />
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

function CarbonCerts({
  section,
  data,
}: {
  section: CertificationsSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div
      className="space-y-1.5 text-[0.88em]"
      style={{ color: TEXT_PRIMARY, fontFamily: MONO }}
    >
      {items.map((c) => {
        const id = `section.${section.id}.item.${c.id}`;
        return (
          <article
            key={c.id}
            data-element-id={id}
            className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-white/15"
            style={elementStyle(data, id)}
          >
            <GridRow date={c.date || "—"}>
              <span style={{ fontWeight: 500 }}><EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.name`} value={c.name} placeholder="Name" /></span>
              {c.issuer && (
                <span style={{ color: TEXT_SECONDARY }}>
                  {" :: "}
                  <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.issuer`} value={c.issuer} placeholder="Issuer" />
                </span>
              )}
            </GridRow>
          </article>
        );
      })}
    </div>
  );
}

function CarbonFallback({
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
        className="cursor-text whitespace-pre-wrap text-[0.88em] transition-shadow hover:ring-2 hover:ring-white/15"
        style={{
          color: TEXT_PRIMARY,
          fontFamily: MONO,
          ...elementStyle(data, id),
        }}
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
        <CarbonBullets
          bullets={its as Bullet[]}
          data={data}
          sectionId={section.id}
          design={design}
        />
      );
    }
  }
  return null;
}

function CarbonBullets({
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
  // Honour the user's bulletStyle choice exactly — bulletGlyph() is the
  // shared resolver. Earlier code overrode "disc" to "▪" (square) which
  // confused users: they picked Disc, the bullets rendered as squares.
  // The IBM aesthetic still renders well via the Square option in the
  // Design tab; we just don't silently swap glyphs anymore.
  const glyph = bulletGlyph(design);
  return (
    <ul
      className="mt-1.5 space-y-0.5 text-[0.88em]"
      style={{ color: TEXT_PRIMARY, fontFamily: MONO }}
    >
      {list.map((b) => {
        const id = `section.${sectionId}.bullet.${b.id}`;
        return (
          <li
            key={b.id}
            data-element-id={id}
            className="flex cursor-grab gap-2 rounded-sm transition-shadow hover:ring-2 hover:ring-white/15"
            style={elementStyle(data, id)}
          >
            {glyph && (
              <span
                className="select-none"
                style={{ color: BLUE }}
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
