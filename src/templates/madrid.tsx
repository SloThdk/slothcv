/**
 * Madrid — creative full-bleed accent header, photo on the color, bold body.
 *
 * Visual character:
 *   - Top ~22% of the page is a colored band at the accent color, with the
 *     photo + name + role + contact-chips overlaid in white.
 *   - Below the band, the body sits on the regular page background.
 *   - Section headings: rounded "box" pills with bg-tint accent — reads as
 *     a label, perfect for designers/creatives.
 *   - Bullets default to arrow glyph for a slightly punchier feel.
 *   - Photo placement: bottom-left of the header band, photo slightly
 *     overhanging the band → body line so it pops.
 */

"use client";

import { TemplateFrame } from "./frame";
import { SectionBody } from "./components";
import { SectionActions } from "./section-actions";
import {
  elementStyle,
  positionStyle,
  resolveDesign,
  visibleSections,
  transformHeader,
} from "./shared";
import type { ResumeData } from "@/types/resume";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function MadridTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <header
        data-section-id="personal"
        className="-m-4 mb-6 cursor-pointer px-6 pt-7 pb-7 transition-opacity hover:opacity-95"
        style={{
          background: design.accentColor,
          color: "#ffffff",
          boxShadow: `inset 0 -10px 0 ${design.accentColor}`,
        }}
      >
        <div className="flex items-end gap-5">
          {design.photo.enabled && personal.photoUrl && (
            <div
              data-element-id="personal.photo"
              className={`-mb-10 cursor-grab overflow-hidden transition-shadow hover:ring-2 hover:ring-white/60 hover:ring-offset-2 hover:ring-offset-transparent ${
                design.photo.shape === "square"
                  ? "h-24 w-24 rounded-md"
                  : design.photo.shape === "rounded"
                    ? "h-24 w-24 rounded-2xl"
                    : design.photo.shape === "arch"
                      ? "h-28 w-24 rounded-t-full"
                      : "h-24 w-24 rounded-full"
              }`}
              style={{
                outline: "3px solid #ffffff",
                outlineOffset: "0px",
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
          <div className="flex-1">
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.4em] font-extrabold leading-[1.05] tracking-tight transition-shadow hover:ring-2 hover:ring-white/60 hover:ring-offset-2 hover:ring-offset-transparent"
              style={elementStyle(data, "personal.name")}
            >
              {personal.fullName || "Your name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-1 block w-fit cursor-text text-[0.95em] font-medium uppercase tracking-[0.18em] opacity-90 transition-shadow hover:ring-2 hover:ring-white/60 hover:ring-offset-2 hover:ring-offset-transparent"
                style={elementStyle(data, "personal.headline")}
              >
                {personal.headline}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-[0.78em]">
              {personal.email && <Chip>{personal.email}</Chip>}
              {personal.phone && <Chip>{personal.phone}</Chip>}
              {personal.location && <Chip>{personal.location}</Chip>}
              {personal.links.map((l) => (
                <Chip key={l.id}>{l.label || l.url}</Chip>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-5">
        {visible.map((s) => {
          const d = resolveDesign(design, s);
          return (
            <section
              key={s.id}
              data-section-id={s.id}
              style={positionStyle(s)}
              className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-neutral-100/60 hover:ring-2 hover:ring-neutral-900/15"
            >
              <h2
                className="mb-2 inline-block rounded-md px-3 py-1 text-[0.82em] font-bold uppercase tracking-[0.2em]"
                style={{
                  background: `${d.accentColor}1a`,
                  color: d.accentColor,
                }}
              >
                {transformHeader(s.title, d)}
              </h2>
              <SectionBody section={s} design={d} data={data} />
              <SectionActions section={s} />
            </section>
          );
        })}
      </div>
    </TemplateFrame>
  );
}

/** White outline chip used for header contact items. */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded-full px-3 py-0.5"
      style={{
        background: "rgba(255,255,255,0.16)",
        border: "1px solid rgba(255,255,255,0.45)",
      }}
    >
      {children}
    </span>
  );
}
