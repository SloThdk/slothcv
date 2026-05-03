/**
 * Helsinki — typography-forward, single column, magazine vibe.
 *
 * Visual character:
 *   - Big serif name (Playfair-ish) with thin tracking
 *   - Italic role tagline
 *   - Section headers: tracked uppercase WITH a thin full-width rule
 *     beneath. Reads like a feature article's section break.
 *   - No photo (typography does the work — that's the pitch).
 *   - Generous breathing room between sections.
 *   - Contact line styled as a subtle pipe-separated string under the
 *     header, no bullets, no boxes.
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

export function HelsinkiTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <header
        data-section-id="personal"
        className="mb-7 cursor-pointer rounded-md p-1 -m-1 transition-colors"
      >
        <h1
          data-element-id="personal.name"
          className="block w-fit cursor-text text-[3em] font-medium leading-[1.02] tracking-tight"
          style={{
            fontFamily: `'Playfair Display', 'Source Serif 4', serif`,
            ...elementStyle(data, "personal.name"),
          }}
        >
          {personal.fullName || "Your name"}
        </h1>
        {personal.headline && (
          <p
            data-element-id="personal.headline"
            className="mt-1 block w-fit cursor-text text-[1.1em] italic text-neutral-700"
            style={elementStyle(data, "personal.headline")}
          >
            {personal.headline}
          </p>
        )}
        <PipeContactLine data={data} />
      </header>

      {visible.map((s, idx) => {
        const d = resolveDesign(design, s);
        return (
          <section
            key={s.id}
            data-section-id={s.id}
            style={positionStyle(s)}
            className={`group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 ${idx === 0 ? "" : "mt-7"}`}
          >
            <div className="mb-3 flex items-center gap-3">
              <h2
                className="text-[0.82em] font-semibold uppercase tracking-[0.28em]"
                style={{ color: d.accentColor }}
              >
                <EditableSectionTitle sid={s.id} data={data}>{transformHeader(s.title, d)}</EditableSectionTitle>
              </h2>
              <span
                className="h-px flex-1"
                style={{ background: `${d.accentColor}40` }}
              />
            </div>
            <SectionBody section={s} design={d} data={data} />
            <SectionActions section={s} />
          </section>
        );
      })}
    </TemplateFrame>
  );
}

/** Compact pipe-separated contact line. Each item is its own draggable
 *  element so the user can nudge email / phone / location / each link
 *  individually. */
function PipeContactLine({ data }: { data: ResumeData }) {
  const { personal, design } = data;
  const items: {
    id: string;
    label: string;
    href?: string;
  }[] = [];
  if (personal.email)
    items.push({ id: "personal.email", label: personal.email });
  if (personal.phone)
    items.push({ id: "personal.phone", label: personal.phone });
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
    "block w-fit cursor-text rounded-sm";
  return (
    <p className="mt-3 text-[0.85em] text-neutral-600">
      {items.map((p, i) => (
        <span key={p.id}>
          {i > 0 && <span className="mx-2 opacity-60">·</span>}
          {p.href ? (
            <a
              data-element-id={p.id}
              href={normalizeHref(p.href)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${grab} underline-offset-2 hover:underline`}
              style={{
                color: design.accentColor,
                ...elementStyle(data, p.id),
              }}
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

function normalizeHref(s: string): string {
  const t = s.trim();
  const lower = t.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "#";
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:")
  )
    return t;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(t)) return `https://${t}`;
  return "#";
}
