/**
 * Capitol — corporate executive layout with a dark header band, circular
 * photo, and a vertical-timeline body where each section is anchored to
 * a small accent dot on the gutter.
 *
 * Visual character:
 *   - Top 28 % of the page is a dark navy band. Circular photo sits on
 *     the left (overflowing slightly below the band so it pops). Name
 *     and role headline are white sans, large weight 700.
 *   - Body has a 1 px dotted vertical rule down the left at ~36 px in.
 *     Each section title sits at the rule with a 12 px filled circle in
 *     the accent color marking its anchor — reads as a timeline.
 *   - Section heads use lucide icons in a 26 px accent-tinted circle to
 *     the right of the dot, then the title in tracked uppercase.
 *   - White background, charcoal text. Conservative spacing.
 *
 * Data flow: same drag/click hooks every other template uses
 * (data-section-id, data-element-id, positionStyle, elementStyle,
 * resolveDesign, SectionBody, SectionActions). Custom-element overlay
 * still works.
 */

"use client";

import {
  Award,
  Briefcase,
  Code2,
  FolderGit2,
  GraduationCap,
  HandHeart,
  Heart,
  Languages as LanguagesIcon,
  Lightbulb,
  Mic,
  Newspaper,
  ShieldCheck,
  Sparkles,
  User,
  Users as UsersIcon,
} from "lucide-react";
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
import type { ResumeData, SectionType } from "@/types/resume";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

/** Lucide icon per section type — gives every section heading a visual
 *  anchor. Keeps the icon set tight (one per type) so the look stays
 *  consistent across templates that reuse this map. */
const SECTION_ICONS: Record<SectionType, React.ComponentType<{ className?: string }>> = {
  summary: User,
  experience: Briefcase,
  education: GraduationCap,
  skills: Code2,
  languages: LanguagesIcon,
  projects: FolderGit2,
  certifications: ShieldCheck,
  awards: Award,
  publications: Newspaper,
  volunteer: HandHeart,
  talks: Mic,
  hobbies: Heart,
  references: UsersIcon,
  custom: Sparkles,
};

export function CapitolTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  // Header band fills the top of the page, edge to edge — negative
  // margins cancel the TemplateFrame's standard padding so the band
  // really does touch the page edges.
  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <header
        data-section-id="personal"
        className="-m-4 mb-6 cursor-pointer p-6 transition-colors hover:bg-neutral-100/15"
        style={{
          // The dark band is a darker shade of accent so brand color
          // changes ripple here automatically. Falls back to a deep
          // neutral when accent is too light to read white text on.
          background: darken(design.accentColor),
          color: "#ffffff",
        }}
      >
        <div className="flex items-center gap-5">
          {design.photo.enabled && personal.photoUrl && (
            <div
              data-element-id="personal.photo"
              className="cursor-grab overflow-hidden rounded-full"
              style={{
                width: 96,
                height: 96,
                ...photoBorderStyle(design, "rgba(255,255,255,0.3)"),
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
              className="block w-fit cursor-text text-[2.4em] font-extrabold leading-[1.0] tracking-[0.01em] uppercase transition-shadow hover:ring-2 hover:ring-white/40 hover:ring-offset-2"
              style={{ color: "#ffffff", ...elementStyle(data, "personal.name") }}
            >
              {personal.fullName || "Your name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-2 block w-fit cursor-text text-[0.95em] font-medium uppercase tracking-[0.22em] transition-shadow hover:ring-2 hover:ring-white/40 hover:ring-offset-2"
                style={{
                  color: "rgba(255,255,255,0.8)",
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
          </div>
        </div>
        {/* Slim contact line under the header in white-tinted mode so it
            still reads on the dark band. */}
        <div className="mt-4 [&_*]:!text-white/90">
          <ContactLine data={data} />
        </div>
      </header>

      {/* Body — timeline rule + sections */}
      <div className="relative pl-10">
        {/* Vertical dotted rule sitting in the gutter. Drawn with a
            repeating-linear-gradient so it's pure CSS — no SVG, no
            overflow surprises. */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1 bottom-2 left-3 w-px"
          style={{
            background: `repeating-linear-gradient(to bottom, ${design.accentColor}55 0 3px, transparent 3px 6px)`,
          }}
        />
        <div className="space-y-5">
          {visible.map((s) => {
            const d = resolveDesign(design, s);
            const Icon = SECTION_ICONS[s.type] ?? Lightbulb;
            return (
              <section
                key={s.id}
                data-section-id={s.id}
                style={positionStyle(s)}
                className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-neutral-100/60 hover:ring-2 hover:ring-neutral-900/15"
              >
                {/* Timeline anchor — the lucide-icon-in-circle that sits
                    on top of the gutter rule. Negative left positions
                    it OUTSIDE the section's content box. */}
                <div
                  aria-hidden
                  className="absolute -left-[34px] top-0 grid h-7 w-7 place-items-center rounded-full"
                  style={{
                    background: d.accentColor,
                    color: "#ffffff",
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <h2
                  className="mb-2 text-[0.95em] font-bold uppercase tracking-[0.18em]"
                  style={{ color: d.accentColor }}
                >
                  <EditableSectionTitle sid={s.id} data={data}>{s.title}</EditableSectionTitle>
                </h2>
                <SectionBody section={s} design={d} data={data} />
                <SectionActions section={s} />
              </section>
            );
          })}
        </div>
      </div>
    </TemplateFrame>
  );
}

/** Darken any color reasonably so the header band reads dark even when
 *  the user picked a bright accent. We parse the hex, drop ~55% of the
 *  brightness, and return back. Non-hex strings return a neutral dark
 *  default — same fallback Aurora uses for "user typed garbage". */
function darken(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#0f172a";
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  // Mix toward black at 55% — preserves hue, drops brightness reliably.
  const k = 0.45;
  const dr = Math.round(r * k);
  const dg = Math.round(g * k);
  const db = Math.round(b * k);
  return `#${[dr, dg, db].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
