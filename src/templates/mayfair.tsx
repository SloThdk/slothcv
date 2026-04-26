/**
 * Mayfair — London consulting CV. Reads "Cambridge or LSE then Bain";
 * the British answer to Manhattan's New York banking aesthetic.
 *
 * Visual character:
 *   - Cream `#fdfaf6` paper-feel background (overrides design.pageBg —
 *     this is the template's identity, not user-tunable)
 *   - Italic Playfair Display name in deep burgundy `#7e1d1d` — proper
 *     British display serif, the magazine-headline of CVs
 *   - Tiempos-style serif body via Lora — the closest free pairing
 *   - Wide outer flow: 96px implied via inner padding so the page edges
 *     feel intentional, not cramped. Achieved with extra `px-12` wrap
 *     since we can't override TemplateFrame margins
 *   - Section heads in italic small-caps with a single hairline rule;
 *     no all-caps tracking — restraint > shouting
 *   - Single column with optional inline sidebar for short lists
 *     (skills, languages) using `columns-2` flow
 *   - No photo
 *
 * Industry-fit: management consultants (Bain/BCG/McKinsey), corporate
 * lawyers (Magic Circle), strategy & ops at PE firms with London offices,
 * MBA grads from European b-schools.
 *
 * Hardcoded cream + burgundy = Mayfair identity. Body uses INK so users
 * can darken if they like, but the cream stays.
 */

"use client";

import { TemplateFrame } from "./frame";
import { SectionActions } from "./section-actions";
import {
  elementStyle,
  formatDateRange,
  positionStyle,
  visibleBullets,
  visibleSections,
} from "./shared";
import type {
  Bullet,
  ExperienceSection,
  GlobalDesign,
  ResumeData,
  Section,
} from "@/types/resume";

