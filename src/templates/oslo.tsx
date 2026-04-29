/**
 * Oslo — classic serif, conservative spacing, ATS-bulletproof.
 *
 * Visual character (intentionally restrained — this is the safe pick):
 *   - Centered header: serif name + italic role tagline + slim contact line
 *   - Slim gold rule under the contact line
 *   - Section heads: tracked uppercase, gold rule above (NOT below — reads
 *     classier)
 *   - Single column, generous line-height, smaller body for density
 *   - Body font defaults to Lora (serif) when the user hasn't picked one
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
import type { ResumeData } from "@/types/resume";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function OsloTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <header
        data-section-id="personal"
        className="mb-5 cursor-pointer rounded-md p-1 -m-1 text-center transition-colors hover:bg-neutral-100/60"
      >
        <h1
          data-element-id="personal.name"
          className="block w-fit cursor-text text-[2.1em] font-bold leading-[1.05] tracking-tight transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
          style={{
            fontFamily: `'Lora', 'Source Serif 4', serif`,
            ...elementStyle(data, "personal.name"),
          }}
        >
          {personal.fullName || "Your name"}
        </h1>
        {personal.headline && (
          <p
            data-element-id="personal.headline"
            className="mt-1 block w-fit cursor-text text-[1.05em] italic transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
            style={{
              color: design.accentColor,
              ...elementStyle(data, "personal.headline"),
            }}
          >
            {personal.headline}
          </p>
        )}
        <div className="mx-auto mt-1 max-w-fit">
          <ContactLine data={data} />
        </div>
        <div
          className="mx-auto mt-3 h-[2px] w-16"
          style={{ background: design.accentColor }}
        />
      </header>

      {visible.map((s, idx) => {
        const d = resolveDesign(design, s);
        return (
          <section
            key={s.id}
            data-section-id={s.id}
            style={positionStyle(s)}
            className={`group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-neutral-100/60 hover:ring-2 hover:ring-neutral-900/15 ${idx === 0 ? "" : "mt-5"}`}
          >
            <div
              className="mb-2 h-px w-full"
              style={{ background: `${d.accentColor}80` }}
            />
            <h2
              className="mb-1.5 text-[0.85em] font-bold uppercase tracking-[0.2em]"
              style={{ color: d.accentColor }}
            >
              <EditableSectionTitle sid={s.id} data={data}>{s.title}</EditableSectionTitle>
            </h2>
            <SectionBody section={s} design={d} data={data} />
            <SectionActions section={s} />
          </section>
        );
      })}
    </TemplateFrame>
  );
}
