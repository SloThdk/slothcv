/**
 * Canvas — illustrator / indie-creative CV. Where Atelier is "gallery
 * brochure", Canvas is "Patreon page header for someone with 8K subs".
 *
 * Visual character:
 *   - Off-white `#fcfbf7` paper-grain background — implemented as a
 *     repeating-linear-gradient at low opacity so the texture reads
 *     subtly across both screen and print
 *   - A soft cyan-to-pink radial-gradient watercolor blob in the
 *     top-right corner (30% opacity, 320×320) — Canvas's painterly
 *     accent, high-character without being twee
 *   - Cyan `#0e7490` accent for section heads and links — matches the
 *     watercolor's cool side
 *   - Lora serif for the name (warm, slightly playful but not Comic-Sans)
 *   - Inter body — keeps it readable; serif body would push too cute
 *   - Single column, asymmetric: section heads sit in a 22% LEFT gutter,
 *     bodies fill the right. Section titles look like margin notes
 *   - Photo enabled by default if available — circular, top-left,
 *     because illustrators OFTEN want a self-portrait or avatar
 *
 * Industry-fit: indie illustrators, comic artists, character designers,
 * tattoo artists with portfolio sites, indie game devs who do their
 * own art, anyone where "personality" is a hireable trait.
 *
 * Hardcoded paper + watercolor blob = Canvas identity. Cyan accent
 * locked. Body color tracks design.textColor so user can shift warmth.
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
import { EditableFallback, EditableSectionTitle } from "./components";

const PAPER = "#fcfbf7";
const CYAN = "#0e7490";
const INK = "#1c1917";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function CanvasTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Paper + texture stack — three layers:
           1. flat paper color base
           2. fine repeating-gradient grain so it feels textured
           3. watercolor blob in the top-right corner
          All aria-hidden, none capture pointer events. */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: PAPER }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          // Cross-hatch paper grain — diagonal repeating gradients give a
          // subtle linen feel without an image asset.
          backgroundImage: `
            repeating-linear-gradient(45deg, rgba(0,0,0,0.012) 0 1px, transparent 1px 4px),
            repeating-linear-gradient(-45deg, rgba(0,0,0,0.012) 0 1px, transparent 1px 4px)
          `,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 -z-10"
        style={{
          // Cyan-to-pink watercolor blob — radial gradient with soft
          // alpha falloff, placed off-canvas so it reads as a torn-edge
          // splash bleeding in.
          background:
            "radial-gradient(closest-side, rgba(14,116,144,0.35), rgba(236,72,153,0.18) 55%, transparent 75%)",
          opacity: 0.55,
          filter: "blur(2px)",
        }}
        aria-hidden
      />

      <div className="relative">
        {/* Header — name LEFT, optional circular photo right. */}
        <header
          data-section-id="personal"
          className="mb-6 flex cursor-pointer items-end justify-between gap-5"
        >
          <div>
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.8em] leading-[1.05] tracking-tight"
              style={{
                color: INK,
                fontFamily: "var(--font-lora, 'Lora'), serif",
                fontWeight: 600,
                ...elementStyle(data, "personal.name"),
              }}
            >
              {personal.fullName || "Your Name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-1 block w-fit cursor-text text-[1em] italic"
                style={{
                  color: CYAN,
                  fontFamily: "var(--font-lora, 'Lora'), serif",
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
            <CanvasContact data={data} />
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
                // box-shadow + design.photo.borderColor override (Design → Photo → Border)
                style={{ boxShadow: `0 0 0 3px transparent, 0 0 0 5px ${design.photo.borderColor || (CYAN + "55")}` }}
              />
            </div>
          )}
        </header>

        <div className="space-y-6">
          {visible.map((s) => (
            <CanvasSection
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

function CanvasContact({ data }: { data: ResumeData }) {
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
    "inline-block cursor-text rounded-sm";
  return (
    <p
      className="mt-2 text-[0.85em]"
      style={{
        color: INK,
        fontFamily: "var(--font-inter, 'Inter'), sans-serif",
      }}
    >
      {items.map((p, i) => (
        <span key={p.id}>
          {i > 0 && (
            <span className="mx-2" style={{ color: `${CYAN}88` }}>
              ◦
            </span>
          )}
          {p.href ? (
            <a
              data-element-id={p.id}
              href={p.href.startsWith("http") ? p.href : `https://${p.href}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${grab} underline-offset-2 hover:underline`}
              style={{ color: CYAN, ...elementStyle(data, p.id) }}
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

/** Each section renders with the title in a 22% LEFT gutter, body in
 *  the right. The gutter title looks like a hand-written margin note. */
function CanvasSection({
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
      className="group relative grid cursor-pointer break-inside-avoid gap-5 rounded-md p-1 -m-1"
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: "22% 1fr", gap: "1.25rem" }}
      >
        <h2
          data-element-id={titleId}
          className="cursor-text text-right text-[0.95em] italic"
          style={{
            color: CYAN,
            fontFamily: "var(--font-lora, 'Lora'), serif",
            fontWeight: 500,
            paddingTop: "0.1em",
            ...elementStyle(data, titleId),
          }}
        >
          <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
        </h2>
        <div>
          <CanvasBody section={section} design={design} data={data} />
        </div>
      </div>
      <SectionActions section={section} />
    </section>
  );
}

function CanvasBody({
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
          className="cursor-text text-[0.95em] leading-[1.6]"
          style={{
            color: INK,
            fontFamily: "var(--font-inter, 'Inter'), sans-serif",
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Tell visitors what you make."}
        </p>
      );
    }
    case "experience":
      return (
        <CanvasExperience section={section} design={design} data={data} />
      );
    default:
      return <CanvasFallback section={section} data={data} />;
  }
}

function CanvasExperience({
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
    <div className="space-y-3.5">
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        return (
          <article
            key={it.id}
            data-element-id={id}
            className="cursor-grab rounded-sm"
            style={elementStyle(data, id)}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3
                className="text-[1em]"
                style={{
                  color: INK,
                  fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                  fontWeight: 700,
                }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.role`} value={it.role} placeholder="Role" />
                {it.company && (
                  <span style={{ color: CYAN, fontWeight: 500 }}>
                    {" · "}
                    <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.company`} value={it.company} placeholder="Company" />
                  </span>
                )}
              </h3>
              <span
                className="text-[0.82em]"
                style={{
                  color: `${INK}88`,
                  fontFamily: "var(--font-inter, 'Inter'), sans-serif",
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
                className="text-[0.82em] italic"
                style={{ color: `${INK}77` }}
              >
                <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.location`} value={it.location} placeholder="Location" />
              </div>
            )}
            <CanvasBullets
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

function CanvasBullets({
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
      className="mt-1.5 space-y-1 pl-3 text-[0.92em] leading-[1.55]"
      style={{
        color: INK,
        fontFamily: "var(--font-inter, 'Inter'), sans-serif",
      }}
    >
      {list.map((b) => {
        const id = `section.${sectionId}.bullet.${b.id}`;
        return (
          <li
            key={b.id}
            data-element-id={id}
            className="flex cursor-text gap-2 rounded-sm"
            style={elementStyle(data, id)}
          >
            <span
              className="select-none"
              style={{ color: CYAN }}
              aria-hidden
            >
              ✿
            </span>
            <span className="flex-1 whitespace-pre-wrap">{b.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function CanvasFallback({
  section,
  data,
}: {
  section: Section;
  data: ResumeData;
}) {
  if ("body" in section && (section as { body?: string }).body) {
    const id = `section.${section.id}.body`;
    return (
      <p
        data-element-id={id}
        className="cursor-text whitespace-pre-wrap text-[0.95em]"
        style={{
          color: INK,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          ...elementStyle(data, id),
        }}
      >
        {(section as { body: string }).body}
      </p>
    );
  }
  if ("items" in section) {
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
    return (
      <div className="flex flex-wrap gap-1.5">
        {visible.map((it) => {
          const id = `section.${section.id}.item.${it.id}`;
          const label = it.name ?? it.text ?? "";
          return (
            <span
              key={it.id}
              data-element-id={id}
              className="cursor-grab rounded-full px-2.5 py-0.5 text-[0.85em]"
              style={{
                background: `${CYAN}10`,
                border: `1px solid ${CYAN}33`,
                color: INK,
                fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                ...elementStyle(data, id),
              }}
            >
              {label}
              {it.proficiency && (
                <span style={{ color: `${CYAN}` }}>
                  {" — "}<EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.proficiency`} value={it.proficiency} placeholder="Proficiency" />
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  }
  return null;
}
