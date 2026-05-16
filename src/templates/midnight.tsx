/**
 * Midnight — old-money executive. Navy + gold + EB Garamond.
 *
 * Visual character:
 *   - Hardcoded #0a1628 deep-navy page (the navy of a Brioni suit, not
 *     a tech company logo).
 *   - Hardcoded #d4af37 antique gold accent on name, section heads,
 *     bullet markers — the same shade you'd find on a Yale crest.
 *   - EB Garamond serif throughout. Garamond is the typeface of the
 *     Princeton thesis and the Harvard alumni magazine — pure prestige
 *     signaling.
 *   - Body color #e8e3d8 (warm off-white, slightly cream) at 0.95em —
 *     pure white on navy reads as "tech," cream reads as "library."
 *   - Wide 88px outer breathing room (handled by template's pageMargin
 *     respect; we add 24px extra inside the body block as well).
 *   - All-caps small section heads with a thin gold rule beneath, but
 *     spaced widely (0.22em letter-spacing).
 *
 * Industry-fit: investment banking VPs / MDs, private equity associates,
 * MBA candidates targeting consulting firms (McKinsey/BCG/Bain), board
 * directors, family-office executives. The CV that says "I read the
 * Financial Times in print."
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

// Midnight identity — pulled from the user's design at render time so
// every Design-tab picker (accent / text / secondary / page bg / body
// font) drives the rendering. defaultDesignForTemplate("midnight")
// seeds the original palette (#0a1628 navy, #d4af37 gold, #e8e3d8 cream,
// EB Garamond) on first template select; from there the pickers own it.
// Each function below reads from data.design.* via a small alias block
// so existing `${GOLD}` etc. references keep working without churn.

export function MidnightTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const GOLD = data.design.accentColor;
  const CREAM = data.design.textColor;
  const CREAM_DIM = data.design.secondaryColor;
  const NAVY = data.design.pageBg;
  const SERIF = `${data.design.bodyFont || "EB Garamond"}, 'Source Serif 4', serif`;
  const TITLE_SERIF = `${data.design.titleFont || "EB Garamond"}, 'Source Serif 4', serif`;
  const visible = visibleSections(data);

  // Trust the user's design values. defaultDesignForTemplate("midnight")
  // seeds the initial palette (NAVY page, CREAM ink); from there the
  // Design tab's pickers control the page background and text color
  // directly. The earlier `themed` override clobbered those picker
  // dispatches on every render, making the bg/text controls visually
  // dead — see the same comment in the other locked-palette templates.
  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Wide outer padding — old-money CVs breathe. The TemplateFrame
          already applies the user's pageMargin; we add 24px more inside. */}
      <div style={{ paddingLeft: "24px", paddingRight: "24px" }}>
        <header
          data-section-id="personal"
          className="mb-12 cursor-pointer pb-6 text-center"
          style={{ borderBottom: `1px solid ${GOLD}` }}
        >
          <h1
            data-element-id="personal.name"
            className="mx-auto block w-fit cursor-text leading-[1.0]"
            style={{
              color: GOLD,
              fontFamily: TITLE_SERIF,
              fontSize: "3em",
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
              className="mx-auto mt-3 block w-fit cursor-text uppercase"
              style={{
                color: CREAM,
                fontFamily: SERIF,
                fontSize: "0.85em",
                fontStyle: "italic",
                letterSpacing: "0.32em",
                fontWeight: 400,
                ...elementStyle(data, "personal.headline"),
              }}
            >
              {personal.headline}
            </p>
          )}
          <MidnightContact data={data} />
          {design.photo.enabled && personal.photoUrl && (
            <div
              data-element-id="personal.photo"
              className="mx-auto mt-5 cursor-grab"
              style={elementStyle(data, "personal.photo")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={personal.photoUrl}
                alt=""
                referrerPolicy="no-referrer"
                draggable={false}
                className="mx-auto h-24 w-24 rounded-full object-cover"
                style={{
                  // box-shadow + design.photo.borderColor override (Design → Photo → Border)
                  boxShadow: `0 0 0 3px transparent, 0 0 0 4px ${data.design.photo.borderColor || GOLD}`,
                }}
              />
            </div>
          )}
        </header>

        <div className="space-y-9">
          {visible.map((s) => {
            const d = resolveDesign(design, s);
            return (
              <MidnightSection key={s.id} section={s} design={d} data={data} />
            );
          })}
        </div>
      </div>
    </TemplateFrame>
  );
}

