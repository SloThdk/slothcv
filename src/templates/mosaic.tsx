/**
 * Mosaic — marketing native. Every section type gets its own pastel
 * background tile, with a 4px solid colored top-border in its own
 * accent. Reads as a Pinterest mood-board collapsed into a CV.
 *
 * Color map (per section type):
 *   summary        → pink-50      / pink-500 border
 *   experience     → cyan-50      / cyan-600 border
 *   skills         → emerald-50   / emerald-600 border
 *   education      → amber-50     / amber-600 border
 *   projects       → violet-50    / violet-600 border
 *   certifications → orange-50    / orange-600 border
 *   awards         → rose-50      / rose-600 border
 *   publications   → sky-50       / sky-600 border
 *   volunteer      → lime-50      / lime-600 border
 *   talks          → fuchsia-50   / fuchsia-600 border
 *   languages      → teal-50      / teal-600 border
 *   hobbies        → yellow-50    / yellow-500 border
 *   references     → stone-50     / stone-500 border
 *   custom         → indigo-50    / indigo-600 border
 *
 * Visual character:
 *   - 12px gap, 12px radius
 *   - Outfit display font for the name + headline (rounded display)
 *   - Inter for body text
 *   - Single-column flow — tiles stack at full width, marketing-deck order
 *
 * Industry-fit: marketing leads, brand managers, social/content roles,
 * agency creatives. The bright palette is the message.
 *
 * Hardcoded colors: the per-type tile palette is intrinsic to Mosaic's
 * identity. Other elements honour `design.textColor` and `design.accentColor`.
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
import type { ResumeData, Section, SectionType } from "@/types/resume";

// Per-type colored tile — { bg: tile background, border: top accent }.
const TILE_PALETTE: Record<SectionType, { bg: string; border: string }> = {
  summary: { bg: "#fdf2f8", border: "#ec4899" },
  experience: { bg: "#ecfeff", border: "#0891b2" },
  careerBreak: { bg: "#ecfeff", border: "#0891b2" },
  skills: { bg: "#ecfdf5", border: "#059669" },
  education: { bg: "#fffbeb", border: "#d97706" },
  projects: { bg: "#f5f3ff", border: "#7c3aed" },
  certifications: { bg: "#fff7ed", border: "#ea580c" },
  awards: { bg: "#fff1f2", border: "#e11d48" },
  publications: { bg: "#f0f9ff", border: "#0284c7" },
  volunteer: { bg: "#f7fee7", border: "#65a30d" },
  talks: { bg: "#fdf4ff", border: "#c026d3" },
  languages: { bg: "#f0fdfa", border: "#0d9488" },
  hobbies: { bg: "#fefce8", border: "#ca8a04" },
  references: { bg: "#fafaf9", border: "#78716c" },
  custom: { bg: "#eef2ff", border: "#4f46e5" },
};

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function MosaicTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <div
        style={{
          fontFamily: "var(--cv-title-font, var(--font-outfit, 'Outfit'), Inter, sans-serif)",
        }}
      >
        {/* Header tile — full-width, uses a soft neutral so the name doesn't
            compete with the colored section tiles below. */}
        <header
          data-section-id="personal"
          className="group relative mb-3 cursor-pointer rounded-xl p-4"
          style={{
            background: "#f8fafc",
            borderTop: `4px solid ${design.accentColor}`,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1
                data-element-id="personal.name"
                className="block w-fit cursor-text text-[2.4em] leading-[1.05] tracking-tight"
                style={{
                  color: design.textColor,
                  fontFamily: "var(--cv-title-font, var(--font-outfit, 'Outfit'), sans-serif)",
                  fontWeight: 700,
                  ...elementStyle(data, "personal.name"),
                }}
              >
                {personal.fullName || "Your Name"}
              </h1>
              {personal.headline && (
                <p
                  data-element-id="personal.headline"
                  className="mt-1 block w-fit cursor-text text-[1em]"
                  style={{
                    color: design.accentColor,
                    fontFamily: "var(--cv-title-font, var(--font-outfit, 'Outfit'), sans-serif)",
                    fontWeight: 600,
                    ...elementStyle(data, "personal.headline"),
                  }}
                >
                  {personal.headline}
                </p>
              )}
              <MosaicContact data={data} />
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
                    style={{ boxShadow: `0 0 0 ${design.photo.borderWidth ?? 2}px ${design.photo.borderColor || design.accentColor}` }}
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

        {/* Tiles — single-column flow, 12px gap. */}
        <div className="space-y-3">
          {visible.map((s) => (
            <MosaicTile key={s.id} section={s} data={data} />
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

function MosaicContact({ data }: { data: ResumeData }) {
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
            style={{ color: design.accentColor, ...elementStyle(data, id) }}
          >
            {l.label || l.url}
          </a>
        );
      })}
    </div>
  );
}

function MosaicTile({
  section,
  data,
}: {
  section: Section;
  data: ResumeData;
}) {
  const palette = TILE_PALETTE[section.type];
  const d = resolveDesign(data.design, section);
  const titleId = `section.${section.id}.title`;
  return (
    <section
      data-section-id={section.id}
      style={{
        background: palette.bg,
        borderTop: `4px solid ${palette.border}`,
        ...positionStyle(section),
      }}
      className="group relative cursor-pointer break-inside-avoid rounded-xl p-4"
    >
      <h2
        data-element-id={titleId}
        className="mb-2 inline-block cursor-text text-[0.85em] uppercase"
        style={{
          color: palette.border,
          fontFamily: "var(--cv-title-font, var(--font-outfit, 'Outfit'), sans-serif)",
          fontWeight: 700,
          letterSpacing: "0.14em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <SectionBody
        section={section}
        design={{ ...d, accentColor: palette.border }}
        data={data}
      />
      <SectionActions section={section} />
    </section>
  );
}
