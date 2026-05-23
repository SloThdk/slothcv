/**
 * Dashboard — sales / data / ops. Looks like an Amplitude widget grid.
 *
 * Visual character:
 *   - Top strip of 4 KPI tiles synthesized from the data:
 *       1. "Years exp"     — from earliest experience start to today
 *       2. "Companies"     — count of distinct companies in experience
 *       3. "Top skill"     — name of the highest-level skill
 *       4. "Languages"     — count of languages
 *     Each tile has a big number and a tiny uppercase label
 *   - Body underneath: skills section gets re-rendered as filled progress
 *     bars (skipping the global SkillBarStyle setting on purpose). The bar
 *     fill % maps from `s.level` (0-5 → 20-100%) with a 70% default for
 *     skills that have no level set
 *   - Inter for everything; emerald `#059669` accent against white body
 *   - Single-column flow below the KPI strip — narrative reads top-down
 *
 * Industry-fit: SDRs, CSMs, RevOps, growth, data analytics, BI engineers.
 * The KPI strip mirrors the dashboards these candidates build at work.
 *
 * Hardcoded colors: emerald `#059669` accent is intrinsic; design.accentColor
 * still re-tints the body.
 */

"use client";

import { TemplateFrame } from "./frame";
import { EditableSectionTitle, SectionBody } from "./components";
import { SectionActions } from "./section-actions";
import {
  elementStyle,
  positionStyle,
  resolveDesign,
  visibleSections,
} from "./shared";
import type {
  ExperienceSection,
  LanguagesSection,
  ResumeData,
  Section,
  SkillsSection,
} from "@/types/resume";

const EMERALD = "#059669";
const EMERALD_LIGHT = "#d1fae5";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function DashboardTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  const experience = visible.find(
    (s): s is ExperienceSection => s.type === "experience",
  );
  const skills = visible.find((s): s is SkillsSection => s.type === "skills");
  const languages = visible.find(
    (s): s is LanguagesSection => s.type === "languages",
  );

  // Compute KPIs.
  const kpis = computeKpis(experience, skills, languages);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <div
        style={{
          fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), system-ui, sans-serif)",
        }}
      >
        {/* Header — name + headline + photo. Inline with KPI strip below. */}
        <header
          data-section-id="personal"
          className="mb-3 flex cursor-pointer items-start justify-between gap-4 pb-3"
          style={{ borderBottom: `1px solid ${EMERALD}40` }}
        >
          <div className="flex-1">
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.2em] leading-[1.05] tracking-tight"
              style={{
                color: design.textColor,
                fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
                fontWeight: 700,
                ...elementStyle(data, "personal.name"),
              }}
            >
              {personal.fullName || "Your Name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-1 block w-fit cursor-text text-[0.92em] uppercase"
                style={{
                  color: EMERALD,
                  fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
                  fontWeight: 600,
                  letterSpacing: "0.16em",
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
            <DashboardContact data={data} />
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
                  className="h-20 w-20 rounded-full object-cover"
                  // box-shadow + design.photo.borderColor override (Design → Photo → Border)
                  style={{ boxShadow: `0 0 0 ${design.photo.borderWidth ?? 2}px ${design.photo.borderColor || EMERALD}` }}
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
        </header>

        {/* KPI strip — 4 tiles, synthesized */}
        <div className="mb-4 grid grid-cols-4 gap-3">
          {kpis.map((k, i) => (
            <KpiTile key={i} value={k.value} label={k.label} />
          ))}
        </div>

        {/* Section body — single column, but skills get the bar treatment */}
        <div className="space-y-4">
          {visible.map((s) => {
            if (s.type === "skills") {
              return (
                <SkillBarSection
                  key={s.id}
                  section={s as SkillsSection}
                  data={data}
                />
              );
            }
            return <DashboardSection key={s.id} section={s} data={data} />;
          })}
        </div>
      </div>
    </TemplateFrame>
  );
}

interface Kpi {
  value: string;
  label: string;
}

/** Compute the 4 dashboard KPIs from resume data. Falls back to "—" if a
 *  data slice isn't available so the strip always shows 4 tiles. */
function computeKpis(
  experience?: ExperienceSection,
  skills?: SkillsSection,
  languages?: LanguagesSection,
): Kpi[] {
  // Years of experience — earliest start to today.
  let years = "—";
  if (experience && experience.items.length > 0) {
    const startYears = experience.items
      .filter((i) => i.visible && i.startDate)
      .map((i) => parseInt(i.startDate.slice(0, 4), 10))
      .filter((y) => !Number.isNaN(y));
    if (startYears.length > 0) {
      const earliest = Math.min(...startYears);
      const now = new Date().getFullYear();
      years = `${Math.max(0, now - earliest)}+`;
    }
  }

  // Companies — distinct count.
  let companies = "—";
  if (experience) {
    const uniq = new Set(
      experience.items
        .filter((i) => i.visible && i.company.trim())
        .map((i) => i.company.trim().toLowerCase()),
    );
    companies = uniq.size > 0 ? String(uniq.size) : "—";
  }

  // Top skill — highest-level visible skill name.
  let topSkill = "—";
  if (skills) {
    const visible = skills.items
      .filter((i) => i.visible && i.name.trim())
      .sort((a, b) => b.level - a.level);
    topSkill = visible[0]?.name || "—";
    if (topSkill.length > 14) topSkill = `${topSkill.slice(0, 12)}…`;
  }

  // Language count.
  let langs = "—";
  if (languages) {
    const n = languages.items.filter((i) => i.visible).length;
    langs = n > 0 ? String(n) : "—";
  }

  return [
    { value: years, label: "Years exp" },
    { value: companies, label: "Companies" },
    { value: topSkill, label: "Top skill" },
    { value: langs, label: "Languages" },
  ];
}

function KpiTile({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: EMERALD_LIGHT,
        borderLeft: `3px solid ${EMERALD}`,
      }}
    >
      <div
        className="text-[1.4em] leading-none font-bold"
        style={{ color: EMERALD }}
      >
        {value}
      </div>
      <div
        className="mt-0.5 text-[0.65em] uppercase"
        style={{
          color: "#065f46",
          fontWeight: 600,
          letterSpacing: "0.18em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function DashboardContact({ data }: { data: ResumeData }) {
  const { personal, design } = data;
  const grab =
    "cursor-text rounded-sm";
  return (
    <div
      className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.82em]"
      style={{ color: `${design.textColor}aa` }}
    >
      {personal.email && (
        <span
          data-element-id="personal.email"
          className={grab}
          style={elementStyle(data, "personal.email")}
        >
          {personal.email}
        </span>
      )}
      {personal.phone && (
        <span
          data-element-id="personal.phone"
          className={grab}
          style={elementStyle(data, "personal.phone")}
        >
          {personal.phone}
        </span>
      )}
      {personal.location && (
        <span
          data-element-id="personal.location"
          className={grab}
          style={elementStyle(data, "personal.location")}
        >
          {personal.location}
        </span>
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
            className={`${grab} underline-offset-2 hover:underline`}
            style={{ color: EMERALD, ...elementStyle(data, id) }}
          >
            {l.label || l.url}
          </a>
        );
      })}
    </div>
  );
}

