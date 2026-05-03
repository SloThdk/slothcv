/**
 * Atelier — fashion / art / curator CV. Where Mayfair is "London barrister",
 * Atelier is "ICA opening, gallery brochure, Margiela appendix".
 *
 * Visual character:
 *   - Cream `#fdf6e3` warm paper background — Atelier identity, locks
 *   - Brown `#451a03` text (warm dark, NOT black) — reads paper-and-ink
 *   - Mix of Caslon-flavored serif (Fraunces) for the name + section heads,
 *     Inter sans for body — the "high editorial" pairing fashion magazines
 *     use
 *   - A single sketched brush-stroke SVG behind the name (low opacity, terra
 *     cotta) — Atelier's painterly accent. Subtle enough to print without
 *     overpowering, intrinsic to identity
 *   - Section heads in expressive italic Fraunces, no rule beneath
 *   - WIDE outer whitespace via px-12 wrapper, generous gaps between
 *     sections
 *   - Single column, centered name, asymmetric body — the gallery-program
 *     feel
 *   - No photo (fashion CVs put image in the lookbook, not the CV)
 *
 * Industry-fit: art directors, fashion designers, gallerists, curators,
 * stylists, prop masters. Anyone where "tastemaker" is the role and the
 * CV's job is to PROVE it.
 *
 * Hardcoded warm-cream + brown + terra cotta = Atelier identity.
 */

"use client";

import { TemplateFrame } from "./frame";
import { SectionActions } from "./section-actions";
import {
  elementStyle,
  formatDateRange,
  positionStyle,
  visibleBullets,
  visibleSections,
} from "./shared";
import type {
  Bullet,
  ExperienceSection,
  GlobalDesign,
  ResumeData,
  Section,
} from "@/types/resume";
import { EditableFallback, EditableSectionTitle } from "./components";

