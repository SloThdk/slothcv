/**
 * Onyx — designer's dark mode. Magenta-cyan radial gradient mesh.
 *
 * Visual character:
 *   - Hardcoded #09090b page (zinc-950, the AI-startup landing-page black).
 *   - The defining feature: a low-opacity radial gradient mesh painted as
 *     a CSS background-image overlay across the WHOLE page — magenta in
 *     the upper-left, cyan in the lower-right, both transparent at the
 *     center. Reads as a Stripe / Linear / Vercel hero section bleeding
 *     onto a CV.
 *   - White Fraunces serif name in 3.4em — the gradient mesh provides the
 *     visual richness, so the type can stay restrained.
 *   - Pink #e879f9 (fuchsia-400) accent on links + headings — sits in the
 *     middle of the gradient palette, so it always feels integrated.
 *   - Inter for body. Body color #fafafa (zinc-50).
 *   - Section heads in a small uppercase form, no rule beneath — the
 *     gradient mesh IS the decoration.
 *
 * Industry-fit: Designers, brand strategists, creative directors at
 * AI / dev tool / Web3 startups. The CV that says "I'm in your Discord."
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

// CSS-var indirection so every Design-tab picker drives the Onyx
// surface. OnyxTemplate sets these vars on a wrapper at render time;
// the consts resolve to var() references that read data.design.*.
// defaultDesignForTemplate("onyx") seeds the original #09090b / #e879f9
// / #fafafa identity on first template select.
const BLACK = "var(--ony-page)";
const PINK = "var(--ony-accent)";
const TEXT = "var(--ony-text)";
const TEXT_DIM = "var(--ony-secondary)";

// The gradient mesh is the soul of this template — uses the accent
// alpha 33 for the primary radial. Cyan and violet stops stay
// hardcoded as derived identity (they're decorative, not user-bound).
const MESH_BG = `
  radial-gradient(at 20% 20%, var(--ony-accent-33) 0%, transparent 45%),
  radial-gradient(at 80% 80%, #06b6d433 0%, transparent 50%),
  radial-gradient(at 50% 0%, #a78bfa1f 0%, transparent 35%)
`;

export function OnyxTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  // Trust the user's design values. defaultDesignForTemplate("onyx") seeds
  // the initial palette (BLACK page, TEXT ink); the Design tab's pickers
  // control page bg + text color directly from there. Earlier a `themed`
  // override clobbered picker dispatches every render.
  const paletteVars = {
    "--ony-page": design.pageBg,
    "--ony-accent": design.accentColor,
    "--ony-text": design.textColor,
    "--ony-secondary": design.secondaryColor,
    "--ony-accent-14": `${design.accentColor}14`,
    "--ony-accent-33": `${design.accentColor}33`,
    "--ony-accent-55": `${design.accentColor}55`,
    "--ony-accent-66": `${design.accentColor}66`,
  } as React.CSSProperties;

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
     <div style={paletteVars}>
      {/* Gradient mesh layer — sits absolutely behind everything. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: MESH_BG,
          // Low overall opacity so body text never fights with the mesh.
          opacity: 0.85,
        }}
      />
      {/* Content layer — stacked on top of the mesh via z-index. */}
      <div className="relative z-10">
        <header
          data-section-id="personal"
          className="mb-10 cursor-pointer pb-5"
          style={{ borderBottom: `1px solid var(--ony-accent-33)` }}
        >
          <div className="flex items-end justify-between gap-6">
            <div className="flex-1">
              <h1
                data-element-id="personal.name"
                className="block w-fit cursor-text leading-[1.0]"
                style={{
                  color: TEXT,
                  fontFamily: `${design.titleFont || "Fraunces"}, 'Source Serif 4', serif`,
                  fontSize: "3.4em",
                  fontWeight: 400,
                  letterSpacing: "-0.025em",
                  ...elementStyle(data, "personal.name"),
                }}
              >
                {personal.fullName || "Your name"}
              </h1>
              {personal.headline && (
                <p
                  data-element-id="personal.headline"
                  className="mt-2 block w-fit cursor-text text-[0.95em]"
                  style={{
                    color: PINK,
                    fontFamily: `${design.bodyFont || "Inter"}, sans-serif`,
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                    ...elementStyle(data, "personal.headline"),
                  }}
                >
                  {personal.headline}
                </p>
              )}
              <OnyxContact data={data} />
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
                  className="h-24 w-24 rounded-2xl object-cover"
                  style={{
                    // box-shadow + design.photo.borderColor override (Design → Photo → Border)
                    boxShadow: `0 0 0 2px transparent, 0 0 0 4px ${design.photo.borderColor || "var(--ony-accent-66)"}`,
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
              <OnyxSection key={s.id} section={s} design={d} data={data} />
            );
          })}
        </div>
      </div>
     </div>
    </TemplateFrame>
  );
}

