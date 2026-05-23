/**
 * Madison — Wall Street executive CV. Manhattan's older, more confident
 * cousin: where Manhattan reads "VP", Madison reads "Managing Director".
 *
 * Visual character:
 *   - 35/65 two-column. LEFT is the narrow "About" column with name,
 *     contact, education, certifications, languages. RIGHT is the
 *     experience narrative — wide, with measurable-results pulled out
 *   - Navy `#1e3a8a` body text — yes, BODY is navy not black, that's the
 *     old-money detail
 *   - Muted gold `#d4af37` accent on dividers + the name's underline
 *   - Lora serif for the name in 3em (display weight 600); Source Serif 4
 *     for body — the serif-on-serif lockup reads conservative-and-paid
 *   - Each experience entry has a "results pull-quote" rendered to the
 *     right of the role/company line, in italic gold — the "Closed $42M
 *     Q3 deal" detail
 *   - Wide top header with thin gold rule above + below the name block
 *   - No photo (banking norm; if user enables it, we render in the LEFT
 *     column at top)
 *
 * Industry-fit: investment banking, private equity, hedge funds, MBA grads
 * targeting Lazard/Goldman/MS, MDs, Partners. Looks expensive without being
 * loud — that's the vibe Wall Street pays for.
 *
 * Pull-quote logic: the FIRST bullet of every experience item gets pulled
 * out as the "headline result". This is intentional — users putting their
 * biggest deal first is exactly the formatting discipline this template
 * rewards.
 */

"use client";

import { TemplateFrame } from "./frame";
import { SectionActions } from "./section-actions";
import {
  elementStyle,
  formatDateRange,
  photoBorderStyle,
  positionStyle,
  visibleBullets,
  visibleSections,
} from "./shared";
import type {
  CertificationsSection,
  EducationSection,
  CareerBreakSection,
  ExperienceSection,
  GlobalDesign,
  LanguagesSection,
  ResumeData,
  Section,
  SkillsSection,
} from "@/types/resume";
import { EditableFallback, EditableSectionTitle } from "./components";

const NAVY = "#1e3a8a";
const GOLD = "#d4af37";
const PAPER = "#fefdfb";

