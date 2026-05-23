/**
 * Obsidian — pure black, italic Fraunces, electric purple. Power-user.
 *
 * Visual character:
 *   - Hardcoded #0a0a0a page (pure-black-ish — true #000 reads as broken
 *     monitor on most screens; #0a0a0a is the OLED-true-black that ships
 *     in every modern dark-mode design system).
 *   - Italic Fraunces serif name at a massive 4em — instantly editorial,
 *     instantly different from every sans-serif dark template.
 *   - Electric purple #a78bfa (Tailwind violet-400) accent on bullets,
 *     section heads, and links. The shade is bright enough to glow
 *     against the black without being aggressive.
 *   - Inter for body at 0.9em — denser than Aurora because the dark
 *     reduces apparent x-height; the smaller size compensates.
 *   - Long thin section heads with NO rule beneath — the title floats,
 *     spaced way away from the body. Reads as "I read deeply."
 *   - Body color #e5e5e5 (off-white). Pure white on black is too sharp
 *     for sustained reading.
 *
 * Industry-fit: senior ICs at AI labs, infosec / security researchers,
 * dev tool founders, indie hackers with a Twitter following. The CV that
 * says "I take my craft personally."
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

// CSS-var indirection so the Design-tab pickers drive every Obsidian
// surface. ObsidianTemplate sets --obs-page / --obs-accent / --obs-text
// (and their alpha-suffix variants) on a wrapper div at render time;
// these consts then resolve to var() references that pick up whatever
// data.design.* is currently set to. defaultDesignForTemplate("obsidian")
// seeds the original #0a0a0a / #a78bfa / #e5e5e5 identity on first
// template select; from there the pickers own it.
const BLACK = "var(--obs-page)";
const PURPLE = "var(--obs-accent)";
const OFF_WHITE = "var(--obs-text)";

export function ObsidianTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  // Force the page background and body color to the Obsidian identity. The
  // user can still set design.textColor through the Design tab and it will
  // flow through to body text via the inline styles below — but the page
  // background and the giant italic name color are intentionally fixed.
  // Trust the user's design values — defaultDesignForTemplate("obsidian")
  // seeds the initial palette and the Design tab's pickers control bg +
  // text from there. The earlier `themed` override clobbered picker
  // dispatches on every render.
  // CSS-var palette (full alphas pre-computed) so every nested element
  // can use var(--obs-accent), var(--obs-text-77), etc. without prop-
  // drilling. The bare names cover full-opacity usages; the alpha-
  // suffix vars cover the `${X}NN` hex-with-alpha patterns that can't
  // mix with var() at the CSS-string level.
  const paletteVars = {
    "--obs-page": design.pageBg,
    "--obs-accent": design.accentColor,
    "--obs-text": design.textColor,
    "--obs-accent-22": `${design.accentColor}22`,
    "--obs-accent-55": `${design.accentColor}55`,
    "--obs-accent-66": `${design.accentColor}66`,
    "--obs-text-66": `${design.textColor}66`,
    "--obs-text-77": `${design.textColor}77`,
    "--obs-text-88": `${design.textColor}88`,
    "--obs-text-99": `${design.textColor}99`,
    "--obs-text-aa": `${design.textColor}aa`,
  } as React.CSSProperties;

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
     <div style={paletteVars}>
      <header
        data-section-id="personal"
        className="mb-12 cursor-pointer pb-6"
        style={{ borderBottom: `1px solid var(--obs-accent-22)` }}
      >
        <div className="flex items-end justify-between gap-6">
          <div className="flex-1">
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text leading-[0.95]"
              style={{
                color: OFF_WHITE,
                fontFamily: `${design.titleFont || "Fraunces"}, 'Source Serif 4', serif`,
                fontWeight: 400,
                fontStyle: "italic",
                fontSize: "4em",
                letterSpacing: "-0.03em",
                ...elementStyle(data, "personal.name"),
              }}
            >
              {personal.fullName || "Your name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-3 block w-fit cursor-text text-[0.9em] uppercase"
                style={{
                  color: PURPLE,
                  fontFamily: `${design.bodyFont || "Inter"}, sans-serif`,
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
            <ObsidianContact data={data} />
          </div>
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
                  className="h-24 w-24 rounded-full object-cover"
                  style={{
                    // box-shadow + design.photo.borderColor override (Design → Photo → Border)
                    boxShadow: `0 0 0 3px transparent, 0 0 0 ${design.photo.borderWidth ?? 4.5}px ${design.photo.borderColor || "var(--obs-accent-66)"}`,
                  }}
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
        </div>
      </header>

      <div className="space-y-9">
        {visible.map((s) => {
          const d = resolveDesign(design, s);
          return (
            <ObsidianSection key={s.id} section={s} design={d} data={data} />
          );
        })}
      </div>
     </div>
    </TemplateFrame>
  );
}

function ObsidianContact({ data }: { data: ResumeData }) {
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
      className="mt-4 text-[0.85em]"
      style={{
        color: `var(--obs-text-99)`,
        fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
      }}
    >
      {items.map((it, i) => (
        <span key={it.id}>
          {i > 0 && (
            <span className="mx-2" style={{ color: `var(--obs-accent-55)` }}>
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
              style={{ color: PURPLE, ...elementStyle(data, it.id) }}
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

function ObsidianSection({
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
      {/* Long thin head — way more vertical breathing room than other
          templates. Reads as "I have nothing to prove." */}
      <h2
        data-element-id={titleId}
        className="mb-5 inline-block cursor-text text-[0.78em] uppercase"
        style={{
          color: PURPLE,
          fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
          fontWeight: 500,
          letterSpacing: "0.28em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <ObsidianBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function ObsidianBody({
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
          className="cursor-text whitespace-pre-wrap text-[0.95em] leading-[1.6]"
          style={{
            color: OFF_WHITE,
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
      return (
        <ObsidianExperience section={section} design={design} data={data} />
      );
    case "projects":
      return <ObsidianProjects section={section} design={design} data={data} />;
    case "education":
      return (
        <ObsidianEducation section={section} design={design} data={data} />
      );
    case "skills":
      return <ObsidianSkills section={section} design={design} data={data} />;
    case "certifications":
      return <ObsidianCerts section={section} design={design} data={data} />;
    default:
      return (
        <ObsidianFallback section={section} design={design} data={data} />
      );
  }
}

function ObsidianExperience({
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
    <div className="space-y-5">
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
                className="text-[1.05em]"
                style={{
                  color: OFF_WHITE,
                  fontFamily: "var(--cv-title-font, var(--font-fraunces, 'Fraunces'), serif)",
                  fontWeight: 500,
                  fontStyle: "italic",
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                {it.company && (
                  <span style={{ color: `var(--obs-text-aa)`, fontStyle: "normal" }}>
                    {" — "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.company`} value={it.company} placeholder="Company" />
                  </span>
                )}
              </h3>
              <span
                className="text-[0.78em]"
                style={{
                  color: `var(--obs-text-77)`,
                  fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
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
                style={{ color: `var(--obs-text-66)` }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.location`} value={it.location} placeholder="Location" />
              </div>
            )}
            <ObsidianBullets
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

function ObsidianProjects({
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
                  color: OFF_WHITE,
                  fontFamily: "var(--cv-title-font, var(--font-fraunces, 'Fraunces'), serif)",
                  fontWeight: 500,
                }}
              >
                {it.url ? (
                  <a
                    href={it.url.startsWith("http") ? it.url : `https://${it.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline"
                    style={{ color: PURPLE }}
                  >
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.name`} value={it.name} placeholder="Name" />
                  </a>
                ) : (
                  it.name
                )}
                {it.role && (
                  <span style={{ color: `var(--obs-text-99)`, fontWeight: 400 }}>
                    {" · "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                  </span>
                )}
              </h3>
              {(it.startDate || it.endDate || it.current) && (
                <span
                  className="text-[0.78em]"
                  style={{ color: `var(--obs-text-77)` }}
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
                style={{ color: `var(--obs-text-77)` }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.techStack`} value={it.techStack} placeholder="Tech stack" />
              </div>
            )}
            <ObsidianBullets
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

function ObsidianEducation({
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
                  color: OFF_WHITE,
                  fontFamily: "var(--cv-title-font, var(--font-fraunces, 'Fraunces'), serif)",
                  fontStyle: "italic",
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.degree`} value={it.degree} placeholder="Degree" />
                {it.field ? `, ${it.field || "Field of study"}` : ""}
              </span>
              <span
                className="ml-2 text-[0.85em]"
                style={{ color: `var(--obs-text-99)` }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.institution`} value={it.institution} placeholder="Institution" />
              </span>
            </div>
            <span
              className="text-[0.78em]"
              style={{ color: `var(--obs-text-77)` }}
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

function ObsidianSkills({
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
                color: PURPLE,
                fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
                fontWeight: 500,
                letterSpacing: "0.18em",
              }}
            >
              {group}
            </div>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.9em]">
            {list.map((s, i) => {
              const id = `section.${section.id}.item.${s.id}`;
              return (
                <span key={s.id}>
                  {i > 0 && (
                    <span style={{ color: `var(--obs-accent-55)` }} className="mr-3">
                      ◆
                    </span>
                  )}
                  <span
                    data-element-id={id}
                    className="cursor-grab rounded-sm"
                    style={{ color: OFF_WHITE, ...elementStyle(data, id) }}
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

function ObsidianCerts({
  section,
  data,
}: {
  section: CertificationsSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-1.5 text-[0.9em]" style={{ color: OFF_WHITE }}>
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
              <span
                style={{
                  fontWeight: 500,
                  fontFamily: "var(--cv-title-font, var(--font-fraunces, 'Fraunces'), serif)",
                  fontStyle: "italic",
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.name`} value={c.name} placeholder="Name" />
              </span>
              {c.issuer && (
                <span style={{ color: `var(--obs-text-88)` }}>
                  {" · "}
                  <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.issuer`} value={c.issuer} placeholder="Issuer" />
                </span>
              )}
            </span>
            {c.date && (
              <span
                className="text-[0.82em]"
                style={{ color: `var(--obs-text-77)` }}
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

function ObsidianFallback({
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
        style={{ color: OFF_WHITE, ...elementStyle(data, id) }}
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
        <ObsidianBullets
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

function ObsidianBullets({
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
  // We respect the user's bullet style choice but default to ◆ (diamond)
  // when set to disc — fits the Obsidian power-user aesthetic better than
  // a round dot.
  const glyph =
    design.bulletStyle === "disc" ? "◆" : bulletGlyph(design);
  return (
    <ul className="mt-1.5 space-y-1 text-[0.9em]">
      {list.map((b) => {
        const id = `section.${sectionId}.bullet.${b.id}`;
        return (
          <li
            key={b.id}
            data-element-id={id}
            className="flex cursor-grab gap-2 rounded-sm"
            style={{ color: OFF_WHITE, ...elementStyle(data, id) }}
          >
            {glyph && (
              <span
                className="select-none text-[0.8em] leading-[1.4]"
                style={{ color: PURPLE }}
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