/** Skills rendered as horizontal progress bars — Dashboard's signature
 *  visualization. Bypasses the global skillBarStyle on purpose; design tab
 *  controls colors though. */
function SkillBarSection({
  section,
  data,
}: {
  section: SkillsSection;
  data: ResumeData;
}) {
  const titleId = `section.${section.id}.title`;
  const items = section.items.filter((i) => i.visible);

  // Group by category, preserving first-seen order — same as global skills body.
  const groups = new Map<string, typeof items>();
  for (const s of items) {
    const key = s.group || "Skills";
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }

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
          color: EMERALD,
          fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
          fontWeight: 700,
          letterSpacing: "0.14em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>

      <div className="space-y-3">
        {[...groups.entries()].map(([group, list]) => (
          <div key={group}>
            {groups.size > 1 && (
              <div
                className="mb-1 text-[0.7em] uppercase"
                style={{
                  color: "#475569",
                  fontWeight: 600,
                  letterSpacing: "0.16em",
                }}
              >
                {group}
              </div>
            )}
            <div className="space-y-1.5">
              {list.map((s) => {
                const id = `section.${section.id}.item.${s.id}`;
                // Map level (0-5) to %; default 70% for unset.
                const pct = s.level > 0 ? (s.level / 5) * 100 : 70;
                return (
                  <div
                    key={s.id}
                    data-element-id={id}
                    className="cursor-grab text-[0.85em] rounded-sm"
                    style={elementStyle(data, id)}
                  >
                    <div className="flex justify-between">
                      <span style={{ color: "#1c1917", fontWeight: 500 }}>
                        {s.name}
                      </span>
                      <span
                        className="text-[0.85em]"
                        style={{ color: EMERALD, fontWeight: 600 }}
                      >
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <div
                      className="mt-0.5 h-2 overflow-hidden rounded"
                      style={{ background: EMERALD_LIGHT }}
                    >
                      <div
                        className="h-2 rounded transition-all"
                        style={{
                          width: `${pct}%`,
                          background: EMERALD,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <SectionActions section={section} />
    </section>
  );
}

function DashboardSection({
  section,
  data,
}: {
  section: Section;
  data: ResumeData;
}) {
  const d = resolveDesign(data.design, section);
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
          color: EMERALD,
          fontFamily: "var(--cv-title-font, var(--font-inter, 'Inter'), sans-serif)",
          fontWeight: 700,
          letterSpacing: "0.14em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <SectionBody
        section={section}
        design={{ ...d, accentColor: EMERALD }}
        data={data}
      />
      <SectionActions section={section} />
    </section>
  );
}
