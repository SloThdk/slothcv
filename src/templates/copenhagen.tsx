/**
 * Copenhagen — Scandinavian minimal. Whitespace is the design.
 *
 * Visual character:
 *   - Big outer margin (per scout's research, 88px is the Nordic norm)
 *   - Light-weight Onest name, lowercase section headings
 *   - 0.5px hairline rules instead of any color
 *   - No accent color in the layout — pure neutrals
 *   - Generous 40px+ section gap
 *   - Photo top-right circle if user enables it (Nordic norm is no photo,
 *     but some markets expect it)
 *
 * Industry-fit: senior PM, UX researcher, architect, Nordic startup
 * candidates. Restraint reads as senior; busy reads as junior.
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
} from "./shared";
import type { ResumeData } from "@/types/resume";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function CopenhagenTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <header
        data-section-id="personal"
        className="mb-12 cursor-pointer"
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.6em] leading-[1.05] tracking-tight"
              style={{
                color: design.textColor,
                fontFamily: "var(--cv-title-font, var(--font-onest, 'Onest'), Inter, sans-serif)",
                fontWeight: 300,
                ...elementStyle(data, "personal.name"),
              }}
            >
              {personal.fullName || "Your name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-2 block w-fit cursor-text text-[0.95em]"
                style={{
                  color: `${design.textColor}99`,
                  fontFamily: "var(--cv-title-font, var(--font-onest, 'Onest'), sans-serif)",
                  fontWeight: 400,
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
            <ContactStack data={data} />
          </div>
          {design.photo.enabled && personal.photoUrl && (
            <div
              data-element-id="personal.photo"
              className="cursor-grab"
              style={elementStyle(data, "personal.photo")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={personal.photoUrl}
                alt=""
                referrerPolicy="no-referrer"
                draggable={false}
                className="h-20 w-20 rounded-full object-cover"
                // box-shadow + design.photo.borderColor override (Design → Photo → Border)
                style={{ boxShadow: `0 0 0 1px ${design.photo.borderColor || (design.textColor + "1a")}` }}
              />
            </div>
          )}
        </div>
      </header>

      {/* Body — extreme generosity. 40px+ gap reads "I have nothing to hide." */}
      <div className="space-y-10">
        {visible.map((s) => {
          const d = resolveDesign(design, s);
          const titleId = `section.${s.id}.title`;
          return (
            <section
              key={s.id}
              data-section-id={s.id}
              style={positionStyle(s)}
              className="group relative cursor-pointer rounded-md p-1 -m-1"
            >
              <h2
                data-element-id={titleId}
                className="mb-2 inline-block cursor-text text-[0.95em] lowercase"
                style={{
                  color: design.textColor,
                  fontFamily: "var(--cv-title-font, var(--font-onest, 'Onest'), sans-serif)",
                  fontWeight: 500,
                  ...elementStyle(data, titleId),
                }}
              >
                {s.title.toLowerCase()}
              </h2>
              {/* 0.5px hairline rule — the only "decoration" Copenhagen
                  allows. */}
              <div
                className="mb-3 h-px w-full"
                style={{ background: `${design.textColor}1f`, height: "0.5px" }}
              />
              <SectionBody section={s} design={d} data={data} />
              <SectionActions section={s} />
            </section>
          );
        })}
      </div>
    </TemplateFrame>
  );
}

/** Stacked-line contact rather than a horizontal pipe-separated string —
 *  matches Nordic CV conventions where each item is on its own line. */
function ContactStack({ data }: { data: ResumeData }) {
  const { personal, design } = data;
  const grab =
    "block w-fit cursor-text rounded-sm";
  return (
    <div
      className="mt-4 space-y-0.5 text-[0.85em]"
      style={{ color: `${design.textColor}aa` }}
    >
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
            href={l.url.startsWith("http") ? l.url : `https://${l.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${grab} underline-offset-2 hover:underline`}
            style={{
              color: `${design.textColor}cc`,
              ...elementStyle(data, id),
            }}
          >
            {l.label || l.url}
          </a>
        );
      })}
    </div>
  );
}