function OnyxContact({ data }: { data: ResumeData }) {
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
      className="mt-3 text-[0.85em]"
      style={{
        color: TEXT_DIM,
        fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
      }}
    >
      {items.map((it, i) => (
        <span key={it.id}>
          {i > 0 && (
            <span className="mx-2" style={{ color: `var(--ony-accent-66)` }}>
              ◆
            </span>
          )}
          {it.href ? (
            <a
              data-element-id={it.id}
              href={it.href.startsWith("http") ? it.href : `https://${it.href}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${grab} underline-offset-2 hover:underline`}
              style={{ color: PINK, ...elementStyle(data, it.id) }}
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

function OnyxSection({
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
        className="mb-3 inline-block cursor-text text-[0.78em] uppercase"
        style={{
          color: PINK,
          fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
          fontWeight: 600,
          letterSpacing: "0.2em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <OnyxBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function OnyxBody({
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
            color: TEXT,
            fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Add a short summary."}
        </p>
      );
    }
    case "careerBreak":
    case "experience":
      return <OnyxExperience section={section} design={design} data={data} />;
    case "projects":
      return <OnyxProjects section={section} design={design} data={data} />;
    case "education":
      return <OnyxEducation section={section} design={design} data={data} />;
    case "skills":
      return <OnyxSkills section={section} design={design} data={data} />;
    case "certifications":
      return <OnyxCerts section={section} design={design} data={data} />;
    default:
      return <OnyxFallback section={section} design={design} data={data} />;
  }
}

function OnyxExperience({
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
                  color: TEXT,
                  fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
                  fontWeight: 600,
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                {it.company && (
                  <span style={{ color: PINK, fontWeight: 500 }}>
                    {" → "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.company`} value={it.company} placeholder="Company" />
                  </span>
                )}
              </h3>
              <span className="text-[0.82em]" style={{ color: TEXT_DIM }}>
                {formatDateRange(
                  it.startDate,
                  it.endDate,
                  it.current,
                  design.dateFormat,
                )}
              </span>
            </div>
            {it.location && (
              <div className="text-[0.82em]" style={{ color: TEXT_DIM }}>
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.location`} value={it.location} placeholder="Location" />
              </div>
            )}
            <OnyxBullets
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

function OnyxProjects({
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
                  color: TEXT,
                  fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
                  fontWeight: 600,
                }}
              >
                {it.url ? (
                  <a
                    href={it.url.startsWith("http") ? it.url : `https://${it.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline"
                    style={{ color: PINK }}
                  >
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.name`} value={it.name} placeholder="Name" />
                  </a>
                ) : (
                  it.name
                )}
                {it.role && (
                  <span style={{ color: TEXT_DIM, fontWeight: 400 }}>
                    {" · "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                  </span>
                )}
              </h3>
              {(it.startDate || it.endDate || it.current) && (
                <span className="text-[0.82em]" style={{ color: TEXT_DIM }}>
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
              <div className="text-[0.82em]" style={{ color: TEXT_DIM }}>
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.techStack`} value={it.techStack} placeholder="Tech stack" />
              </div>
            )}
            <OnyxBullets
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

function OnyxEducation({
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
                style={{ color: TEXT, fontWeight: 600 }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.degree`} value={it.degree} placeholder="Degree" />
                {it.field ? ` · ${it.field || "Field of study"}` : ""}
              </span>
              <span className="ml-2 text-[0.85em]" style={{ color: PINK }}>
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.institution`} value={it.institution} placeholder="Institution" />
              </span>
            </div>
            <span className="text-[0.82em]" style={{ color: TEXT_DIM }}>
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

function OnyxSkills({
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
    <div className="space-y-2">
      {[...groups.entries()].map(([group, list]) => (
        <div key={group}>
          {groups.size > 1 && (
            <div
              className="mb-1 text-[0.78em] uppercase"
              style={{
                color: PINK,
                fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
                fontWeight: 600,
                letterSpacing: "0.18em",
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
                  className="cursor-grab rounded-full px-2.5 py-0.5 text-[0.82em]"
                  style={{
                    background: `var(--ony-accent-14)`,
                    border: `1px solid var(--ony-accent-55)`,
                    color: TEXT,
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

function OnyxCerts({
  section,
  data,
}: {
  section: CertificationsSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-1.5 text-[0.9em]" style={{ color: TEXT }}>
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
                <span style={{ color: TEXT_DIM }}>
                  {" · "}
                  <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.issuer`} value={c.issuer} placeholder="Issuer" />
                </span>
              )}
            </span>
            {c.date && (
              <span className="text-[0.82em]" style={{ color: TEXT_DIM }}>
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.date`} value={c.date} placeholder="Date" />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function OnyxFallback({
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
        style={{ color: TEXT, ...elementStyle(data, id) }}
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
        <OnyxBullets
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

function OnyxBullets({
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
  const glyph = bulletGlyph(design);
  return (
    <ul
      className="mt-1.5 space-y-1 text-[0.92em]"
      style={{ color: TEXT, fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)" }}
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
                style={{ color: PINK }}
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
