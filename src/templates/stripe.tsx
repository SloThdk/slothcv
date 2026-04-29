/**
 * Stripe — fintech-corporate. Indigo + lavender, soft gradients.
 *
 * Visual character:
 *   - Stripe's signature indigo #635bff and a complementary lavender-mist
 *     accent applied as a soft horizontal linear-gradient on every section
 *     head — fades from indigo10 to transparent at 60%.
 *   - Inter throughout, headings letter-spacing -0.01em (Stripe's exact
 *     production setting), tracked-tight numerals.
 *   - Date format inline italic — reads "polite financial".
 *   - Bullet glyph respects the user's choice but defaults to a small
 *     square dot in indigo to mirror Stripe.com's roadmap pages.
 *   - White page (Stripe's brand identity is a clean white surface).
 *   - Section cards float on the page, no borders — the gradient is the
 *     decoration.
 *
 * Industry-fit: fintech engineers, payments / SaaS PMs, growth analysts.
 * The CV that says "I understand revenue mechanics."
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

// Stripe's brand indigo. Hardcoded — the indigo is intrinsic to the Stripe
// identity. Customise via the Design tab if you want a different palette;
// you can also just switch to Linear or Helvetica.
const INDIGO = "#635bff";

export function StripeTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <header
        data-section-id="personal"
        className="mb-7 cursor-pointer pb-5"
        style={{
          background: `linear-gradient(90deg, ${INDIGO}10, transparent 70%)`,
          borderRadius: "12px",
          padding: "16px 18px",
          margin: "0 -18px 28px -18px",
        }}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.5em] leading-[1.05] transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
              style={{
                color: design.textColor,
                fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                ...elementStyle(data, "personal.name"),
              }}
            >
              {personal.fullName || "Your name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-1 block w-fit cursor-text text-[1em] transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
                style={{
                  color: INDIGO,
                  fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
            <StripeContact data={data} />
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
                className="h-20 w-20 rounded-full object-cover"
                style={{
                  outline: `2px solid ${INDIGO}33`,
                  outlineOffset: "2px",
                }}
              />
            </div>
          )}
        </div>
      </header>

      <div className="space-y-7">
        {visible.map((s) => {
          const d = resolveDesign(design, s);
          return (
            <StripeSection key={s.id} section={s} design={d} data={data} />
          );
        })}
      </div>
    </TemplateFrame>
  );
}

function StripeContact({ data }: { data: ResumeData }) {
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

function StripeSection({
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
      className="group relative cursor-pointer break-inside-avoid rounded-md transition-shadow hover:ring-2 hover:ring-neutral-900/10"
    >
      <div
        className="mb-3 flex items-center gap-2 rounded-md px-2 py-1.5"
        style={{
          background: `linear-gradient(90deg, ${INDIGO}1f, transparent 60%)`,
          margin: "0 -8px 12px -8px",
        }}
      >
        <span
          aria-hidden
          className="inline-block h-3 w-1 rounded-full"
          style={{ background: INDIGO }}
        />
        <h2
          data-element-id={titleId}
          className="cursor-text text-[0.95em] transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
          style={{
            color: design.textColor,
            fontFamily: "var(--font-inter, 'Inter'), sans-serif",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            ...elementStyle(data, titleId),
          }}
        >
          <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
        </h2>
      </div>
      <StripeBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function StripeBody({
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
          className="cursor-text whitespace-pre-wrap text-[0.95em] leading-[1.55] transition-shadow hover:ring-2 hover:ring-neutral-900/15"
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
      return <StripeExperience section={section} design={design} data={data} />;
    case "projects":
      return <StripeProjects section={section} design={design} data={data} />;
    case "education":
      return <StripeEducation section={section} design={design} data={data} />;
    case "skills":
      return <StripeSkills section={section} design={design} data={data} />;
    case "certifications":
      return <StripeCerts section={section} design={design} data={data} />;
    default:
      return <StripeFallback section={section} design={design} data={data} />;
  }
}

function StripeExperience({
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
                  letterSpacing: "-0.01em",
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                {it.company && (
                  <span style={{ color: INDIGO, fontWeight: 500 }}>
                    {" · "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.company`} value={it.company} placeholder="Company" />
                  </span>
                )}
              </h3>
              <span
                className="text-[0.85em] italic"
                style={{ color: `${design.textColor}88` }}
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
            <StripeBullets
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

function StripeProjects({
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
                  letterSpacing: "-0.01em",
                }}
              >
                {it.url ? (
                  <a
                    href={it.url.startsWith("http") ? it.url : `https://${it.url}`}
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
                  <span style={{ color: `${design.textColor}88`, fontWeight: 400 }}>
                    {" · "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                  </span>
                )}
              </h3>
              {(it.startDate || it.endDate || it.current) && (
                <span
                  className="text-[0.85em] italic"
                  style={{ color: `${design.textColor}88` }}
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
                style={{ color: `${design.textColor}88` }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.techStack`} value={it.techStack} placeholder="Tech stack" />
              </div>
            )}
            <StripeBullets
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

function StripeEducation({
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
                style={{ color: design.textColor, fontWeight: 600 }}
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
              className="text-[0.85em] italic"
              style={{ color: `${design.textColor}88` }}
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

function StripeSkills({
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
    <div className="space-y-2.5">
      {[...groups.entries()].map(([group, list]) => (
        <div key={group}>
          {groups.size > 1 && (
            <div
              className="mb-1 text-[0.78em] uppercase"
              style={{
                color: INDIGO,
                fontFamily: "var(--font-inter, 'Inter'), sans-serif",
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
                  className="cursor-grab rounded-md px-2.5 py-0.5 text-[0.82em] transition-shadow hover:ring-2 hover:ring-neutral-900/20"
                  style={{
                    background: `linear-gradient(135deg, ${INDIGO}1a, ${INDIGO}08)`,
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

function StripeCerts({
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
                className="text-[0.82em] italic"
                style={{ color: `${design.textColor}88` }}
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

function StripeFallback({
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
        <StripeBullets
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

function StripeBullets({
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