// Sections that go in the narrow LEFT column.
const LEFT_TYPES = new Set<Section["type"]>([
  "education",
  "certifications",
  "languages",
  "skills",
  "awards",
  "references",
]);

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function MadisonTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const left = visible.filter((s) => LEFT_TYPES.has(s.type));
  const right = visible.filter((s) => !LEFT_TYPES.has(s.type));

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Header band — gold rule above and below; name in 3em Lora; tagline
          in tracked uppercase Source Sans. */}
      <div className="h-px w-full" style={{ background: GOLD }} />
      <header
        data-section-id="personal"
        className="mb-5 cursor-pointer py-3 text-center"
      >
        <h1
          data-element-id="personal.name"
          className="mx-auto block w-fit cursor-text text-[3em] leading-[1] tracking-tight"
          style={{
            color: NAVY,
            fontFamily: "var(--cv-title-font, var(--font-lora, 'Lora'), 'Source Serif 4', serif)",
            fontWeight: 600,
            ...elementStyle(data, "personal.name"),
          }}
        >
          {personal.fullName || "Your Name"}
        </h1>
        {personal.headline && (
          <p
            data-element-id="personal.headline"
            className="mx-auto mt-1.5 block w-fit cursor-text text-[0.78em] uppercase"
            style={{
              color: GOLD,
              fontFamily:
                "var(--font-source-sans-3, 'Source Sans 3'), 'Inter', sans-serif",
              fontWeight: 700,
              letterSpacing: "0.28em",
              ...elementStyle(data, "personal.headline"),
            }}
          >
            {personal.headline}
          </p>
        )}
      </header>
      <div className="mb-5 h-px w-full" style={{ background: GOLD }} />

      {/* Body — 35/65 split */}
      <div className="grid gap-7" style={{ gridTemplateColumns: "35% 1fr" }}>
        {/* LEFT — narrow about column */}
        <aside className="space-y-5">
          {design.photo.enabled && (
            <div
              data-element-id="personal.photo"
              className="cursor-grab"
              style={elementStyle(data, "personal.photo")}
            >
              {personal.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={personal.photoUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  draggable={false}
                  className="h-32 w-full rounded-sm object-cover"
                  style={photoBorderStyle(design, GOLD)}
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="grid h-full w-full place-items-center bg-[color-mix(in_srgb,currentColor_8%,transparent)] text-[color-mix(in_srgb,currentColor_45%,transparent)]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
                  </svg>
                </div>
              )}
            </div>
          )}
          <MadisonContactBlock data={data} />
          {left.map((s) => (
            <MadisonLeftSection
              key={s.id}
              section={s}
              design={design}
              data={data}
            />
          ))}
        </aside>

        {/* RIGHT — wide experience narrative */}
        <div className="space-y-5">
          {right.map((s) => (
            <MadisonRightSection
              key={s.id}
              section={s}
              design={design}
              data={data}
            />
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

/** Contact block in the left column — navy text, gold key labels. */
function MadisonContactBlock({ data }: { data: ResumeData }) {
  const { personal } = data;
  return (
    <div>
      <MadisonLeftHeading title="Contact" />
      <div
        className="space-y-1 text-[0.85em]"
        style={{
          color: NAVY,
          fontFamily: "var(--cv-body-font, var(--font-source-serif-4, 'Source Serif 4'), serif)",
        }}
      >
        {personal.email && (
          <KV
            label="Email"
            data={data}
            id="personal.email"
            value={personal.email}
          />
        )}
        {personal.phone && (
          <KV
            label="Phone"
            data={data}
            id="personal.phone"
            value={personal.phone}
          />
        )}
        {personal.location && (
          <KV
            label="Location"
            data={data}
            id="personal.location"
            value={personal.location}
          />
        )}
        {personal.links.map((l) => {
          const id = `personal.links.${l.id}`;
          return (
            <KV
              key={l.id}
              label={l.label || "Link"}
              data={data}
              id={id}
              value={l.url}
              href={l.url}
            />
          );
        })}
      </div>
    </div>
  );
}

function KV({
  label,
  value,
  href,
  id,
  data,
}: {
  label: string;
  value: string;
  href?: string;
  id: string;
  data: ResumeData;
}) {
  return (
    <div className="grid grid-cols-[5em_1fr] gap-2">
      <span
        className="text-[0.78em] uppercase"
        style={{
          color: GOLD,
          letterSpacing: "0.14em",
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      {href ? (
        <a
          data-element-id={id}
          href={href.startsWith("http") ? href : `https://${href}`}
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-text rounded-sm underline-offset-2 hover:underline"
          style={elementStyle(data, id)}
        >
          {value}
        </a>
      ) : (
        <span
          data-element-id={id}
          className="cursor-text rounded-sm"
          style={elementStyle(data, id)}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function MadisonLeftHeading({ title }: { title: string }) {
  return (
    <div className="mb-1.5">
      <h2
        className="text-[0.82em] uppercase"
        style={{
          color: NAVY,
          fontFamily:
            "var(--font-source-sans-3, 'Source Sans 3'), Inter, sans-serif",
          fontWeight: 700,
          letterSpacing: "0.18em",
        }}
      >
        {title}
      </h2>
      <div className="mt-1 h-px w-full" style={{ background: GOLD }} />
    </div>
  );
}

function MadisonLeftSection({
  section,
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
        className="mb-1 inline-block cursor-text text-[0.82em] uppercase"
        style={{
          color: NAVY,
          fontFamily:
            "var(--font-source-sans-3, 'Source Sans 3'), Inter, sans-serif",
          fontWeight: 700,
          letterSpacing: "0.18em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <div className="mb-2 h-px w-full" style={{ background: GOLD }} />
      <MadisonLeftBody section={section} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function MadisonLeftBody({
  section,
  data,
}: {
  section: Section;
  data: ResumeData;
}) {
  switch (section.type) {
    case "education":
      return (
        <MadisonEducation section={section as EducationSection} data={data} />
      );
    case "certifications":
      return (
        <MadisonCerts
          section={section as CertificationsSection}
          data={data}
        />
      );
    case "languages":
      return (
        <MadisonLanguages
          section={section as LanguagesSection}
          data={data}
        />
      );
    case "skills":
      return (
        <MadisonSkills section={section as SkillsSection} data={data} />
      );
    default:
      return <MadisonGenericList section={section} data={data} />;
  }
}

function MadisonEducation({
  section,
  data,
}: {
  section: EducationSection;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        return (
          <div
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm text-[0.85em]"
            style={{
              color: NAVY,
              fontFamily: "var(--cv-body-font, var(--font-source-serif-4, 'Source Serif 4'), serif)",
              ...elementStyle(data, id),
            }}
          >
            <div className="font-semibold">
              <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.degree`} value={it.degree} placeholder="Degree" />
              {it.field ? `, ${it.field || "Field of study"}` : ""}
            </div>
            <div className="italic" style={{ color: `${NAVY}cc` }}>
              <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.institution`} value={it.institution} placeholder="Institution" />
            </div>
            <div className="text-[0.85em]" style={{ color: `${NAVY}88` }}>
              {[it.startDate, it.endDate].filter(Boolean).join(" – ")}
              {it.gpa && ` · GPA ${it.gpa || "GPA"}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MadisonCerts({
  section,
  data,
}: {
  section: CertificationsSection;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-1.5 text-[0.85em]">
      {items.map((c) => {
        const id = `section.${section.id}.item.${c.id}`;
        return (
          <div
            key={c.id}
            data-element-id={id}
            className="cursor-grab rounded-sm"
            style={{
              color: NAVY,
              fontFamily: "var(--cv-body-font, var(--font-source-serif-4, 'Source Serif 4'), serif)",
              ...elementStyle(data, id),
            }}
          >
            <div className="font-semibold"><EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.name`} value={c.name} placeholder="Name" /></div>
            <div className="italic" style={{ color: `${NAVY}aa` }}>
              <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.issuer`} value={c.issuer} placeholder="Issuer" />
              {c.date && ` · ${c.date || "Date"}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MadisonLanguages({
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
            className="flex cursor-grab justify-between gap-2 rounded-sm"
            style={{
              color: NAVY,
              fontFamily: "var(--cv-body-font, var(--font-source-serif-4, 'Source Serif 4'), serif)",
              ...elementStyle(data, id),
            }}
          >
            <span className="font-semibold"><EditableFallback data={data} fieldId={`section.${section.id}.item.${l.id}.name`} value={l.name} placeholder="Name" /></span>
            <span style={{ color: GOLD, fontWeight: 600 }}>
              <EditableFallback data={data} fieldId={`section.${section.id}.item.${l.id}.proficiency`} value={l.proficiency} placeholder="Proficiency" />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MadisonSkills({
  section,
  data,
}: {
  section: SkillsSection;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  // Group skills like the rest of the system, but in this template they
  // render as a thin list with a gold dot prefix — banking minimal.
  const groups = new Map<string, typeof items>();
  for (const s of items) {
    const key = s.group || "Skills";
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }
  return (
    <div className="space-y-2 text-[0.85em]">
      {[...groups.entries()].map(([group, list]) => (
        <div key={group}>
          {groups.size > 1 && (
            <div
              className="mb-0.5 text-[0.78em]"
              style={{
                color: GOLD,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              {group}
            </div>
          )}
          {list.map((s) => {
            const id = `section.${section.id}.item.${s.id}`;
            return (
              <div
                key={s.id}
                data-element-id={id}
                className="flex cursor-grab items-center gap-2 rounded-sm"
                style={{
                  color: NAVY,
                  fontFamily: "var(--cv-body-font, var(--font-source-serif-4, 'Source Serif 4'), serif)",
                  ...elementStyle(data, id),
                }}
              >
                <span
                  className="h-1 w-1 rounded-full"
                  style={{ background: GOLD }}
                  aria-hidden
                />
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${s.id}.name`} value={s.name} placeholder="Name" />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MadisonGenericList({
  section,
  data,
}: {
  section: Section;
  data: ResumeData;
}) {
  if ("items" in section) {
    const its = (section as {
      items: { id: string; name?: string; text?: string; visible: boolean }[];
    }).items;
    const visible = its.filter((i) => i.visible);
    return (
      <ul
        className="space-y-0.5 text-[0.85em]"
        style={{
          color: NAVY,
          fontFamily: "var(--cv-body-font, var(--font-source-serif-4, 'Source Serif 4'), serif)",
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

// ---- RIGHT column ----

function MadisonRightSection({
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
        className="mb-1 inline-block cursor-text text-[1em] uppercase"
        style={{
          color: NAVY,
          fontFamily:
            "var(--font-source-sans-3, 'Source Sans 3'), Inter, sans-serif",
          fontWeight: 700,
          letterSpacing: "0.16em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <div className="mb-3 h-px w-full" style={{ background: GOLD }} />
      <MadisonRightBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function MadisonRightBody({
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
            color: NAVY,
            fontFamily: "var(--cv-body-font, var(--font-source-serif-4, 'Source Serif 4'), serif)",
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Add an executive summary."}
        </p>
      );
    }
    case "careerBreak":
    case "experience":
      return (
        <MadisonExperience section={section} design={design} data={data} />
      );
    default:
      return <MadisonRightFallback section={section} data={data} />;
  }
}

/** Experience entries with the FIRST bullet pulled out as a "headline result"
 *  — the Madison signature. Italic gold, sat opposite the date row. */
function MadisonExperience({
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
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        const visBullets = visibleBullets(it.bullets);
        const headline = visBullets[0];
        const restBullets = visBullets.slice(1);
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
                  color: NAVY,
                  fontFamily: "var(--cv-body-font, var(--font-source-serif-4, 'Source Serif 4'), serif)",
                  fontWeight: 700,
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                {it.company && (
                  <span style={{ color: NAVY, fontWeight: 500 }}>
                    {" — "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.company`} value={it.company} placeholder="Company" />
                  </span>
                )}
              </h3>
              <span
                className="text-[0.82em] tabular-nums"
                style={{
                  color: `${NAVY}99`,
                  fontFamily:
                    "var(--font-source-sans-3, 'Source Sans 3'), Inter, sans-serif",
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
                style={{ color: `${NAVY}80` }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.location`} value={it.location} placeholder="Location" />
              </div>
            )}
            {/* Headline result pull-quote — italic gold, with leading "▸"
                glyph so it reads like a callout, not a bullet. */}
            {headline && (
              <div
                data-element-id={`section.${section.id}.bullet.${headline.id}`}
                className="mt-1.5 flex cursor-text gap-2 rounded-sm border-l-2 pl-2"
                style={{
                  borderColor: GOLD,
                  color: GOLD,
                  fontFamily: "var(--cv-body-font, var(--font-source-serif-4, 'Source Serif 4'), serif)",
                  fontStyle: "italic",
                  fontWeight: 600,
                  ...elementStyle(
                    data,
                    `section.${section.id}.bullet.${headline.id}`,
                  ),
                }}
              >
                <span className="select-none" aria-hidden>
                  ▸
                </span>
                <span className="flex-1 whitespace-pre-wrap text-[0.92em]">
                  {headline.text}
                </span>
              </div>
            )}
            {restBullets.length > 0 && (
              <ul
                className="mt-1.5 space-y-0.5 pl-2 text-[0.9em] leading-[1.5]"
                style={{
                  color: NAVY,
                  fontFamily: "var(--cv-body-font, var(--font-source-serif-4, 'Source Serif 4'), serif)",
                }}
              >
                {restBullets.map((b) => {
                  const bid = `section.${section.id}.bullet.${b.id}`;
                  return (
                    <li
                      key={b.id}
                      data-element-id={bid}
                      className="flex cursor-text gap-2 rounded-sm"
                      style={elementStyle(data, bid)}
                    >
                      <span
                        className="select-none"
                        style={{ color: GOLD }}
                        aria-hidden
                      >
                        ◆
                      </span>
                      <span className="flex-1 whitespace-pre-wrap">
                        {b.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );
}

function MadisonRightFallback({
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
          color: NAVY,
          fontFamily: "var(--cv-body-font, var(--font-source-serif-4, 'Source Serif 4'), serif)",
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
        className="space-y-0.5 text-[0.92em]"
        style={{
          color: NAVY,
          fontFamily: "var(--cv-body-font, var(--font-source-serif-4, 'Source Serif 4'), serif)",
        }}
      >
        {visible.map((it) => {
          const id = `section.${section.id}.item.${it.id}`;
          return (
            <li
              key={it.id}
              data-element-id={id}
              className="flex cursor-grab gap-2 rounded-sm"
              style={elementStyle(data, id)}
            >
              <span style={{ color: GOLD }} aria-hidden>
                ◆
              </span>
              <span className="flex-1">{it.name ?? it.text ?? ""}</span>
            </li>
          );
        })}
      </ul>
    );
  }
  return null;
}
// Reference PAPER so the bg-color constant is consumed; some bundlers tree-shake
// otherwise-unreferenced values. Used as the implicit Madison surface.
void PAPER;