const CREAM = "#fdfaf6";
const BURGUNDY = "#7e1d1d";
const INK = "#1f1612";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function MayfairTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  // Override the page background to Mayfair cream regardless of what's in
  // design.pageBg. We do this by wrapping the entire output in a div with
  // our own bg, and giving the TemplateFrame's content a transparent body
  // styling on top. Clean trick that avoids hacking TemplateFrame.
  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Cream wash — applied behind content so the user's design.pageBg
          (if non-white) is overridden visually for Mayfair. The frame's
          padding still applies, so we add inner horizontal padding for the
          extra "Mayfair gutter" feel. */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: CREAM }}
        aria-hidden
      />
      <div className="relative px-6">
        {/* Header — the page-magazine effect. Italic Playfair name, large.
            Inline rule below as a hairline. */}
        <header
          data-section-id="personal"
          className="mb-8 cursor-pointer pb-4 text-center"
        >
          <h1
            data-element-id="personal.name"
            className="mx-auto block w-fit cursor-text text-[3.2em] leading-[1.05] tracking-tight transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
            style={{
              color: BURGUNDY,
              fontFamily:
                "var(--font-playfair-display, 'Playfair Display'), 'EB Garamond', serif",
              fontWeight: 500,
              fontStyle: "italic",
              ...elementStyle(data, "personal.name"),
            }}
          >
            {personal.fullName || "Your Name"}
          </h1>
          {personal.headline && (
            <p
              data-element-id="personal.headline"
              className="mx-auto mt-2 block w-fit cursor-text text-[1em] italic transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
              style={{
                color: INK,
                fontFamily: "var(--font-lora, 'Lora'), serif",
                fontWeight: 400,
                ...elementStyle(data, "personal.headline"),
              }}
            >
              {personal.headline}
            </p>
          )}
          <MayfairContact data={data} />
          <div
            className="mx-auto mt-4 h-px w-24"
            style={{ background: `${BURGUNDY}88` }}
          />
        </header>

        <div className="space-y-6">
          {visible.map((s) => (
            <MayfairSection
              key={s.id}
              section={s}
              design={design}
              data={data}
            />
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

function MayfairContact({ data }: { data: ResumeData }) {
  const { personal } = data;
  const items: { id: string; label: string; href?: string }[] = [];
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
    "inline-block cursor-text rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/20";
  return (
    <p
      className="mt-3 text-[0.85em] italic"
      style={{
        color: `${INK}cc`,
        fontFamily: "var(--font-lora, 'Lora'), serif",
      }}
    >
      {items.map((p, i) => (
        <span key={p.id}>
          {i > 0 && (
            <span className="mx-2" style={{ color: BURGUNDY }}>
              ·
            </span>
          )}
          {p.href ? (
            <a
              data-element-id={p.id}
              href={p.href.startsWith("http") ? p.href : `https://${p.href}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${grab} underline-offset-2 hover:underline`}
              style={{ color: BURGUNDY, ...elementStyle(data, p.id) }}
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

function MayfairSection({
  section,
  design,
  data,
}: {
  section: Section;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const titleId = `section.${section.id}.title`;
  return (
    <section
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-amber-50/40 hover:ring-2 hover:ring-neutral-900/10"
    >
      {/* Section heading — italic small-caps, modest size, hairline beneath. */}
      <h2
        data-element-id={titleId}
        className="mb-1 inline-block cursor-text text-[1em] italic transition-shadow hover:ring-2 hover:ring-neutral-900/30 hover:ring-offset-2"
        style={{
          color: BURGUNDY,
          fontFamily:
            "var(--font-playfair-display, 'Playfair Display'), serif",
          fontWeight: 600,
          fontVariant: "small-caps",
          letterSpacing: "0.06em",
          ...elementStyle(data, titleId),
        }}
      >
        {section.title}
      </h2>
      <div
        className="mb-3 h-px w-full"
        style={{ background: `${BURGUNDY}55` }}
      />
      <MayfairBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function MayfairBody({
  section,
  design,
  data,
}: {
  section: Section;
  design: GlobalDesign;
  data: ResumeData;
}) {
  switch (section.type) {
    case "summary": {
      const id = `section.${section.id}.body`;
      return (
        <p
          data-element-id={id}
          className="cursor-text text-[1em] leading-[1.6] transition-shadow hover:ring-2 hover:ring-neutral-900/15"
          style={{
            color: INK,
            fontFamily: "var(--font-lora, 'Lora'), serif",
            fontStyle: "italic",
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Add a brief summary."}
        </p>
      );
    }
    case "experience":
      return (
        <MayfairExperience section={section} design={design} data={data} />
      );
    case "skills":
    case "languages":
    case "hobbies":
      // Inline 2-column flow for short lists — keeps the page elegant.
      return <MayfairInlineList section={section} data={data} />;
    default:
      return <MayfairFallback section={section} design={design} data={data} />;
  }
}

function MayfairExperience({
  section,
  design,
  data,
}: {
  section: ExperienceSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-4">
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        return (
          <article
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3
                className="text-[1.05em]"
                style={{
                  color: INK,
                  fontFamily: "var(--font-lora, 'Lora'), serif",
                  fontWeight: 600,
                }}
              >
                {it.role}
                {it.company && (
                  <span
                    className="italic"
                    style={{ color: BURGUNDY, fontWeight: 500 }}
                  >
                    {", "}
                    {it.company}
                  </span>
                )}
              </h3>
              <span
                className="text-[0.85em] italic"
                style={{
                  color: `${INK}99`,
                  fontFamily: "var(--font-lora, 'Lora'), serif",
                }}
              >
                {formatDateRange(
                  it.startDate,
                  it.endDate,
                  it.current,
                  design.dateFormat,
                )}
              </span>
            </div>
            {it.location && (
              <div
                className="text-[0.85em] italic"
                style={{ color: `${INK}77` }}
              >
                {it.location}
              </div>
            )}
            <MayfairBullets
              bullets={it.bullets}
              data={data}
              sectionId={section.id}
            />
          </article>
        );
      })}
    </div>
  );
}

function MayfairBullets({
  bullets,
  data,
  sectionId,
}: {
  bullets: Bullet[];
  data: ResumeData;
  sectionId: string;
}) {
  const list = visibleBullets(bullets);
  if (list.length === 0) return null;
  return (
    <ul
      className="mt-1.5 space-y-0.5 pl-3 text-[0.95em] leading-[1.55]"
      style={{
        color: INK,
        fontFamily: "var(--font-lora, 'Lora'), serif",
      }}
    >
      {list.map((b) => {
        const id = `section.${sectionId}.bullet.${b.id}`;
        return (
          <li
            key={b.id}
            data-element-id={id}
            className="flex cursor-text gap-2 rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <span
              className="select-none"
              style={{ color: BURGUNDY }}
              aria-hidden
            >
              ❦
            </span>
            <span className="flex-1 whitespace-pre-wrap">{b.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Inline 2-col flow for skills/languages/hobbies. The CSS columns trick
 *  splits a flat list across two columns automatically — perfect for 6-12
 *  items, doesn't need bespoke layout per section. */
function MayfairInlineList({
  section,
  data,
}: {
  section: Section;
  data: ResumeData;
}) {
  if (!("items" in section)) return null;
  const its = (section as {
    items: {
      id: string;
      name?: string;
      text?: string;
      proficiency?: string;
      visible: boolean;
    }[];
  }).items;
  const visible = its.filter((i) => i.visible);
  if (visible.length === 0) return null;
  return (
    <ul
      className="columns-2 gap-6 text-[0.95em]"
      style={{
        color: INK,
        fontFamily: "var(--font-lora, 'Lora'), serif",
      }}
    >
      {visible.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        const label = it.name ?? it.text ?? "";
        return (
          <li
            key={it.id}
            data-element-id={id}
            className="mb-0.5 flex cursor-grab break-inside-avoid items-baseline gap-2 rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <span style={{ color: BURGUNDY }} aria-hidden>
              ·
            </span>
            <span>
              {label}
              {it.proficiency && (
                <span className="italic" style={{ color: `${INK}88` }}>
                  {" — "}
                  {it.proficiency}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function MayfairFallback({
  section,
  data,
}: {
  section: Section;
  design: GlobalDesign;
  data: ResumeData;
}) {
  if ("body" in section && (section as { body?: string }).body) {
    const id = `section.${section.id}.body`;
    return (
      <p
        data-element-id={id}
        className="cursor-text whitespace-pre-wrap text-[0.95em] transition-shadow hover:ring-2 hover:ring-neutral-900/15"
        style={{
          color: INK,
          fontFamily: "var(--font-lora, 'Lora'), serif",
          ...elementStyle(data, id),
        }}
      >
        {(section as { body: string }).body}
      </p>
    );
  }
  if ("items" in section) {
    return <MayfairInlineList section={section} data={data} />;
  }
  return null;
}