const CREAM = "#fdf6e3";
const BROWN = "#451a03";
const TERRA = "#c2410c";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function AtelierTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Cream wash overrides design.pageBg for Atelier's identity. */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: CREAM }}
        aria-hidden
      />
      <div className="relative px-8">
        {/* Header — name centered, brush-stroke SVG behind it as decoration. */}
        <header
          data-section-id="personal"
          className="relative mb-10 cursor-pointer pt-4 text-center"
        >
          <BrushStroke />
          <h1
            data-element-id="personal.name"
            className="relative mx-auto block w-fit cursor-text text-[3em] leading-[1.05] tracking-tight"
            style={{
              color: BROWN,
              fontFamily:
                "var(--font-fraunces, 'Fraunces'), 'EB Garamond', serif",
              fontWeight: 400,
              fontStyle: "italic",
              ...elementStyle(data, "personal.name"),
            }}
          >
            {personal.fullName || "Your Name"}
          </h1>
          {personal.headline && (
            <p
              data-element-id="personal.headline"
              className="relative mx-auto mt-2 block w-fit cursor-text text-[0.82em] uppercase"
              style={{
                color: TERRA,
                fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                fontWeight: 600,
                letterSpacing: "0.32em",
                ...elementStyle(data, "personal.headline"),
              }}
            >
              {personal.headline}
            </p>
          )}
          <AtelierContact data={data} />
        </header>

        <div className="space-y-7">
          {visible.map((s) => (
            <AtelierSection
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

/** Sketched brush-stroke SVG behind the name. Single-pass watercolor feel
 *  via two semi-transparent paths offset by a few px. Painterly, not
 *  geometric — the Atelier signature. Low z-index, low opacity. */
function BrushStroke() {
  return (
    <svg
      viewBox="0 0 600 90"
      className="pointer-events-none absolute inset-x-0 top-2 mx-auto h-16 w-[420px] max-w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M40 50 Q 150 18 280 35 T 540 45 Q 460 62 320 58 T 60 65 Z"
        fill={TERRA}
        opacity="0.18"
      />
      <path
        d="M50 52 Q 180 28 300 42 T 520 50"
        stroke={TERRA}
        strokeWidth="2"
        fill="none"
        opacity="0.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AtelierContact({ data }: { data: ResumeData }) {
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
    <p
      className="relative mt-3 text-[0.85em]"
      style={{
        color: BROWN,
        fontFamily: "var(--font-inter, 'Inter'), sans-serif",
      }}
    >
      {items.map((p, i) => (
        <span key={p.id}>
          {i > 0 && <span className="mx-2 opacity-40">/</span>}
          {p.href ? (
            <a
              data-element-id={p.id}
              href={p.href.startsWith("http") ? p.href : `https://${p.href}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${grab} underline-offset-4 hover:underline`}
              style={{ color: TERRA, ...elementStyle(data, p.id) }}
            >
              {p.label}
            </a>
          ) : (
            <span
              data-element-id={p.id}
              className={grab}
              style={elementStyle(data, p.id)}
            >
              {p.label}
            </span>
          )}
        </span>
      ))}
    </p>
  );
}

function AtelierSection({
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
        className="mb-3 inline-block cursor-text text-[1.4em] italic"
        style={{
          color: TERRA,
          fontFamily: "var(--font-fraunces, 'Fraunces'), serif",
          fontWeight: 400,
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <AtelierBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function AtelierBody({
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
          className="cursor-text text-[0.98em] leading-[1.65]"
          style={{
            color: BROWN,
            fontFamily: "var(--font-inter, 'Inter'), sans-serif",
            fontWeight: 400,
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Add an artist statement."}
        </p>
      );
    }
    case "experience":
      return (
        <AtelierExperience section={section} design={design} data={data} />
      );
    default:
      return <AtelierFallback section={section} data={data} />;
  }
}

function AtelierExperience({
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
            className="cursor-grab rounded-sm"
            style={elementStyle(data, id)}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3
                className="text-[1.05em]"
                style={{
                  color: BROWN,
                  fontFamily: "var(--font-fraunces, 'Fraunces'), serif",
                  fontWeight: 500,
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                {it.company && (
                  <span
                    className="italic"
                    style={{ color: TERRA, fontWeight: 400 }}
                  >
                    {" at "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.company`} value={it.company} placeholder="Company" />
                  </span>
                )}
              </h3>
              <span
                className="text-[0.82em]"
                style={{
                  color: `${BROWN}88`,
                  fontFamily: "var(--font-inter, 'Inter'), sans-serif",
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
                style={{
                  color: `${BROWN}77`,
                  fontFamily: "var(--font-fraunces, 'Fraunces'), serif",
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.location`} value={it.location} placeholder="Location" />
              </div>
            )}
            <AtelierBullets
              bullets={it.bullets}
              data={data}
              sectionId={section.id}
            />
          </article>
        );
      })}
    </div>
  );
}

function AtelierBullets({
  bullets,
  data,
  sectionId,
}: {
  bullets: Bullet[];
  data: ResumeData;
  sectionId: string;
}) {
  const list = visibleBullets(bullets);
  if (list.length === 0) return null;
  return (
    <ul
      className="mt-1.5 space-y-1 pl-3 text-[0.95em] leading-[1.55]"
      style={{
        color: BROWN,
        fontFamily: "var(--font-inter, 'Inter'), sans-serif",
      }}
    >
      {list.map((b) => {
        const id = `section.${sectionId}.bullet.${b.id}`;
        return (
          <li
            key={b.id}
            data-element-id={id}
            className="flex cursor-text gap-2 rounded-sm"
            style={elementStyle(data, id)}
          >
            <span
              className="select-none"
              style={{ color: TERRA }}
              aria-hidden
            >
              ✦
            </span>
            <span className="flex-1 whitespace-pre-wrap">{b.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function AtelierFallback({
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
          color: BROWN,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          ...elementStyle(data, id),
        }}
      >
        {(section as { body: string }).body}
      </p>
    );
  }
  if ("items" in section) {
    const its = (section as {
      items: {
        id: string;
        name?: string;
        text?: string;
        proficiency?: string;
        visible: boolean;
      }[];
    }).items;
    const visible = its.filter((i) => i.visible);
    return (
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[0.95em]">
        {visible.map((it) => {
          const id = `section.${section.id}.item.${it.id}`;
          const label = it.name ?? it.text ?? "";
          return (
            <span
              key={it.id}
              data-element-id={id}
              className="cursor-grab rounded-sm"
              style={{
                color: BROWN,
                fontFamily:
                  "var(--font-fraunces, 'Fraunces'), serif",
                fontStyle: "italic",
                ...elementStyle(data, id),
              }}
            >
              {label}
              {it.proficiency && (
                <span style={{ color: `${BROWN}66` }}>
                  {" "}— <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.proficiency`} value={it.proficiency} placeholder="Proficiency" />
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  }
  return null;
}
