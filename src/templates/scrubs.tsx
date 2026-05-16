/**
 * Scrubs — medical / clinical CV. Hospital HR-portal-friendly without
 * looking like a bureaucratic Word doc.
 *
 * Visual character:
 *   - Pure white clinical bg (overrides design.pageBg) — sterility is
 *     the design language. Cyan `#0e7490` accent for headings, dividers,
 *     credential rings — reads "scrubs blue without being scrubs blue"
 *   - Source Serif 4 for the name; Inter for everything else — mixes
 *     clinical credibility (serif) with modern readability (sans)
 *   - Structured single column with the medical-CV CANONICAL section
 *     order: Education → Residency → Licenses → Publications →
 *     Procedures → Awards (other section types fold into the bottom)
 *   - Each license/cert renders in a small bordered CARD with state +
 *     license # + expiry — the format hospitals scan for
 *   - Section heads have a small caduceus-style glyph (•◦• unicode trio)
 *     before them — adds medical voice without an icon system
 *   - No photo (medical norm — hospitals skip avatars)
 *
 * Industry-fit: MDs, DOs, residents, fellows, NPs, PAs. Anyone whose
 * application packet needs license #s and board certifications visible
 * at a glance, with the expected order of evidence.
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
  CertificationsSection,
  EducationSection,
  CareerBreakSection,
  ExperienceSection,
  GlobalDesign,
  PublicationsSection,
  ResumeData,
  Section,
} from "@/types/resume";
import { EditableFallback, EditableSectionTitle } from "./components";

const CLINIC_WHITE = "#ffffff";
const CYAN = "#0e7490";
const INK = "#0c0a09";
const RULE = "#cffafe"; // Cyan-100 — soft enough for hairlines.

// Canonical medical-CV section order. The dispatcher pre-sorts visible
// sections by this priority so the doc reads like the format every
// hospital recruiter expects.
const MEDICAL_ORDER: Section["type"][] = [
  "summary",
  "education",
  "experience",
  "certifications",
  "publications",
  "skills",
  "languages",
  "awards",
  "talks",
  "volunteer",
  "projects",
  "hobbies",
  "references",
  "custom",
];

function medicalSort(a: Section, b: Section): number {
  return MEDICAL_ORDER.indexOf(a.type) - MEDICAL_ORDER.indexOf(b.type);
}

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function ScrubsTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  // Medical-canonical order: copy and sort so we don't mutate the store.
  const visible = [...visibleSections(data)].sort(medicalSort);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <div
        className="absolute inset-0 -z-10"
        style={{ background: CLINIC_WHITE }}
        aria-hidden
      />

      <header
        data-section-id="personal"
        className="mb-6 cursor-pointer pb-4"
        style={{ borderBottom: `2px solid ${CYAN}` }}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.4em] leading-[1.05] tracking-tight"
              style={{
                color: INK,
                fontFamily: "var(--cv-title-font, var(--font-source-serif-4, 'Source Serif 4'), 'EB Garamond', serif)",
                fontWeight: 600,
                ...elementStyle(data, "personal.name"),
              }}
            >
              {personal.fullName || "Your Name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-0.5 block w-fit cursor-text text-[0.95em]"
                style={{
                  color: CYAN,
                  fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
                  fontWeight: 600,
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
          </div>
          <ScrubsContact data={data} />
        </div>
      </header>

      <div className="space-y-5">
        {visible.map((s) => (
          <ScrubsSection key={s.id} section={s} design={design} data={data} />
        ))}
      </div>
    </TemplateFrame>
  );
}

function ScrubsContact({ data }: { data: ResumeData }) {
  const { personal } = data;
  return (
    <div
      className="text-right text-[0.85em]"
      style={{
        color: INK,
        fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
      }}
    >
      {personal.email && (
        <div
          data-element-id="personal.email"
          className="cursor-text rounded-sm"
          style={elementStyle(data, "personal.email")}
        >
          {personal.email}
        </div>
      )}
      {personal.phone && (
        <div
          data-element-id="personal.phone"
          className="cursor-text rounded-sm"
          style={elementStyle(data, "personal.phone")}
        >
          {personal.phone}
        </div>
      )}
      {personal.location && (
        <div
          data-element-id="personal.location"
          className="cursor-text rounded-sm"
          style={{
            color: `${INK}99`,
            ...elementStyle(data, "personal.location"),
          }}
        >
          {personal.location}
        </div>
      )}
      {personal.links.map((l) => {
        const id = `personal.links.${l.id}`;
        return (
          <a
            key={l.id}
            data-element-id={id}
            href={l.url.startsWith("http") ? l.url : `https://${l.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block cursor-text rounded-sm underline-offset-2 hover:underline"
            style={{ color: CYAN, ...elementStyle(data, id) }}
          >
            {l.label || l.url}
          </a>
        );
      })}
    </div>
  );
}

function ScrubsSection({
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
      <div className="mb-2 flex items-center gap-2">
        {/* Caduceus-flavored unicode glyph trio. Quiet, but reads "medical
            chart" rather than "tech CV". */}
        <span
          className="text-[0.85em]"
          style={{ color: `${CYAN}99` }}
          aria-hidden
        >
          •◦•
        </span>
        <h2
          data-element-id={titleId}
          className="inline-block cursor-text text-[0.95em] uppercase"
          style={{
            color: CYAN,
            fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
            fontWeight: 700,
            letterSpacing: "0.14em",
            ...elementStyle(data, titleId),
          }}
        >
          <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
        </h2>
        <span
          className="ml-1 h-px flex-1"
          style={{ background: RULE }}
          aria-hidden
        />
      </div>
      <ScrubsBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function ScrubsBody({
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
            color: INK,
            fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Add a clinical summary."}
        </p>
      );
    }
    case "careerBreak":
    case "experience":
      return (
        <ScrubsExperience section={section} design={design} data={data} />
      );
    case "education":
      return (
        <ScrubsEducation section={section} design={design} data={data} />
      );
    case "certifications":
      return (
        <ScrubsCertCards
          section={section}
          design={design}
          data={data}
        />
      );
    case "publications":
      return (
        <ScrubsPublications section={section} design={design} data={data} />
      );
    default:
      return <ScrubsFallback section={section} data={data} />;
  }
}

