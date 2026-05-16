/**
 * Vienna — pure black on pure white. The discipline IS the design.
 *
 * Visual character:
 *   - All caps, bold, tracked H1 name
 *   - All caps tracked section headings with full-width black rule beneath
 *   - No greys, no accent — every line is pure black on pure white
 *   - Single column, ATS-perfect parsing
 *   - Public Sans throughout (US-Gov designed, plain-text-clean)
 *
 * Industry-fit: legal, banking back-office, conservative consulting,
 * academic admin. The hiring market where "any color = trying too hard."
 * Top ATS scorer in the slothcv lineup.
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

export function ViennaTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <header
        data-section-id="personal"
        className="mb-6 cursor-pointer pb-3"
        style={{ borderBottom: "1px solid #000" }}
      >
        <h1
          data-element-id="personal.name"
          className="block w-fit cursor-text text-[2.2em] uppercase leading-[1.1]"
          style={{
            color: "#000",
            fontFamily: "var(--cv-title-font, var(--font-public-sans, 'Public Sans'), Inter, sans-serif)",
            fontWeight: 700,
            letterSpacing: "0.04em",
            ...elementStyle(data, "personal.name"),
          }}
        >
          {personal.fullName || "Your Name"}
        </h1>
        {personal.headline && (
          <p
            data-element-id="personal.headline"
            className="mt-1 block w-fit cursor-text text-[0.92em] uppercase"
            style={{
              color: "#000",
              fontFamily: "var(--cv-title-font, var(--font-public-sans, 'Public Sans'), sans-serif)",
              fontWeight: 600,
              letterSpacing: "0.10em",
              ...elementStyle(data, "personal.headline"),
            }}
          >
            {personal.headline}
          </p>
        )}
        <ContactPipe data={data} />
      </header>

      <div className="space-y-5">
        {visible.map((s) => {
          const d = resolveDesign(design, s);
          const titleId = `section.${s.id}.title`;
          return (
            <section
              key={s.id}
              data-section-id={s.id}
              style={positionStyle(s)}
              className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1"
            >
              <h2
                data-element-id={titleId}
                className="mb-1.5 inline-block cursor-text text-[0.78em] uppercase"
                style={{
                  color: "#000",
                  fontFamily: "var(--cv-title-font, var(--font-public-sans, 'Public Sans'), sans-serif)",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  ...elementStyle(data, titleId),
                }}
              >
                {s.title.toUpperCase()}
              </h2>
              <div className="mb-2.5 h-px w-full bg-black" />
              <SectionBody section={s} design={{ ...d, accentColor: "#000", textColor: "#000" }} data={data} />
              <SectionActions section={s} />
            </section>
          );
        })}
      </div>
    </TemplateFrame>
  );
}

/** Pipe-separated contact line — minimum chrome, max content. */
function ContactPipe({ data }: { data: ResumeData }) {
  const { personal } = data;
  const items: { id: string; label: string; href?: string }[] = [];
  if (personal.email) items.push({ id: "personal.email", label: personal.email });
  if (personal.phone) items.push({ id: "personal.phone", label: personal.phone });
  if (personal.location)
    items.push({ id: "personal.location", label: personal.location });
  for (const l of personal.links) {
    items.push({
      id: `personal.links.${l.id}`,
      label: l.label || l.url,
      href: l.url,
    });
  }
  if (items.length === 0) return null;
  const grab =
    "inline-block cursor-text rounded-sm";
  return (
    <p className="mt-2 text-[0.85em]" style={{ color: "#000" }}>
      {items.map((p, i) => (
        <span key={p.id}>
          {i > 0 && <span className="mx-2">|</span>}
          {p.href ? (
            <a
              data-element-id={p.id}
              href={p.href.startsWith("http") ? p.href : `https://${p.href}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${grab} underline-offset-2 hover:underline`}
              style={elementStyle(data, p.id)}
            >
              {p.label}
            </a>
          ) : (
            <span
              data-element-id={p.id}
              className={grab}
              style={elementStyle(data, p.id)}
            >
              {p.label}
            </span>
          )}
        </span>
      ))}
    </p>
  );
}
