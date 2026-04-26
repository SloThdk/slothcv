/**
 * Studio — magazine-spread CV for photographers, directors, art-direction
 * leads. Reads "Vogue contributor page" or "AnotherMag staff bio".
 *
 * Visual character:
 *   - HUGE Inter Display name at 5em+ filling the upper-left
 *   - Hero image area to the RIGHT (uses personal.photoUrl, blown to
 *     240×160, object-cover) — the image IS the design when present.
 *     When no photo, we render a black rectangular placeholder so the
 *     spread still reads as a magazine page rather than collapsing
 *   - BELOW: dense two-column body with a deliberate visual asymmetry —
 *     left column 60%, right 40%. Items flow into the wider one
 *   - All-caps ultra-tracked section heads, very tight to body — the
 *     "magazine sub-head" effect
 *   - Inter throughout, no serifs — the modern fashion photography vibe
 *     (Magnum has a serif aesthetic; Studio is more The Gentlewoman / SSENSE)
 *   - Pure neutrals: black on `#fafafa`, no accent — let the photo color
 *
 * Industry-fit: photographers, fashion directors, set designers, music
 * video directors, anyone whose deliverable is "look at this image".
 *
 * Hardcoded near-black + warm-white. Photo is REQUIRED for full effect
 * but template degrades gracefully without one.
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

const INK = "#0a0a0a";
const SURFACE = "#fafafa";
const MUTED = "#737373";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function StudioTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Surface wash — Studio neutral. */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: SURFACE }}
        aria-hidden
      />

      {/* Hero band — name LEFT, image RIGHT. Magazine masthead. */}
      <header
        data-section-id="personal"
        className="mb-7 grid cursor-pointer gap-6"
        style={{ gridTemplateColumns: "1fr 240px" }}
      >
        <div className="flex flex-col justify-between">
          {/* Tiny issue-style label above the name — magazine convention. */}
          <div
            className="text-[0.7em] uppercase"
            style={{
              color: MUTED,
              fontFamily: "var(--font-inter, 'Inter'), sans-serif",
              fontWeight: 600,
              letterSpacing: "0.32em",
            }}
          >
            Portfolio · Issue 01
          </div>
          <h1
            data-element-id="personal.name"
            className="block w-fit cursor-text text-[5em] leading-[0.9] tracking-tight transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
            style={{
              color: INK,
              fontFamily: "var(--font-inter, 'Inter'), sans-serif",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              ...elementStyle(data, "personal.name"),
            }}
          >
            {personal.fullName || "Your Name"}
          </h1>
          {personal.headline && (
            <p
              data-element-id="personal.headline"
              className="block w-fit cursor-text text-[0.95em] uppercase transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
              style={{
                color: INK,
                fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                fontWeight: 500,
                letterSpacing: "0.16em",
                ...elementStyle(data, "personal.headline"),
              }}
            >
              {personal.headline}
            </p>
          )}
        </div>
        <HeroImage
          enabled={design.photo.enabled}
          url={personal.photoUrl}
          data={data}
        />
      </header>
      <StudioContact data={data} />

      {/* Black hairline rule below header — stops body from feeling unrelated. */}
      <div
        className="my-5 h-px w-full"
        style={{ background: INK, opacity: 0.6 }}
      />

      {/* Body — two-column 60/40 (asymmetric on purpose). */}
      <div className="grid gap-7" style={{ gridTemplateColumns: "60% 1fr" }}>
        <div className="space-y-5">
          {visible
            .filter((s, i) => i % 2 === 0)
            .map((s) => (
              <StudioSection
                key={s.id}
                section={s}
                design={design}
                data={data}
              />
            ))}
        </div>
        <div className="space-y-5">
          {visible
            .filter((s, i) => i % 2 === 1)
            .map((s) => (
              <StudioSection
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

/** Hero image — fills the right column. Falls back to a flat black tile
 *  when no photo is set, preserving the masthead silhouette. */
function HeroImage({
  enabled,
  url,
  data,
}: {
  enabled: boolean;
  url?: string;
  data: ResumeData;
}) {
  const showPhoto = enabled && url;
  return (
    <div
      data-element-id="personal.photo"
      className="cursor-grab"
      style={elementStyle(data, "personal.photo")}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          referrerPolicy="no-referrer"
          draggable={false}
          className="h-40 w-60 object-cover"
        />
      ) : (
        <div
          className="flex h-40 w-60 items-end p-3"
          style={{ background: INK, color: SURFACE }}
        >
          <span
            className="text-[0.7em] uppercase"
            style={{
              fontFamily: "var(--font-inter, 'Inter'), sans-serif",
              fontWeight: 600,
              letterSpacing: "0.18em",
              opacity: 0.7,
            }}
          >
            Image
          </span>
        </div>
      )}
    </div>
  );
}

function StudioContact({ data }: { data: ResumeData }) {
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
      className="text-[0.78em] uppercase"
      style={{
        color: INK,
        fontFamily: "var(--font-inter, 'Inter'), sans-serif",
        fontWeight: 500,
        letterSpacing: "0.18em",
      }}
    >
      {items.map((p, i) => (
        <span key={p.id}>
          {i > 0 && (
            <span className="mx-3" style={{ color: MUTED }}>
              ·
            </span>
          )}
          {p.href ? (
            <a
              data-element-id={p.id}
              href={p.href.startsWith("http") ? p.href : `https://${p.href}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${grab} underline-offset-4 hover:underline`}
              style={{ color: INK, ...elementStyle(data, p.id) }}
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

function StudioSection({
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
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-neutral-200/40 hover:ring-2 hover:ring-neutral-900/10"
    >
      {/* Magazine sub-head: tight to body, ALL-CAPS tracked, with a small
          black square ahead of it — gives every section a "department" tag. */}
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-block h-2 w-2"
          style={{ background: INK }}
          aria-hidden
        />
        <h2
          data-element-id={titleId}
          className="inline-block cursor-text text-[0.78em] uppercase transition-shadow hover:ring-2 hover:ring-neutral-900/30 hover:ring-offset-2"
          style={{
            color: INK,
            fontFamily: "var(--font-inter, 'Inter'), sans-serif",
            fontWeight: 700,
            letterSpacing: "0.22em",
            ...elementStyle(data, titleId),
          }}
        >
          {section.title}
        </h2>
      </div>
      <StudioBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function StudioBody({
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
          className="cursor-text text-[0.95em] leading-[1.55] transition-shadow hover:ring-2 hover:ring-neutral-900/15"
          style={{
            color: INK,
            fontFamily: "var(--font-inter, 'Inter'), sans-serif",
            ...elementStyle(data, id),
          }}
        >
          {section.body || "Add an artist statement."}
        </p>
      );
    }
    case "experience":
      return (
        <StudioExperience section={section} design={design} data={data} />
      );
    default:
      return <StudioFallback section={section} data={data} />;
  }
}

function StudioExperience({
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
            className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <div
              className="text-[0.78em] uppercase"
              style={{
                color: MUTED,
                fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                fontWeight: 500,
                letterSpacing: "0.18em",
              }}
            >
              {formatDateRange(
                it.startDate,
                it.endDate,
                it.current,
                design.dateFormat,
              )}
            </div>
            <h3
              className="text-[1.05em]"
              style={{
                color: INK,
                fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                fontWeight: 700,
              }}
            >
              {it.role}
              {it.company && (
                <span style={{ color: MUTED, fontWeight: 400 }}>
                  {" — "}
                  {it.company}
                </span>
              )}
            </h3>
            {it.location && (
              <div
                className="text-[0.82em]"
                style={{ color: MUTED }}
              >
                {it.location}
              </div>
            )}
            <StudioBullets
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

function StudioBullets({
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
      className="mt-1 space-y-0.5 text-[0.92em] leading-[1.5]"
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
            className="flex cursor-text gap-2 rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <span className="select-none" aria-hidden>
              —
            </span>
            <span className="flex-1 whitespace-pre-wrap">{b.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function StudioFallback({
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
        className="cursor-text whitespace-pre-wrap text-[0.95em] transition-shadow hover:ring-2 hover:ring-neutral-900/15"
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
      <ul
        className="space-y-0.5 text-[0.92em]"
        style={{
          color: INK,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
        }}
      >
        {visible.map((it) => {
          const id = `section.${section.id}.item.${it.id}`;
          const label = it.name ?? it.text ?? "";
          return (
            <li
              key={it.id}
              data-element-id={id}
              className="flex cursor-grab items-baseline justify-between gap-2 rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
              style={elementStyle(data, id)}
            >
              <span className="font-medium">{label}</span>
              {it.proficiency && (
                <span
                  className="text-[0.82em]"
                  style={{ color: MUTED }}
                >
                  {it.proficiency}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    );
  }
  return null;
}
