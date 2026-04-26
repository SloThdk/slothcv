/**
 * Tokyo — dense two-column with a strong header band and accent-block
 * section heads. Tuned for engineers + people with lots of content
 * (skills, projects, talks) who want it to fit on one page.
 *
 * Visual character:
 *   - Header: full-width, name on left + headline, photo (if enabled) on
 *     right. Thin accent-color rule below the whole band.
 *   - Body: two equal columns. Sections distributed alternating to keep
 *     column heights balanced.
 *   - Section heads: small accent square + uppercase label. Reads tight.
 *   - The two columns use a 24px gap and per-column 4px row-spacing so it
 *     feels engineered, not airy.
 */

"use client";

import { TemplateFrame } from "./frame";
import { SectionBody } from "./components";
import { SectionActions } from "./section-actions";
import { ContactLine } from "./scratch";
import {
  elementStyle,
  positionStyle,
  resolveDesign,
  visibleSections,
  transformHeader,
} from "./shared";
import type { ResumeData, Section } from "@/types/resume";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function TokyoTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  // Distribute sections 1-by-1 alternating to keep column heights balanced.
  const left: Section[] = [];
  const right: Section[] = [];
  visible.forEach((s, i) => (i % 2 === 0 ? left : right).push(s));

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <header
        data-section-id="personal"
        className="mb-5 flex cursor-pointer items-start justify-between gap-5 rounded-md p-1 -m-1 pb-4 transition-colors hover:bg-neutral-100/60"
        style={{ borderBottom: `2px solid ${design.accentColor}` }}
      >
        <div>
          <h1
            data-element-id="personal.name"
            className="block w-fit cursor-text text-[2em] font-extrabold leading-[1.05] tracking-tight transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
            style={elementStyle(data, "personal.name")}
          >
            {personal.fullName || "Your name"}
          </h1>
          {personal.headline && (
            <p
              data-element-id="personal.headline"
              className="mt-1 block w-fit cursor-text text-[0.95em] font-semibold uppercase tracking-[0.16em] transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
              style={{
                color: design.accentColor,
                ...elementStyle(data, "personal.headline"),
              }}
            >
              {personal.headline}
            </p>
          )}
          <ContactLine data={data} />
        </div>
        {design.photo.enabled && personal.photoUrl && (
          <div
            data-element-id="personal.photo"
            className={`shrink-0 cursor-grab overflow-hidden transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2 ${
              design.photo.shape === "square"
                ? "h-20 w-20 rounded-md"
                : design.photo.shape === "rounded"
                  ? "h-20 w-20 rounded-xl"
                  : design.photo.shape === "arch"
                    ? "h-24 w-20 rounded-t-full"
                    : "h-20 w-20 rounded-full"
            }`}
            style={{
              outline: `2px solid ${design.accentColor}66`,
              ...elementStyle(data, "personal.photo"),
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={personal.photoUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <div className="space-y-4">
          {left.map((s) => (
            <Block
              key={s.id}
              section={s}
              design={resolveDesign(design, s)}
              data={data}
            />
          ))}
        </div>
        <div className="space-y-4">
          {right.map((s) => (
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
}: {
  section: Section;
  design: ReturnType<typeof resolveDesign>;
  data: ResumeData;
}) {
  return (
    <section
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-neutral-100/60 hover:ring-2 hover:ring-neutral-900/15"
    >
      <h2 className="mb-1.5 flex items-center gap-2 text-[0.82em] font-bold uppercase tracking-[0.2em]">
        <span
          className="inline-block h-2.5 w-2.5"
          style={{ background: design.accentColor }}
        />
        <span style={{ color: design.accentColor }}>
          {transformHeader(section.title, design)}
        </span>
      </h2>
      <SectionBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}
