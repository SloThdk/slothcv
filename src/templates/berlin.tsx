/**
 * Berlin — modern sidebar with photo, accent stripe, and small uppercase
 * section headings. The flagship "polished modern" template.
 *
 * Layout:
 *   ┌──────────────────────────┬─────────────────────────────┐
 *   │ accent-tinted sidebar    │ main column                 │
 *   │   • photo with ring      │   name HUGE                 │
 *   │   • contact stack        │   role tagline              │
 *   │   • skills as chips      │   contact tag-chips         │
 *   │   • languages            │   sections with accent rule │
 *   │   • certifications       │                             │
 *   └──────────────────────────┴─────────────────────────────┘
 *
 * Visual character vs the previous minimal version:
 *   - Sidebar background gets a 6%-opacity accent tint, plus a 3px solid
 *     accent stripe on its left edge so the column reads as a card.
 *   - Photo sits on top of the sidebar with a subtle accent outline ring.
 *   - Section headers in the sidebar use small-caps tracked uppercase in
 *     the accent color — same vocabulary as Aurora.
 *   - Main column header has the name at ~2.6× and the role tagline as a
 *     subtle uppercase below, preserving the editorial feel.
 *   - Each main-column section heading has an accent rule on the top to
 *     cleanly separate from the previous block.
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
import type { ResumeData, Section } from "@/types/resume";

const SIDEBAR_TYPES = new Set([
  "skills",
  "languages",
  "certifications",
  "hobbies",
  "references",
]);

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function BerlinTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const sidebar = visible.filter((s) => SIDEBAR_TYPES.has(s.type));
  const main = visible.filter((s) => !SIDEBAR_TYPES.has(s.type));
  const sidebarPct = Math.round(design.sidebarWidth * 100);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <div
        className="grid gap-6"
        style={{
          gridTemplateColumns: `${sidebarPct}% 1fr`,
        }}
      >
        {/* Sidebar */}
        <aside
          className="relative -m-4 p-5"
          style={{
            background: `${design.accentColor}10`,
            minHeight: "100%",
          }}
        >
          {/* Accent stripe on the leading edge */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-[3px]"
            style={{ background: design.accentColor }}
          />

          {design.photo.enabled && personal.photoUrl && (
            <div
              data-element-id="personal.photo"
              className={`mb-4 cursor-grab overflow-hidden transition-shadow hover:ring-2 hover:ring-[var(--berlin-accent,${design.accentColor})] ${
                design.photo.shape === "circle"
                  ? "h-24 w-24 rounded-full"
                  : design.photo.shape === "rounded"
                    ? "h-24 w-24 rounded-2xl"
                    : design.photo.shape === "arch"
                      ? "h-28 w-24 rounded-t-full"
                      : "h-24 w-24 rounded-md"
              }`}
              style={{
                outline: `2px solid ${design.accentColor}66`,
                outlineOffset: "2px",
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

          {/* Contact stack — labels + values */}
          <div className="space-y-1 text-[0.78em]">
            {personal.email && <Detail label="Email" value={personal.email} accent={design.accentColor} />}
            {personal.phone && <Detail label="Phone" value={personal.phone} accent={design.accentColor} />}
            {personal.location && (
              <Detail label="Location" value={personal.location} accent={design.accentColor} />
            )}
            {personal.links.map((l) => (
              <Detail
                key={l.id}
                label="Link"
                value={l.label || l.url}
                accent={design.accentColor}
              />
            ))}
          </div>

          {/* Sidebar sections */}
          <div className="mt-6 space-y-5">
            {sidebar.map((s) => (
              <SidebarSection key={s.id} section={s} data={data} />
            ))}
          </div>
        </aside>

        {/* Main column */}
        <div className="pt-1">
          <header
            data-section-id="personal"
            className="mb-5 cursor-pointer rounded-md p-1 -m-1 transition-colors hover:bg-neutral-100/60"
          >
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.6em] font-light leading-[1.05] tracking-tight transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
              style={elementStyle(data, "personal.name")}
            >
              {personal.fullName || "Your name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-2 block w-fit cursor-text text-[0.82em] font-semibold uppercase tracking-[0.18em] transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
                style={{
                  color: design.accentColor,
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
          </header>

          <div className="space-y-5">
            {main.map((s) => (
              <MainSection key={s.id} section={s} data={data} />
            ))}
          </div>
        </div>
      </div>
    </TemplateFrame>
  );
}

function Detail({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col">
      <span
        className="text-[0.85em] font-medium uppercase tracking-[0.15em]"
        style={{ color: accent }}
      >
        {label}
      </span>
      <span className="break-words">{value}</span>
    </div>
  );
}

function SidebarSection({
  section,
  data,
}: {
  section: Section;
  data: ResumeData;
}) {
  const d = resolveDesign(data.design, section);
  return (
    <div
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-neutral-100/60 hover:ring-2 hover:ring-neutral-900/15"
    >
      <h2
        className="mb-2 text-[0.78em] font-bold uppercase tracking-[0.2em]"
        style={{ color: d.accentColor }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <SectionBody section={section} design={d} data={data} />
      <SectionActions section={section} />
    </div>
  );
}

function MainSection({
  section,
  data,
}: {
  section: Section;
  data: ResumeData;
}) {
  const d = resolveDesign(data.design, section);
  return (
    <section
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-neutral-100/60 hover:ring-2 hover:ring-neutral-900/15"
    >
      {/* Accent rule above the heading — gives the page rhythm. */}
      <div
        className="mb-2 h-px w-full"
        style={{ background: `${d.accentColor}40` }}
      />
      <h2
        className="mb-2 text-[0.82em] font-bold uppercase tracking-[0.18em]"
        style={{ color: d.accentColor }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <SectionBody section={section} design={d} data={data} />
      <SectionActions section={section} />
    </section>
  );
}