function ScrubsExperience({
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
    <div className="space-y-3">
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        return (
          <div
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm"
            style={elementStyle(data, id)}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3
                className="text-[1em]"
                style={{
                  color: INK,
                  fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
                  fontWeight: 700,
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                {it.company && (
                  <span style={{ color: CYAN, fontWeight: 500 }}>
                    {" — "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.company`} value={it.company} placeholder="Company" />
                  </span>
                )}
              </h3>
              <span
                className="text-[0.82em] tabular-nums"
                style={{
                  color: `${INK}88`,
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
                style={{ color: `${INK}77` }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.location`} value={it.location} placeholder="Location" />
              </div>
            )}
            <ScrubsBullets
              bullets={it.bullets}
              data={data}
              sectionId={section.id}
            />
          </div>
        );
      })}
    </div>
  );
}

function ScrubsEducation({
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
    <div className="space-y-3">
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        return (
          <div
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm"
            style={elementStyle(data, id)}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div
                className="text-[0.95em]"
                style={{
                  color: INK,
                  fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
                }}
              >
                <div className="font-bold">
                  <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.degree`} value={it.degree} placeholder="Degree" />
                  {it.field ? `, ${it.field || "Field of study"}` : ""}
                </div>
                <div style={{ color: CYAN, fontWeight: 500 }}>
                  <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.institution`} value={it.institution} placeholder="Institution" />
                  {it.location && (
                    <span style={{ color: `${INK}77`, fontWeight: 400 }}>
                      {" — "}
                      <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.location`} value={it.location} placeholder="Location" />
                    </span>
                  )}
                </div>
                {it.gpa && (
                  <div className="text-[0.82em]" style={{ color: `${INK}88` }}>
                    GPA: <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.gpa`} value={it.gpa} placeholder="GPA" />
                  </div>
                )}
              </div>
              <span
                className="text-[0.82em] tabular-nums"
                style={{ color: `${INK}88` }}
              >
                {formatDateRange(
                  it.startDate,
                  it.endDate,
                  it.current,
                  design.dateFormat,
                )}
              </span>
            </div>
            <ScrubsBullets
              bullets={it.bullets}
              data={data}
              sectionId={section.id}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Cert/license cards — bordered, two-row layout per item. The format
 *  hospital-credentialing departments need to scan: name + state +
 *  license# + expiry. Renders 2-up on wider pages, 1-up on narrow. */
function ScrubsCertCards({
  section,
  data,
}: {
  section: CertificationsSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {items.map((c) => {
        const id = `section.${section.id}.item.${c.id}`;
        return (
          <div
            key={c.id}
            data-element-id={id}
            className="cursor-grab rounded-md p-2.5 text-[0.85em]"
            style={{
              border: `1px solid ${CYAN}55`,
              background: `${CYAN}05`,
              color: INK,
              fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
              ...elementStyle(data, id),
            }}
          >
            <div className="font-bold" style={{ color: CYAN }}>
              <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.name`} value={c.name} placeholder="Name" />
            </div>
            <div style={{ color: `${INK}aa` }}>
              <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.issuer`} value={c.issuer} placeholder="Issuer" />
            </div>
            <div
              className="mt-1 grid grid-cols-2 gap-x-2 text-[0.82em] tabular-nums"
              style={{ color: `${INK}88` }}
            >
              {c.credentialId && (
                <div>
                  <span style={{ color: CYAN, fontWeight: 600 }}>ID:</span>{" "}
                  <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.credentialId`} value={c.credentialId} placeholder="Credential ID" />
                </div>
              )}
              {c.date && (
                <div>
                  <span style={{ color: CYAN, fontWeight: 600 }}>Issued:</span>{" "}
                  <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.date`} value={c.date} placeholder="Date" />
                </div>
              )}
              {c.expiry && (
                <div className="col-span-2">
                  <span style={{ color: CYAN, fontWeight: 600 }}>Expires:</span>{" "}
                  <EditableFallback data={data} fieldId={`section.${section.id}.item.${c.id}.expiry`} value={c.expiry} placeholder="Expires" />
                </div>
              )}
            </div>
            {c.url && (
              <a
                href={c.url.startsWith("http") ? c.url : `https://${c.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-[0.78em] underline-offset-2 hover:underline"
                style={{ color: CYAN }}
              >
                Verify
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScrubsPublications({
  section,
  data,
}: {
  section: PublicationsSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <ol className="space-y-1.5 text-[0.9em]">
      {items.map((p, i) => {
        const id = `section.${section.id}.item.${p.id}`;
        return (
          <li
            key={p.id}
            data-element-id={id}
            className="grid cursor-grab grid-cols-[2.2em_1fr] gap-1 rounded-sm"
            style={{
              color: INK,
              fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
              ...elementStyle(data, id),
            }}
          >
            <span
              className="text-right tabular-nums"
              style={{ color: CYAN, fontWeight: 700 }}
            >
              {i + 1}.
            </span>
            <span className="leading-[1.5]">
              {p.authors && (
                <span style={{ color: `${INK}aa` }}><EditableFallback data={data} fieldId={`section.${section.id}.item.${p.id}.authors`} value={p.authors} placeholder="Authors" />. </span>
              )}
              <span className="font-semibold"><EditableFallback data={data} fieldId={`section.${section.id}.item.${p.id}.title`} value={p.title} placeholder="Title" />.</span>
              {p.venue && <span className="italic"> <EditableFallback data={data} fieldId={`section.${section.id}.item.${p.id}.venue`} value={p.venue} placeholder="Venue" />.</span>}
              {p.date && <span> (<EditableFallback data={data} fieldId={`section.${section.id}.item.${p.id}.date`} value={p.date} placeholder="Date" />).</span>}
              {p.url && (
                <>
                  {" "}
                  <a
                    href={p.url.startsWith("http") ? p.url : `https://${p.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: CYAN }}
                    className="underline-offset-2 hover:underline"
                  >
                    PMID
                  </a>
                </>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ScrubsBullets({
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
      className="mt-1 space-y-0.5 pl-3 text-[0.92em] leading-[1.5]"
      style={{
        color: INK,
        fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
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
              style={{ color: CYAN, fontWeight: 700 }}
              aria-hidden
            >
              +
            </span>
            <span className="flex-1 whitespace-pre-wrap">{b.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function ScrubsFallback({
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
          color: INK,
          fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
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
      <ul
        className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[0.92em]"
        style={{
          color: INK,
          fontFamily: "var(--cv-body-font, var(--font-inter, 'Inter'), sans-serif)",
        }}
      >
        {visible.map((it) => {
          const id = `section.${section.id}.item.${it.id}`;
          const label = it.name ?? it.text ?? "";
          return (
            <li
              key={it.id}
              data-element-id={id}
              className="flex cursor-grab gap-2 rounded-sm"
              style={elementStyle(data, id)}
            >
              <span
                className="select-none"
                style={{ color: CYAN }}
                aria-hidden
              >
                ›
              </span>
              <span className="flex-1">
                {label}
                {it.proficiency && (
                  <span style={{ color: `${INK}88` }}>
                    {" — "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.proficiency`} value={it.proficiency} placeholder="Proficiency" />
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }
  return null;
}
