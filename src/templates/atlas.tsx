/**
 * Atlas — travel writer / foreign correspondent / international consultant.
 * Pin-style location markers and a stylized continent silhouette in the
 * background give the CV a "passport stamp" feel without being cheesy.
 *
 * Visual character:
 *   - Sky blue `#0369a1` accent throughout — the only color besides ink
 *   - Lora serif for the name (romantic, slightly editorial), Inter for
 *     body (readable for dense bylines)
 *   - Cream `#fefdf8` body so the page reads "old-paper" without going
 *     full vintage
 *   - A faint stylized world-map SVG silhouette sits absolutely behind
 *     the content at ~5% opacity — readable but adds depth
 *   - Pin markers (📍 SVG) appear before each `it.location` in experience
 *     and project entries, drawing the eye to the geographic axis
 *   - Section headings are titlecase with a small pin icon — never caps,
 *     since this template's voice is editorial, not corporate
 *
 * Industry-fit: foreign correspondents, travel editors, NGO field
 * coordinators, international development, remote-first leaders, anyone
 * whose CV is a list of cities.
 *
 * Hardcoded colors: sky `#0369a1` accent + cream `#fefdf8` body are
 * intrinsic; design.textColor still applies to body prose.
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
import type { ResumeData, Section } from "@/types/resume";

const SKY = "#0369a1";
const CREAM = "#fefdf8";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function AtlasTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Cream paper background — overrides design.pageBg for identity. */}
      <div
        className="absolute inset-0"
        style={{ background: CREAM, zIndex: 0 }}
        aria-hidden
      />

      {/* Stylized continent silhouette behind everything, low opacity */}
      <WorldMapBackdrop />

      <div
        className="relative z-[1]"
        style={{
          fontFamily: "var(--font-inter, 'Inter'), system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <header
          data-section-id="personal"
          className="mb-6 flex cursor-pointer items-start justify-between gap-4 pb-3"
          style={{ borderBottom: `1px solid ${SKY}80` }}
        >
          <div className="flex-1">
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.6em] leading-[1.05] tracking-tight"
              style={{
                color: design.textColor,
                fontFamily: "var(--font-lora, 'Lora'), Georgia, serif",
                fontWeight: 600,
                ...elementStyle(data, "personal.name"),
              }}
            >
              {personal.fullName || "Your Name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-1 block w-fit cursor-text text-[0.95em] italic"
                style={{
                  color: SKY,
                  fontFamily: "var(--font-lora, 'Lora'), Georgia, serif",
                  fontWeight: 400,
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
            <AtlasContact data={data} />
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
                className="h-24 w-24 rounded-full object-cover"
                // box-shadow + design.photo.borderColor override so users can
                // recolor the ring via Design → Photo → Border. Falls back to
                // the template's SKY when no override is set.
                style={{ boxShadow: `0 0 0 2px ${design.photo.borderColor || SKY}` }}
              />
            </div>
          )}
        </header>

        {/* Body — single column flow */}
        <div className="space-y-5">
          {visible.map((s) => (
            <AtlasSection key={s.id} section={s} data={data} />
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

/** Stylized continent silhouette, drawn as a simple SVG path approximating
 *  the major continental shapes. Low opacity so it sits behind text. */
function WorldMapBackdrop() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: 0.05, zIndex: 0 }}
      viewBox="0 0 800 1000"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Approximation: pill shapes massed together to suggest continents */}
      <g fill={SKY}>
        {/* North America */}
        <path d="M80 220 Q60 180 110 150 Q170 130 230 160 Q270 200 250 270 Q200 320 130 290 Q70 280 80 220 Z" />
        {/* South America */}
        <path d="M180 380 Q160 350 200 340 Q260 360 250 460 Q230 540 200 520 Q170 480 180 380 Z" />
        {/* Africa */}
        <path d="M390 320 Q380 280 430 260 Q490 280 510 360 Q500 470 460 510 Q410 510 390 470 Q370 410 390 320 Z" />
        {/* Europe */}
        <path d="M380 200 Q400 170 450 180 Q510 200 480 250 Q420 280 380 250 Z" />
        {/* Asia */}
        <path d="M540 180 Q620 150 700 200 Q740 280 700 340 Q620 360 560 320 Q500 270 540 180 Z" />
        {/* Australia */}
        <path d="M650 530 Q670 510 720 525 Q750 560 720 590 Q670 600 640 580 Q620 550 650 530 Z" />
      </g>
    </svg>
  );
}

/** Pin marker SVG — drawn with a path so it scales with text size. */
function PinIcon({ color = SKY, size = 12 }: { color?: string; size?: number }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="inline-block flex-shrink-0"
      style={{ verticalAlign: "-2px", marginRight: "4px" }}
    >
      <path
        fill={color}
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5 -2.5 2.5z"
      />
    </svg>
  );
}

function AtlasContact({ data }: { data: ResumeData }) {
  const { personal, design } = data;
  const grab =
    "cursor-text rounded-sm";
  return (
    <div
      className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[0.85em]"
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
          style={{ color: SKY, ...elementStyle(data, "personal.location") }}
        >
          <PinIcon size={11} />
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
            style={{ color: SKY, ...elementStyle(data, id) }}
          >
            {l.label || l.url}
          </a>
        );
      })}
    </div>
  );
}

function AtlasSection({
  section,
  data,
}: {
  section: Section;
  data: ResumeData;
}) {
  const d = resolveDesign(data.design, section);
  const titleId = `section.${section.id}.title`;
  return (
    <section
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1"
    >
      <h2
        data-element-id={titleId}
        className="mb-1.5 inline-flex items-center cursor-text text-[1em]"
        style={{
          color: SKY,
          fontFamily: "var(--font-lora, 'Lora'), Georgia, serif",
          fontWeight: 600,
          ...elementStyle(data, titleId),
        }}
      >
        <PinIcon size={13} />
        {titleCase(section.title)}
      </h2>
      <div
        className="mb-2 h-px w-full"
        style={{
          background: `repeating-linear-gradient(90deg, ${SKY}66 0 4px, transparent 4px 8px)`,
        }}
      />
      <SectionBody
        section={section}
        design={{ ...d, accentColor: SKY }}
        data={data}
      />
      <SectionActions section={section} />
    </section>
  );
}

/** Atlas voices section titles in title case rather than upper. */
function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}
