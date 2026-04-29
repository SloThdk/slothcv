/**
 * Scratch — the blank canvas template.
 *
 * No baked-in chrome; honors every global design control. Layout follows
 * `design.layout`: single, two-col, sidebar-left, sidebar-right, or
 * sidebar-with-header.
 */

"use client";

import { TemplateFrame, SectionHeader } from "./frame";
import { EditableSectionTitle, SectionBody } from "./components";
import { SectionActions } from "./section-actions";
import {
  elementStyle,
  positionStyle,
  resolveDesign,
  visibleSections,
} from "./shared";
import type { ResumeData, Section } from "@/types/resume";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function ScratchTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal, sections } = data;
  const visible = visibleSections({ ...data });

  const Header = (
    <header
      data-section-id="personal"
      className="mb-4 cursor-pointer rounded-md p-1 -m-1 transition-colors hover:bg-neutral-100/60"
    >
      {/* Each draggable element below carries `data-element-id` so the
          preview's drag handler can move JUST that element via the
          `data.elementOverrides[id]` path. The cursor-grab affordance
          tells the user this is grabbable; clicks (no movement)
          fall through to "jump to personal form". */}
      <h1
        data-element-id="personal.name"
        style={elementStyle(data, "personal.name")}
        className="block w-fit cursor-text text-[1.8em] font-semibold leading-tight transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
      >
        {personal.fullName || "Your name"}
      </h1>
      {personal.headline && (
        <p
          data-element-id="personal.headline"
          style={{
            color: design.accentColor,
            ...elementStyle(data, "personal.headline"),
          }}
          className="mt-0.5 block w-fit cursor-text text-[1em] transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
        >
          {personal.headline}
        </p>
      )}
      <ContactLine data={data} />
    </header>
  );

  const renderSection = (s: Section) => (
    <section
      key={s.id}
      data-section-id={s.id}
      style={positionStyle(s)}
      className="group relative mb-4 cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-neutral-100/60 hover:ring-2 hover:ring-neutral-900/15"
    >
      <SectionHeader text={s.title} design={resolveDesign(design, s)} sectionId={s.id} data={data} />
      <SectionBody section={s} design={resolveDesign(design, s)} data={data} />
      <SectionActions section={s} />
    </section>
  );

  if (
    design.layout === "sidebar-left" ||
    design.layout === "sidebar-right" ||
    design.layout === "sidebar-with-header"
  ) {
    // Heuristic: short / list-like sections sidebar-bound; narrative ones main.
    const sidebarTypes = new Set([
      "skills",
      "languages",
      "certifications",
      "hobbies",
      "references",
      "awards",
    ]);
    const sidebar = visible.filter((s) => sidebarTypes.has(s.type));
    const main = visible.filter((s) => !sidebarTypes.has(s.type));
    const sidebarFirst = design.layout !== "sidebar-right";

    return (
      <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
        {design.layout === "sidebar-with-header" && Header}
        <div
          className="grid gap-6"
          style={{
            gridTemplateColumns: sidebarFirst
              ? `${design.sidebarWidth * 100}% 1fr`
              : `1fr ${design.sidebarWidth * 100}%`,
          }}
        >
          <aside className={sidebarFirst ? "" : "order-2"}>
            {design.layout !== "sidebar-with-header" && Header}
            {sidebar.map(renderSection)}
          </aside>
          <div className={sidebarFirst ? "" : "order-1"}>
            {main.map(renderSection)}
          </div>
        </div>
      </TemplateFrame>
    );
  }

  if (design.layout === "two-col") {
    // Even split between two columns — sections distributed in alternating order.
    const left: Section[] = [];
    const right: Section[] = [];
    visible.forEach((s, i) => (i % 2 === 0 ? left : right).push(s));
    return (
      <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
        {Header}
        <div className="grid grid-cols-2 gap-6">
          <div>{left.map(renderSection)}</div>
          <div>{right.map(renderSection)}</div>
        </div>
      </TemplateFrame>
    );
  }

  // single
  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {Header}
      {visible.map(renderSection)}
    </TemplateFrame>
  );
}

/** Compact contact line — shared with the simpler templates.
 *  Every contact bit (email / phone / location / each link) is its own
 *  draggable element so the user can nudge them individually. */
export function ContactLine({ data }: { data: ResumeData }) {
  const { personal, design } = data;
  const has =
    personal.email ||
    personal.phone ||
    personal.location ||
    personal.links.length > 0;
  if (!has) return null;
  const grab =
    "block w-fit cursor-text transition-shadow hover:ring-2 hover:ring-neutral-900/15 hover:ring-offset-2 rounded-sm";
  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.85em] text-neutral-600">
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
            href={normalizeHref(l.url)}
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

function normalizeHref(s: string): string {
  const t = s.trim();
  if (!t) return "#";
  const lower = t.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "#";
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:")
  ) {
    return t;
  }
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(t)) return `https://${t}`;
  return "#";
}
