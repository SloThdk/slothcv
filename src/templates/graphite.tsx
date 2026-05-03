/**
 * Graphite — architect / industrial. Charcoal sidebar, off-white body.
 *
 * Visual character:
 *   - Hardcoded #fafaf9 (stone-50) page tint — the off-white of an
 *     architect's sketch pad.
 *   - Hardcoded #44403c (stone-700) charcoal sidebar at 35% width.
 *     Photo on top, then contact, then skills + languages live in here.
 *   - Onest geometric sans for body, Source Serif 4 for sidebar headers
 *     (the contrast — sans body / serif sidebar — is the German-Bauhaus
 *     trick from architectural firm letterheads).
 *   - JetBrains Mono dates everywhere — keeps the precise-instrument feel.
 *   - Body color #292524 (stone-800), sidebar text #fafaf9. High contrast.
 *   - No bullets in the body — uses the leading "—" as a hyphen list,
 *     reads more like an architect's specification than a CV.
 *
 * Industry-fit: architects (literal), industrial designers, urban
 * planners, sustainable-design consultants, set designers. The CV that
 * says "I have opinions about kerning AND load-bearing walls."
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
  HobbiesSection,
  LanguagesSection,
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

// Hardcoded core palette — Graphite identity.
const PAGE = "#fafaf9";
const CHARCOAL = "#44403c";
const TEXT_BODY = "#292524";
const TEXT_SIDEBAR = "#fafaf9";
const TEXT_SIDEBAR_DIM = "#d6d3d1";

const SANS = "var(--font-onest, 'Onest'), Inter, sans-serif";
const SERIF = "var(--font-source-serif-4, 'Source Serif 4'), 'EB Garamond', serif";
const MONO =
  "var(--font-jetbrains-mono, 'JetBrains Mono'), 'IBM Plex Mono', monospace";

// Sections that live in the sidebar — content-light, dense, lookup-style.
const SIDEBAR_TYPES = new Set<Section["type"]>([
  "skills",
  "languages",
  "certifications",
  "hobbies",
]);

export function GraphiteTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const sidebar = visible.filter((s) => SIDEBAR_TYPES.has(s.type));
  const main = visible.filter((s) => !SIDEBAR_TYPES.has(s.type));

  const themed: ResumeData = {
    ...data,
    design: {
      ...design,
      pageBg: PAGE,
      textColor: TEXT_BODY,
    },
  };

  return (
    <TemplateFrame data={themed} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Main grid — sidebar on left at 35%, body at 65%. The sidebar is a
          colored block with rounded corners — sits AS a card on the page,
          not bleeding to the page edge (cleaner across export formats). */}
      <div
        className="grid h-full gap-6"
        style={{ gridTemplateColumns: "35% 1fr" }}
      >
        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside
          className="rounded-lg p-5"
          style={{ background: CHARCOAL }}
        >
          {design.photo.enabled && personal.photoUrl && (
            <div
              data-element-id="personal.photo"
              className="mb-5 cursor-grab"
              style={elementStyle(data, "personal.photo")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={personal.photoUrl}
                alt=""
                referrerPolicy="no-referrer"
                draggable={false}
                className="h-32 w-32 rounded-md object-cover"
              />
            </div>
          )}

          <SidebarContact data={data} />

          {sidebar.map((s) => {
            const d = resolveDesign(design, s);
            return (
              <div key={s.id} className="mt-6">
                <GraphiteSidebarSection
                  section={s}
                  design={d}
                  data={data}
                />
              </div>
            );
          })}
        </aside>

        {/* ── Body ───────────────────────────────────────── */}
        <div>
          <header
            data-section-id="personal"
            className="mb-7 cursor-pointer pb-4"
            style={{ borderBottom: `1px solid ${TEXT_BODY}22` }}
          >
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text leading-[1.0]"
              style={{
                color: TEXT_BODY,
                fontFamily: SANS,
                fontSize: "2.6em",
                fontWeight: 300,
                letterSpacing: "-0.02em",
                ...elementStyle(data, "personal.name"),
              }}
            >
              {personal.fullName || "Your name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-1 block w-fit cursor-text text-[0.95em] uppercase"
                style={{
                  color: `${TEXT_BODY}aa`,
                  fontFamily: MONO,
                  fontWeight: 400,
                  letterSpacing: "0.14em",
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
          </header>

          <div className="space-y-6">
            {main.map((s) => {
              const d = resolveDesign(design, s);
              return (
                <GraphiteMainSection
                  key={s.id}
                  section={s}
                  design={d}
                  data={data}
                />
              );
            })}
          </div>
        </div>
      </div>
    </TemplateFrame>
  );
}

function SidebarContact({ data }: { data: ResumeData }) {
  const { personal } = data;
  const items: { id: string; label: string; href?: string; key: string }[] = [];
  if (personal.email)
    items.push({ id: "personal.email", label: personal.email, key: "M" });
  if (personal.phone)
    items.push({ id: "personal.phone", label: personal.phone, key: "T" });
  if (personal.location)
    items.push({
      id: "personal.location",
      label: personal.location,
      key: "L",
    });
  for (const l of personal.links) {
    items.push({
      id: `personal.links.${l.id}`,
      label: l.label || l.url,
      href: l.url,
      key: "W",
    });
  }
  if (items.length === 0) return null;
  // Drag wrapper. The single-letter key (M / T / L / W) used to live
  // OUTSIDE the data-element-id, so clicks on the letter fell through
  // to "background" (Design tab). We promote `data-element-id` and
  // `elementStyle` onto the row container so the entire row — letter
  // and value — drags as one unit. Inner anchor/span no longer carries
  // its own elementStyle (avoids double-translate).
  const grab =
    "flex w-full gap-2 cursor-text rounded-sm";
  // The "Contact" label is the only fixed string in this template — it
  // doesn't correspond to a section.title (it labels the personal-info
  // contact list). We give it a stable `design.contactLabel` element-id
  // so users can free-drag it independently of the contact rows beneath.
  // Inline-edit isn't wired yet (no lens writer for design.* fields);
  // drag works today, edit is a follow-up.
  const labelId = "design.contactLabel";
  return (
    <div>
      <SidebarHeader>
        <span
          data-element-id={labelId}
          className="inline-block cursor-text rounded-sm"
          style={elementStyle(data, labelId)}
        >
          Contact
        </span>
      </SidebarHeader>
      <div
        className="space-y-1.5 text-[0.85em]"
        style={{ color: TEXT_SIDEBAR }}
      >
        {items.map((it) => {
          const keyGlyph = (
            <span
              className="w-3 shrink-0 text-[0.85em]"
              style={{ color: TEXT_SIDEBAR_DIM, fontFamily: MONO }}
              aria-hidden
            >
              {it.key}
            </span>
          );
          return it.href ? (
            <a
              key={it.id}
              data-element-id={it.id}
              href={it.href.startsWith("http") ? it.href : `https://${it.href}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${grab} underline-offset-2 hover:underline break-all`}
              style={elementStyle(data, it.id)}
            >
              {keyGlyph}
              <span className="flex-1">{it.label}</span>
            </a>
          ) : (
            <span
              key={it.id}
              data-element-id={it.id}
              className={`${grab} break-all`}
              style={elementStyle(data, it.id)}
            >
              {keyGlyph}
              <span className="flex-1">{it.label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function SidebarHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mb-2 text-[0.78em] uppercase"
      style={{
        color: TEXT_SIDEBAR,
        fontFamily: SERIF,
        fontWeight: 600,
        letterSpacing: "0.18em",
        borderBottom: `0.5px solid ${TEXT_SIDEBAR}55`,
        paddingBottom: "4px",
      }}
    >
      {children}
    </h2>
  );
}

function GraphiteSidebarSection({
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
    <div
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1"
    >
      <h2
        data-element-id={titleId}
        className="mb-2 inline-block cursor-text text-[0.78em] uppercase"
        style={{
          color: TEXT_SIDEBAR,
          fontFamily: SERIF,
          fontWeight: 600,
          letterSpacing: "0.18em",
          borderBottom: `0.5px solid ${TEXT_SIDEBAR}55`,
          paddingBottom: "4px",
          width: "100%",
          display: "block",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <SidebarBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </div>
  );
}

function SidebarBody({
  section,
  design,
  data,
}: {
  section: Section;
  design: GlobalDesign;
  data: ResumeData;
}) {
  switch (section.type) {
    case "skills":
      return <SidebarSkills section={section} data={data} />;
    case "languages":
      return <SidebarLanguages section={section} data={data} />;
    case "certifications":
      return <SidebarCerts section={section} data={data} />;
    case "hobbies":
      return <SidebarHobbies section={section} data={data} />;
    default:
      return <SidebarFallback section={section} design={design} data={data} />;
  }
}

function SidebarSkills({
  section,
  data,
}: {
  section: SkillsSection;
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
    <div className="space-y-3 text-[0.85em]">
      {[...groups.entries()].map(([group, list]) => (
        <div key={group}>
          {groups.size > 1 && (
            <div
              className="mb-1 text-[0.85em] italic"
              style={{ color: TEXT_SIDEBAR_DIM, fontFamily: SERIF }}
            >
              {group}
            </div>
          )}
          <div style={{ color: TEXT_SIDEBAR, fontFamily: SANS }}>
            {list.map((s, i) => {
              const id = `section.${section.id}.item.${s.id}`;
              return (
                <span key={s.id}>
                  {i > 0 && (
                    <span style={{ color: TEXT_SIDEBAR_DIM }}> · </span>
                  )}
                  <span
                    data-element-id={id}
                    className="cursor-grab rounded-sm"
                    style={elementStyle(data, id)}
                  >
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${s.id}.name`} value={s.name} placeholder="Name" />
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SidebarLanguages({
  section,
  data,
}: {
  section: LanguagesSection;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-1 text-[0.85em]">
      {items.map((l) => {
        const id = `section.${section.id}.item.${l.id}`;
        return (
          <div
            key={l.id}
            data-element-id={id}
            className="flex cursor-grab items-baseline justify-between rounded-sm"
            style={{ color: TEXT_SIDEBAR, ...elementStyle(data, id) }}
          >
            <span style={{ fontFamily: SANS }}><EditableFallback data={data} fieldId={`section.${section.id}.item.${l.id}.name`} value={l.name} placeholder="Name" /></span>
            <span
              className="text-[0.85em]"
              style={{ color: TEXT_SIDEBAR_DIM, fontFamily: MONO }}
            >
              <EditableFallback data={data} fieldId={`section.${section.id}.item.${l.id}.proficiency`} value={l.proficiency} placeholder="Proficiency" />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SidebarCerts({
  section,
  data,
}: {
  section: CertificationsSection;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-2 text-[0.85em]">
      {items.map((c) => {
        const id = `section.${section.id}.item.${c.id}`;
        return (
          <div
            key={c.id}
            data-element-id={id}
            className="cursor-grab rounded-sm"
            style={{ color: TEXT_SIDEBAR, ...elementStyle(data, id) }}
          >
            <div style={{ fontFamily: SANS, fontWeight: 500 }}><EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.name`} value={c.name} placeholder="Name" /></div>
            {c.issuer && (
              <div
                className="text-[0.85em] italic"
                style={{ color: TEXT_SIDEBAR_DIM, fontFamily: SERIF }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.issuer`} value={c.issuer} placeholder="Issuer" />
                {c.date ? ` · ${c.date || "Date"}` : ""}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SidebarHobbies({
  section,
  data,
}: {
  section: HobbiesSection;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible && i.text.trim());
  if (items.length === 0) return null;
  const id = `section.${section.id}.body`;
  return (
    <p
      data-element-id={id}
      className="cursor-text rounded-sm text-[0.85em]"
      style={{
        color: TEXT_SIDEBAR,
        fontFamily: SANS,
        ...elementStyle(data, id),
      }}
    >
      {items.map((h) => h.text).join(" · ")}
    </p>
  );
}

function SidebarFallback({
  section,
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
        className="cursor-text whitespace-pre-wrap text-[0.85em]"
        style={{
          color: TEXT_SIDEBAR,
          fontFamily: SANS,
          ...elementStyle(data, id),
        }}
      >
        {(section as { body: string }).body}
      </p>
    );
  }
  return null;
}

// ─── Body sections ──────────────────────────────────────

function GraphiteMainSection({
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
        className="mb-2 inline-block cursor-text text-[0.85em] uppercase"
        style={{
          color: TEXT_BODY,
          fontFamily: SANS,
          fontWeight: 600,
          letterSpacing: "0.16em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <div
        className="mb-3 h-px w-full"
        style={{ background: `${TEXT_BODY}22` }}
      />
      <BodySectionContent section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function BodySectionContent({
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
          className="cursor-text whitespace-pre-wrap text-[0.95em] leading-[1.55]"
          style={{
            color: TEXT_BODY,
            fontFamily: SANS,
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Add a short summary."}
        </p>
      );
    }
    case "experience":
      return <BodyExperience section={section} design={design} data={data} />;
    case "projects":
      return <BodyProjects section={section} design={design} data={data} />;
    case "education":
      return <BodyEducation section={section} design={design} data={data} />;
    default:
      return <BodyFallback section={section} design={design} data={data} />;
  }
}

function BodyExperience({
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
            className="cursor-grab rounded-sm"
            style={elementStyle(data, id)}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3
                className="text-[1em]"
                style={{
                  color: TEXT_BODY,
                  fontFamily: SANS,
                  fontWeight: 600,
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                {it.company && (
                  <span style={{ color: `${TEXT_BODY}99`, fontWeight: 400 }}>
                    {" · "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.company`} value={it.company} placeholder="Company" />
                  </span>
                )}
              </h3>
              <span
                className="text-[0.78em]"
                style={{
                  color: `${TEXT_BODY}88`,
                  fontFamily: MONO,
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
                className="text-[0.82em] italic"
                style={{ color: `${TEXT_BODY}77`, fontFamily: SERIF }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.location`} value={it.location} placeholder="Location" />
              </div>
            )}
            <BodyBullets
              bullets={it.bullets}
              data={data}
              sectionId={section.id}
              design={design}
            />
          </article>
        );
      })}
    </div>
  );
}

function BodyProjects({
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
            className="cursor-grab rounded-sm"
            style={elementStyle(data, id)}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3
                className="text-[1em]"
                style={{
                  color: TEXT_BODY,
                  fontFamily: SANS,
                  fontWeight: 600,
                }}
              >
                {it.url ? (
                  <a
                    href={it.url.startsWith("http") ? it.url : `https://${it.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline"
                    style={{ color: CHARCOAL }}
                  >
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.name`} value={it.name} placeholder="Name" />
                  </a>
                ) : (
                  it.name
                )}
                {it.role && (
                  <span style={{ color: `${TEXT_BODY}99`, fontWeight: 400 }}>
                    {" · "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                  </span>
                )}
              </h3>
              {(it.startDate || it.endDate || it.current) && (
                <span
                  className="text-[0.78em]"
                  style={{
                    color: `${TEXT_BODY}88`,
                    fontFamily: MONO,
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
                style={{ color: `${TEXT_BODY}88`, fontFamily: MONO }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.techStack`} value={it.techStack} placeholder="Tech stack" />
              </div>
            )}
            <BodyBullets
              bullets={it.bullets}
              data={data}
              sectionId={section.id}
              design={design}
            />
          </article>
        );
      })}
    </div>
  );
}

function BodyEducation({
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
                  color: TEXT_BODY,
                  fontFamily: SANS,
                  fontWeight: 600,
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.degree`} value={it.degree} placeholder="Degree" />
                {it.field ? ` · ${it.field || "Field of study"}` : ""}
              </span>
              <span
                className="ml-2 text-[0.85em] italic"
                style={{ color: `${TEXT_BODY}99`, fontFamily: SERIF }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.institution`} value={it.institution} placeholder="Institution" />
              </span>
            </div>
            <span
              className="text-[0.78em]"
              style={{ color: `${TEXT_BODY}88`, fontFamily: MONO }}
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

function BodyFallback({
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
        style={{ color: TEXT_BODY, fontFamily: SANS, ...elementStyle(data, id) }}
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
        <BodyBullets
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

function BodyBullets({
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
  // Default to a long em-dash, architect-spec style. Respect user override.
  const glyph = design.bulletStyle === "disc" ? "—" : bulletGlyph(design);
  return (
    <ul
      className="mt-1.5 space-y-1 text-[0.92em]"
      style={{ color: TEXT_BODY, fontFamily: SANS }}
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
                style={{ color: CHARCOAL }}
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
