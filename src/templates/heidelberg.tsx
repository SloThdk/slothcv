/**
 * Heidelberg — humanities academic. Looks like a dense conference programme
 * for a university press symposium. Triple-column publications/talks for
 * citation density; two-column experience for taught-courses + research.
 *
 * Visual character:
 *   - Three-column layout for `publications` and `talks` sections via CSS
 *     `columns: 3; column-gap: 16px`. Two-column for `experience` and
 *     `volunteer`. Single-column for everything else (skills, summary, etc.)
 *   - EB Garamond throughout — old-press serif. Dark red `#7c2d12` accent
 *     (the color of academic press cloth bindings)
 *   - Cream `#fefdfb` body with a subtle radial fade in the corners,
 *     suggesting old paper that has yellowed at the edges
 *   - Footnote-style hanging indent (text-indent: -1em; padding-left: 1em)
 *     on publication entries so citations wrap like LaTeX bibliography
 *   - Small caps for section titles, no underline — "old prof" voice
 *
 * Industry-fit: tenured profs, post-docs, library science, classical
 * studies, history, law-review editors, academic press editors.
 *
 * Hardcoded colors: dark red `#7c2d12` accent + cream `#fefdfb` body are
 * intrinsic. design.textColor still applies to body prose.
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

const RED = "#7c2d12";
const CREAM = "#fefdfb";

// Per-section column count.
const COLUMN_COUNT: Partial<Record<SectionType, number>> = {
  publications: 3,
  talks: 3,
  experience: 2,
  volunteer: 2,
};

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function HeidelbergTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Old-paper body bg with corner fade. The radial gradients sit at
          opacity ~6% so they read as warmth, not staining. */}
      <div
        className="absolute inset-0"
        style={{
          background: CREAM,
          backgroundImage: `
            radial-gradient(ellipse 600px 300px at 0% 0%, ${RED}0f, transparent 70%),
            radial-gradient(ellipse 500px 300px at 100% 0%, ${RED}0a, transparent 70%),
            radial-gradient(ellipse 600px 400px at 0% 100%, ${RED}08, transparent 70%),
            radial-gradient(ellipse 500px 400px at 100% 100%, ${RED}0c, transparent 70%)
          `,
          zIndex: 0,
        }}
        aria-hidden
      />

      <div
        className="relative z-[1]"
        style={{
          fontFamily: "var(--cv-title-font, var(--font-eb-garamond, 'EB Garamond'), Garamond, serif)",
        }}
      >
        {/* Header — academic-style, name first, then "of Department" */}
        <header
          data-section-id="personal"
          className="mb-5 cursor-pointer pb-3 text-center"
          style={{ borderBottom: `1px solid ${RED}66` }}
        >
          <h1
            data-element-id="personal.name"
            className="mx-auto block w-fit cursor-text text-[2.4em] leading-[1.05] tracking-tight"
            style={{
              color: design.textColor,
              fontFamily: "var(--cv-title-font, var(--font-eb-garamond, 'EB Garamond'), Garamond, serif)",
              fontWeight: 600,
              ...elementStyle(data, "personal.name"),
            }}
          >
            {personal.fullName || "Your Name"}
          </h1>
          {personal.headline && (
            <p
              data-element-id="personal.headline"
              className="mx-auto mt-1 block w-fit cursor-text text-[0.95em] italic"
              style={{
                color: RED,
                fontFamily: "var(--cv-title-font, var(--font-eb-garamond, 'EB Garamond'), Garamond, serif)",
                fontWeight: 400,
                ...elementStyle(data, "personal.headline"),
              }}
            >
              {personal.headline}
            </p>
          )}
          <HeidelbergContact data={data} />
        </header>

        {/* Body */}
        <div className="space-y-4">
          {visible.map((s) => (
            <HeidelbergSection key={s.id} section={s} data={data} />
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

function HeidelbergContact({ data }: { data: ResumeData }) {
  const { personal, design } = data;
  const grab =
    "cursor-text rounded-sm";
  return (
    <div
      className="mt-2 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-0.5 text-[0.88em]"
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
            style={{ color: RED, ...elementStyle(data, id) }}
          >
            {l.label || l.url}
          </a>
        );
      })}
    </div>
  );
}

function HeidelbergSection({
  section,
  data,
}: {
  section: Section;
  data: ResumeData;
}) {
  const d = resolveDesign(data.design, section);
  const titleId = `section.${section.id}.title`;
  const cols = COLUMN_COUNT[section.type] ?? 1;
  // For multi-column sections: use CSS columns. For publications, also apply
  // hanging-indent classes via extra wrapper styles.
  const isPub = section.type === "publications";
  return (
    <section
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1"
    >
      <h2
        data-element-id={titleId}
        className="mb-1.5 inline-block cursor-text text-[1em]"
        style={{
          color: RED,
          fontFamily: "var(--cv-title-font, var(--font-eb-garamond, 'EB Garamond'), Garamond, serif)",
          fontWeight: 600,
          fontVariant: "small-caps",
          letterSpacing: "0.06em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <div
        className="mb-2 h-px w-full"
        style={{ background: `${RED}40` }}
      />
      <div
        style={{
          columnCount: cols > 1 ? cols : undefined,
          columnGap: cols > 1 ? "16px" : undefined,
          // Hanging-indent on publication entries — gives them a citation feel
          ...(isPub
            ? {
                textIndent: "-1em",
                paddingLeft: "1em",
              }
            : {}),
        }}
      >
        <SectionBody
          section={section}
          design={{ ...d, accentColor: RED }}
          data={data}
        />
      </div>
      <SectionActions section={section} />
    </section>
  );
}
