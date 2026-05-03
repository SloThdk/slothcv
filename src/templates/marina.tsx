/**
 * Marina — modern marketing-flavored layout with a dark teal header
 * (circular photo + soft gradient suggesting a backdrop) and a
 * two-column body where the left rail carries personal/skills/contact
 * on a tinted gray panel and the right column carries narrative
 * sections on white.
 *
 * Visual character:
 *   - Top ~30 % of the page is a dark teal block. Circular photo on the
 *     left of the band, very large weight-700 sans name on the right
 *     in white. A soft radial-gradient highlight in the upper-right of
 *     the band suggests an out-of-focus building / window — gives the
 *     header dimension without needing a real image asset.
 *   - Body left rail (33 %) sits on `#f3f4f5` with light gray, comfy
 *     spacing; ALL-CAPS section labels with a short accent rule under.
 *   - Body right rail (67 %) on white with the same heading vocabulary.
 *   - Section heads use the accent color in tracked uppercase, no icons
 *     (the photo + header band are already doing the visual heavy
 *     lifting).
 */

"use client";

import { TemplateFrame } from "./frame";
import { EditableSectionTitle, SectionBody } from "./components";
import { SectionActions } from "./section-actions";
import { ContactLine } from "./scratch";
import {
  elementStyle,
  photoBorderStyle,
  positionStyle,
  resolveDesign,
  visibleSections,
} from "./shared";
import type { ResumeData, Section, SectionType } from "@/types/resume";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

/** Section types that go in the LEFT (gray) rail. Personal-adjacent
 *  facts + short lists. Everything else is narrative-heavy and goes
 *  right onto the white area. */
const LEFT_TYPES = new Set<SectionType>([
  "skills",
  "languages",
  "certifications",
  "hobbies",
  "references",
  "awards",
]);

export function MarinaTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const leftRail = visible.filter((s) => LEFT_TYPES.has(s.type));
  const rightRail = visible.filter((s) => !LEFT_TYPES.has(s.type));

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Header band — full-bleed via negative margins to cancel the
          frame's standard padding. Background uses the resolved accent
          darkened for contrast plus a soft radial highlight upper-right
          that reads as out-of-focus light through a window. */}
      <header
        data-section-id="personal"
        className="relative -m-4 mb-0 cursor-pointer overflow-hidden p-6 transition-colors hover:brightness-110"
        style={{
          background: `radial-gradient(ellipse at 80% 20%, ${design.accentColor}33 0%, transparent 55%), ${darken(design.accentColor)}`,
          color: "#ffffff",
          minHeight: 180,
        }}
      >
        <div className="relative flex items-center gap-6">
          {design.photo.enabled && personal.photoUrl && (
            <div
              data-element-id="personal.photo"
              className="cursor-grab overflow-hidden rounded-full"
              style={{
                width: 120,
                height: 120,
                ...photoBorderStyle(design, "rgba(255,255,255,0.35)"),
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
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
          <div>
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.7em] font-extrabold leading-[1.0] tracking-[0.02em] uppercase"
              style={{ color: "#ffffff", ...elementStyle(data, "personal.name") }}
            >
              {personal.fullName || "Your name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-2 block w-fit cursor-text text-[0.95em] font-medium uppercase tracking-[0.22em]"
                style={{
                  color: "rgba(255,255,255,0.85)",
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Two-rail body. Negative left margin again so the gray rail
          touches the page edge. The right rail keeps the frame's
          natural inner padding (via padding on its own div). */}
      <div
        className="-mx-4 grid"
        style={{
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)",
          minHeight: 420,
        }}
      >
        <aside
          className="space-y-5 px-5 py-6"
          style={{ background: "#f3f4f5" }}
        >
          {/* Personal contact block lives in the left rail too — feels
              right alongside the other "facts about me" sections. */}
          <section className="break-inside-avoid">
            <RailHeading title="Contact" accent={design.accentColor} />
            <div className="space-y-1 text-[0.85em] text-neutral-700">
              {/* Each contact row gets its own data-element-id via the
                  Detail helper so the user can free-drag email / phone /
                  location independently in the visual editor and
                  double-click to inline-edit. Links are still rendered
                  via the shared ContactLine helper from scratch.tsx,
                  which has the same instrumentation. */}
              {personal.email && (
                <Detail
                  label="Email"
                  value={personal.email}
                  id="personal.email"
                  data={data}
                />
              )}
              {personal.phone && (
                <Detail
                  label="Phone"
                  value={personal.phone}
                  id="personal.phone"
                  data={data}
                />
              )}
              {personal.location && (
                <Detail
                  label="Location"
                  value={personal.location}
                  id="personal.location"
                  data={data}
                />
              )}
              <ContactLine data={data} />
            </div>
          </section>
          {leftRail.map((s) => (
            <RailSection key={s.id} section={s} data={data} />
          ))}
        </aside>

        <main className="space-y-5 px-5 py-6">
          {rightRail.map((s) => (
            <RailSection key={s.id} section={s} data={data} />
          ))}
        </main>
      </div>
    </TemplateFrame>
  );
}

/** Section heading shared by both rails — tracked uppercase + short
 *  accent rule below. */
function RailHeading({
  title,
  accent,
  sectionId,
  data,
}: {
  title: string;
  accent: string;
  /** Optional — when provided, wraps the rendered heading text in
   *  `<EditableSectionTitle>` so users can double-click to inline-edit
   *  the underlying raw `section.title`. Marina's heading style stays
   *  uppercase + accent-coloured visually; the editor lens deals in
   *  the raw string. */
  sectionId?: string;
  data?: ResumeData;
}) {
  const inner =
    sectionId && data ? (
      <EditableSectionTitle sid={sectionId} data={data}>
        {title}
      </EditableSectionTitle>
    ) : (
      title
    );
  return (
    <div className="mb-2">
      <h2
        className="text-[0.95em] font-bold uppercase tracking-[0.22em]"
        style={{ color: accent }}
      >
        {inner}
      </h2>
      <div
        aria-hidden
        className="mt-1 h-[2px] w-8 rounded-full"
        style={{ background: accent }}
      />
    </div>
  );
}

function RailSection({
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
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1"
    >
      <RailHeading title={section.title} accent={d.accentColor} sectionId={section.id} data={data} />
      <SectionBody section={section} design={d} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function Detail({
  label,
  value,
  id,
  data,
}: {
  label: string;
  value: string;
  id: string;
  data: ResumeData;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[0.75em] font-semibold uppercase tracking-[0.15em] text-neutral-500">
        {label}
      </span>
      <span
        data-element-id={id}
        className="block break-words cursor-text rounded-sm"
        style={elementStyle(data, id)}
      >
        {value}
      </span>
    </div>
  );
}

/** Same darken helper as Capitol — kept private here so each template
 *  is self-contained and we don't fight import cycles. ~6 lines, fine
 *  to duplicate. */
function darken(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#0f3a3f";
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  const k = 0.4;
  const dr = Math.round(r * k);
  const dg = Math.round(g * k);
  const db = Math.round(b * k);
  return `#${[dr, dg, db].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
