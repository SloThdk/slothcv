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
import { EditableSectionTitle, SectionBody } from "./components";
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
          {design.photo.enabled && (
            <div
              data-element-id="personal.photo"
              className={`-mb-10 cursor-grab overflow-hidden ${
                design.photo.shape === "square"
                  ? "h-24 w-24 rounded-md"
                  : design.photo.shape === "rounded"
                    ? "h-24 w-24 rounded-2xl"
                    : design.photo.shape === "arch"
                      ? "h-28 w-24 rounded-t-full"
                      : "h-24 w-24 rounded-full"
              }`}
              style={{
                // box-shadow + design.photo.borderColor override (Design → Photo → Border)
                boxShadow: `0 0 0 ${design.photo.borderWidth ?? 3}px ${design.photo.borderColor || "#ffffff"}`,
                ...elementStyle(data, "personal.photo"),
              }}
            >
              {personal.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={personal.photoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="grid h-full w-full place-items-center bg-[color-mix(in_srgb,currentColor_8%,transparent)] text-[color-mix(in_srgb,currentColor_45%,transparent)]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
                  </svg>
                </div>
              )}
            </div>
          )}
          <div className="flex-1">
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.4em] font-extrabold leading-[1.05] tracking-tight"
              style={elementStyle(data, "personal.name")}
            >
              {personal.fullName || "Your name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-1 block w-fit cursor-text text-[0.95em] font-medium uppercase tracking-[0.18em] opacity-90"
                style={elementStyle(data, "personal.headline")}
              >
                {personal.headline}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-[0.78em]">
              {personal.email && (
                <Chip id="personal.email" data={data}>
                  {personal.email}
                </Chip>
              )}
              {personal.phone && (
                <Chip id="personal.phone" data={data}>
                  {personal.phone}
                </Chip>
              )}
              {personal.location && (
                <Chip id="personal.location" data={data}>
                  {personal.location}
                </Chip>
              )}
              {personal.links.map((l) => (
                <Chip
                  key={l.id}
                  id={`personal.links.${l.id}`}
                  data={data}
                  href={l.url}
                >
                  {l.label || l.url}
                </Chip>
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
              className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1"
            >
              <h2
                className="mb-2 inline-block rounded-md px-3 py-1 text-[0.82em] font-bold uppercase tracking-[0.2em]"
                style={{
                  background: `${d.accentColor}1a`,
                  color: d.accentColor,
                }}
              >
                <EditableSectionTitle sid={s.id} data={data}>{transformHeader(s.title, d)}</EditableSectionTitle>
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

/** White outline chip used for header contact items. Carries a stable
 *  `data-element-id` so each chip is independently draggable + inline-
 *  editable. When `href` is provided (links) it renders as `<a>` so the
 *  user can click through; without it, it renders as a span. */
function Chip({
  children,
  id,
  data,
  href,
}: {
  children: React.ReactNode;
  id: string;
  data: ResumeData;
  href?: string;
}) {
  const baseClass =
    "inline-block cursor-text rounded-full px-3 py-0.5";
  const baseStyle = {
    background: "rgba(255,255,255,0.16)",
    border: "1px solid rgba(255,255,255,0.45)",
    ...elementStyle(data, id),
  } as const;
  if (href) {
    return (
      <a
        data-element-id={id}
        href={href.startsWith("http") ? href : `https://${href}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClass} no-underline hover:underline`}
        style={baseStyle}
      >
        {children}
      </a>
    );
  }
  return (
    <span data-element-id={id} className={baseClass} style={baseStyle}>
      {children}
    </span>
  );
}
