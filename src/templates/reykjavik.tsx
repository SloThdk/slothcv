/**
 * Reykjavik — academic, publications-first, long-form friendly.
 *
 * Visual character:
 *   - Two-column layout: 30% sidebar (affiliations, languages, awards),
 *     70% main (publications, experience, talks, education)
 *   - Conservative serif feel; section headings are small caps with thin
 *     accent rule, like a journal section break.
 *   - Publications jump to the top of the main column when present —
 *     academic CVs lead with the bibliography.
 *   - Affiliation block top of sidebar synthesized from headline + location.
 *   - Generous line-height, page-break-friendly section spacing.
 */

"use client";

import { TemplateFrame } from "./frame";
import { EditableSectionTitle, SectionBody } from "./components";
import { SectionActions } from "./section-actions";
import { ContactLine } from "./scratch";
import {
  elementStyle,
  positionStyle,
  resolveDesign,
  visibleSections,
} from "./shared";
import type { ResumeData, Section } from "@/types/resume";

const SIDEBAR_TYPES = new Set([
  "languages",
  "awards",
  "certifications",
  "hobbies",
  "references",
]);

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function ReykjavikTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  // Move publications to the top — academic signature.
  const visible = visibleSections(data).slice().sort((a, b) => {
    if (a.type === "publications" && b.type !== "publications") return -1;
    if (b.type === "publications" && a.type !== "publications") return 1;
    return 0;
  });
  const sidebar = visible.filter((s) => SIDEBAR_TYPES.has(s.type));
  const main = visible.filter((s) => !SIDEBAR_TYPES.has(s.type));

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <header
        data-section-id="personal"
        className="mb-6 cursor-pointer rounded-md p-1 -m-1 transition-colors"
      >
        <h1
          data-element-id="personal.name"
          className="block w-fit cursor-text text-[2em] font-semibold leading-[1.05] tracking-tight"
          style={{
            fontFamily: `'Source Serif 4', 'Lora', serif`,
            ...elementStyle(data, "personal.name"),
          }}
        >
          {personal.fullName || "Your name"}
        </h1>
        {personal.headline && (
          <p
            data-element-id="personal.headline"
            className="mt-1 block w-fit cursor-text text-[1.05em] italic text-neutral-700"
            style={elementStyle(data, "personal.headline")}
          >
            {personal.headline}
          </p>
        )}
        <ContactLine data={data} />
      </header>

      <div className="grid gap-6" style={{ gridTemplateColumns: "30% 1fr" }}>
        <aside>
          {sidebar.map((s) => (
            <Block
              key={s.id}
              section={s}
              design={resolveDesign(design, s)}
              data={data}
              compact
            />
          ))}
        </aside>
        <div className="space-y-6">
          {main.map((s) => (
            <Block
              key={s.id}
              section={s}
              design={resolveDesign(design, s)}
              data={data}
            />
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

function Block({
  section,
  design,
  data,
  compact,
}: {
  section: Section;
  design: ReturnType<typeof resolveDesign>;
  data: ResumeData;
  compact?: boolean;
}) {
  return (
    <section
      data-section-id={section.id}
      style={positionStyle(section)}
      className={`group relative cursor-pointer rounded-md p-1 -m-1 ${compact ? "mb-5 break-inside-avoid" : "break-inside-avoid"}`}
    >
      <div
        className="mb-1 h-px w-12"
        style={{ background: design.accentColor }}
      />
      <h2 className="mb-2 text-[0.86em] font-bold uppercase tracking-[0.18em]">
        <span style={{ color: design.accentColor }}><EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle></span>
      </h2>
      <SectionBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}