function MidnightContact({ data }: { data: ResumeData }) {
  const GOLD = data.design.accentColor;
  const CREAM_DIM = data.design.secondaryColor;
  const SERIF = `${data.design.bodyFont || "EB Garamond"}, 'Source Serif 4', serif`;
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
    <div
      className="mt-4 text-[0.88em] italic"
      style={{ color: CREAM_DIM, fontFamily: SERIF }}
    >
      {items.map((it, i) => (
        <span key={it.id}>
          {i > 0 && (
            <span className="mx-3" style={{ color: GOLD }} aria-hidden>
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
              style={{ color: GOLD, ...elementStyle(data, it.id) }}
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

function MidnightSection({
  section,
  design,
  data,
}: {
  section: Section;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const GOLD = data.design.accentColor;
  const SERIF = `${data.design.bodyFont || "EB Garamond"}, 'Source Serif 4', serif`;
  const TITLE_SERIF = `${data.design.titleFont || "EB Garamond"}, 'Source Serif 4', serif`;
  const titleId = `section.${section.id}.title`;
  return (
    <section
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-sm p-1 -m-1"
    >
      <h2
        data-element-id={titleId}
        className="mb-2 inline-block cursor-text uppercase"
        style={{
          color: GOLD,
          fontFamily: TITLE_SERIF,
          fontSize: "0.85em",
          fontWeight: 500,
          letterSpacing: "0.22em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <div
        className="mb-3"
        style={{
          height: "0.5px",
          background: `${GOLD}66`,
        }}
      />
      <MidnightBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function MidnightBody({
  section,
  design,
  data,
}: {
  section: Section;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const CREAM = data.design.textColor;
  const SERIF = `${data.design.bodyFont || "EB Garamond"}, 'Source Serif 4', serif`;
  switch (section.type) {
    case "summary": {
      const id = `section.${section.id}.body`;
      return (
        <p
          data-element-id={id}
          className="cursor-text whitespace-pre-wrap text-[0.95em] leading-[1.65]"
          style={{
            color: CREAM,
            fontFamily: SERIF,
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Add a short summary."}
        </p>
      );
    }
    case "careerBreak":
    case "experience":
      return (
        <MidnightExperience section={section} design={design} data={data} />
      );
    case "projects":
      return <MidnightProjects section={section} design={design} data={data} />;
    case "education":
      return (
        <MidnightEducation section={section} design={design} data={data} />
      );
    case "skills":
      return <MidnightSkills section={section} design={design} data={data} />;
    case "certifications":
      return <MidnightCerts section={section} design={design} data={data} />;
    default:
      return (
        <MidnightFallback section={section} design={design} data={data} />
      );
  }
}

function MidnightExperience({
  section,
  design,
  data,
}: {
  section: ExperienceSection | CareerBreakSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const GOLD = data.design.accentColor;
  const CREAM = data.design.textColor;
  const CREAM_DIM = data.design.secondaryColor;
  const SERIF = `${data.design.bodyFont || "EB Garamond"}, 'Source Serif 4', serif`;
  const TITLE_SERIF = `${data.design.titleFont || "EB Garamond"}, 'Source Serif 4', serif`;
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
                  color: CREAM,
                  fontFamily: TITLE_SERIF,
                  fontWeight: 600,
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                {it.company && (
                  <span
                    style={{ color: GOLD, fontWeight: 500, fontStyle: "italic" }}
                  >
                    {" — "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.company`} value={it.company} placeholder="Company" />
                  </span>
                )}
              </h3>
              <span
                className="text-[0.85em] italic"
                style={{ color: CREAM_DIM, fontFamily: SERIF }}
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
                className="text-[0.85em] italic"
                style={{ color: CREAM_DIM, fontFamily: SERIF }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.location`} value={it.location} placeholder="Location" />
              </div>
            )}
            <MidnightBullets
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

function MidnightProjects({
  section,
  design,
  data,
}: {
  section: ProjectsSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const GOLD = data.design.accentColor;
  const CREAM = data.design.textColor;
  const CREAM_DIM = data.design.secondaryColor;
  const SERIF = `${data.design.bodyFont || "EB Garamond"}, 'Source Serif 4', serif`;
  const TITLE_SERIF = `${data.design.titleFont || "EB Garamond"}, 'Source Serif 4', serif`;
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
                  color: CREAM,
                  fontFamily: TITLE_SERIF,
                  fontWeight: 600,
                }}
              >
                {it.url ? (
                  <a
                    href={it.url.startsWith("http") ? it.url : `https://${it.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline"
                    style={{ color: GOLD }}
                  >
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.name`} value={it.name} placeholder="Name" />
                  </a>
                ) : (
                  it.name
                )}
                {it.role && (
                  <span style={{ color: CREAM_DIM, fontWeight: 400 }}>
                    {" · "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                  </span>
                )}
              </h3>
              {(it.startDate || it.endDate || it.current) && (
                <span
                  className="text-[0.85em] italic"
                  style={{ color: CREAM_DIM, fontFamily: SERIF }}
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
                className="text-[0.85em] italic"
                style={{ color: CREAM_DIM, fontFamily: SERIF }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.techStack`} value={it.techStack} placeholder="Tech stack" />
              </div>
            )}
            <MidnightBullets
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

function MidnightEducation({
  section,
  design,
  data,
}: {
  section: EducationSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const GOLD = data.design.accentColor;
  const CREAM = data.design.textColor;
  const CREAM_DIM = data.design.secondaryColor;
  const SERIF = `${data.design.bodyFont || "EB Garamond"}, 'Source Serif 4', serif`;
  const TITLE_SERIF = `${data.design.titleFont || "EB Garamond"}, 'Source Serif 4', serif`;
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-2">
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
              <span
                className="text-[1em]"
                style={{
                  color: CREAM,
                  fontFamily: TITLE_SERIF,
                  fontWeight: 600,
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.degree`} value={it.degree} placeholder="Degree" />
                {it.field ? `, ${it.field || "Field of study"}` : ""}
                <span
                  className="ml-2 italic"
                  style={{ color: GOLD, fontWeight: 500 }}
                >
                  <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.institution`} value={it.institution} placeholder="Institution" />
                </span>
              </span>
              <span
                className="text-[0.85em] italic"
                style={{ color: CREAM_DIM, fontFamily: SERIF }}
              >
                {formatDateRange(
                  it.startDate,
                  it.endDate,
                  it.current,
                  design.dateFormat,
                )}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MidnightSkills({
  section,
  data,
}: {
  section: SkillsSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const GOLD = data.design.accentColor;
  const CREAM = data.design.textColor;
  const CREAM_DIM = data.design.secondaryColor;
  const SERIF = `${data.design.bodyFont || "EB Garamond"}, 'Source Serif 4', serif`;
  const items = section.items.filter((i) => i.visible);
  if (items.length === 0) return null;
  // Old-money CVs don't do chip clusters. Render as italicized comma-list.
  const groups = new Map<string, typeof items>();
  for (const s of items) {
    const key = s.group || "Skills";
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }
  return (
    <div className="space-y-1.5 text-[0.95em]" style={{ fontFamily: SERIF }}>
      {[...groups.entries()].map(([group, list]) => (
        <div key={group} className="flex gap-3">
          {groups.size > 1 && (
            <span
              className="w-32 shrink-0 italic"
              style={{ color: GOLD }}
            >
              {group}
            </span>
          )}
          <span style={{ color: CREAM }}>
            {list.map((s, i) => {
              const id = `section.${section.id}.item.${s.id}`;
              return (
                <span key={s.id}>
                  {i > 0 && <span style={{ color: CREAM_DIM }}>, </span>}
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
          </span>
        </div>
      ))}
    </div>
  );
}

function MidnightCerts({
  section,
  data,
}: {
  section: CertificationsSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const GOLD = data.design.accentColor;
  const CREAM = data.design.textColor;
  const CREAM_DIM = data.design.secondaryColor;
  const SERIF = `${data.design.bodyFont || "EB Garamond"}, 'Source Serif 4', serif`;
  const items = section.items.filter((i) => i.visible);
  return (
    <div
      className="space-y-1.5 text-[0.95em]"
      style={{ color: CREAM, fontFamily: SERIF }}
    >
      {items.map((c) => {
        const id = `section.${section.id}.item.${c.id}`;
        return (
          <div
            key={c.id}
            data-element-id={id}
            className="flex cursor-grab items-baseline justify-between gap-3 rounded-sm"
            style={elementStyle(data, id)}
          >
            <span>
              <span style={{ fontWeight: 600 }}><EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.name`} value={c.name} placeholder="Name" /></span>
              {c.issuer && (
                <span style={{ color: GOLD, fontStyle: "italic" }}>
                  {" — "}
                  <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.issuer`} value={c.issuer} placeholder="Issuer" />
                </span>
              )}
            </span>
            {c.date && (
              <span
                className="text-[0.85em] italic"
                style={{ color: CREAM_DIM }}
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

function MidnightFallback({
  section,
  design,
  data,
}: {
  section: Section;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const CREAM = data.design.textColor;
  const SERIF = `${data.design.bodyFont || "EB Garamond"}, 'Source Serif 4', serif`;
  if ("body" in section && (section as { body?: string }).body) {
    const id = `section.${section.id}.body`;
    return (
      <p
        data-element-id={id}
        className="cursor-text whitespace-pre-wrap text-[0.95em]"
        style={{
          color: CREAM,
          fontFamily: SERIF,
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
        <MidnightBullets
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

function MidnightBullets({
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
  const GOLD = data.design.accentColor;
  const CREAM = data.design.textColor;
  const SERIF = `${data.design.bodyFont || "EB Garamond"}, 'Source Serif 4', serif`;
  const list = visibleBullets(bullets);
  if (list.length === 0) return null;
  // Honour the user's bulletStyle choice exactly. Earlier code force-
  // swapped "disc" → "▪" so picking Disc rendered squares — confusing.
  // Defaults handle the FT / Economist square aesthetic via bulletStyle:
  // "square" in Midnight's factory design.
  const glyph = bulletGlyph(design);
  return (
    <ul
      className="mt-1.5 space-y-1 text-[0.95em]"
      style={{ color: CREAM, fontFamily: SERIF }}
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
                className="select-none text-[0.85em] leading-[1.5]"
                style={{ color: GOLD }}
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
