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
  photoBorderStyle,
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
                ...photoBorderStyle(design, `${design.accentColor}66`),
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

          {/* Contact stack — labels + values. Each row carries a stable
              `data-element-id` so the user can free-drag email / phone /
              location / each link individually, and double-click any
              value to inline-edit it. Without this every contact row was
              dead in the visual editor — visible, but unclickable. */}
          <div className="space-y-1 text-[0.78em]">
            {personal.email && (
              <Detail
                label="Email"
                value={personal.email}
                accent={design.accentColor}
                id="personal.email"
                data={data}
              />
            )}
            {personal.phone && (
              <Detail
                label="Phone"
                value={personal.phone}
                accent={design.accentColor}
                id="personal.phone"
                data={data}
              />
            )}
            {personal.location && (
              <Detail
                label="Location"
                value={personal.location}
                accent={design.accentColor}
                id="personal.location"
                data={data}
              />
            )}
            {personal.links.map((l) => (
              <Detail
                key={l.id}
                label={l.label || "Link"}
                value={l.url}
                href={l.url}
                accent={design.accentColor}
                id={`personal.links.${l.id}`}
                data={data}
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
  id,
  data,
  href,
}: {
  label: string;
  value: string;
  accent: string;
  id: string;
  data: ResumeData;
  /** When provided, render the value as an external `<a>` link. Used for
   *  personal links so clicking the URL opens it in a new tab while still
   *  being draggable + inline-editable. */
  href?: string;
}) {
  // Drag affordance shared by both anchor and span variants — keeps the
  // hover ring + cursor consistent regardless of whether the row is a link.
  const valueClass =
    "block break-words cursor-text rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15 hover:ring-offset-1";
  return (
    <div className="flex flex-col">
      <span
        className="text-[0.85em] font-medium uppercase tracking-[0.15em]"
        style={{ color: accent }}
      >
        {label}
      </span>
      {href ? (
        <a
          data-element-id={id}
          href={href.startsWith("http") ? href : `https://${href}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${valueClass} underline-offset-2 hover:underline`}
          style={elementStyle(data, id)}
        >
          {value}
        </a>
      ) : (
        <span
          data-element-id={id}
          className={valueClass}
          style={elementStyle(data, id)}
        >
          {value}
        </span>
      )}
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
