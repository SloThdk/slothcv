/**
 * Bento — modern web aesthetic. Six asymmetric cells in a CSS Grid bento
 * box. Rounded white cards on a soft gray bedrock; each cell breathes on
 * its own.
 *
 * Layout (6 cells, gridTemplateAreas):
 *   ┌─────────────┬───────────────┐
 *   │             │ summary       │
 *   │  hero       ├───────────────┤
 *   │  (name+pic) │ contact       │
 *   ├─────────────┴───────────────┤
 *   │  experience (wide)          │
 *   ├──────────────┬──────────────┤
 *   │  skills      │  education   │
 *   └──────────────┴──────────────┘
 *
 * Visual character:
 *   - 24px gap, 16px radius, white card bg with a subtle shadow
 *   - Manrope for everything; rounded-geometric reads "modern web"
 *   - Each card has a 2px colored top accent in the design.accentColor
 *     so the global Design tab can re-tint the whole bento at once
 *
 * Industry-fit: web designers, frontend leads, bootcamp grads applying to
 * "we ship in TypeScript" companies. Looks like a personal landing page
 * compressed into A4.
 *
 * Notes on dynamic sections: Bento has 6 fixed slots. Sections that don't
 * map cleanly (talks, awards, certifications, etc.) fall into a 7th
 * "extras" row below the 6 main cells, each as its own white card. Drag
 * still works on every section thanks to `data-section-id` + `positionStyle`.
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
} from "./shared";
import type { ResumeData, Section } from "@/types/resume";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function BentoTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  // Pull the 4 priority sections; everything else goes to "extras".
  const summary = visible.find((s) => s.type === "summary");
  const experience = visible.find((s) => s.type === "experience");
  const skills = visible.find((s) => s.type === "skills");
  const education = visible.find((s) => s.type === "education");
  const used = new Set(
    [summary, experience, skills, education].filter(Boolean).map((s) => s!.id),
  );
  const extras = visible.filter((s) => !used.has(s.id));

  const accent = design.accentColor;
  const cardCls =
    "relative rounded-2xl bg-white p-4 group cursor-pointer break-inside-avoid";
  const cardStyle: React.CSSProperties = {
    boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
    borderTop: `2px solid ${accent}`,
  };

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* The bento grid — 6 main cells, then a single extras row. */}
      <div
        className="grid gap-6"
        style={{
          fontFamily:
            "var(--font-manrope, 'Manrope'), Inter, sans-serif",
          gridTemplateColumns: "1.05fr 1fr",
          gridAutoRows: "min-content",
        }}
      >
        {/* HERO — name + headline + photo. Spans 2 rows on the left. */}
        <div
          data-section-id="personal"
          className={`${cardCls} row-span-2`}
          style={cardStyle}
        >
          <div className="flex h-full flex-col justify-between gap-3">
            <div>
              <h1
                data-element-id="personal.name"
                className="block w-fit cursor-text text-[2.2em] leading-[1.05] tracking-tight"
                style={{
                  color: design.textColor,
                  fontFamily:
                    "var(--font-manrope, 'Manrope'), sans-serif",
                  fontWeight: 700,
                  ...elementStyle(data, "personal.name"),
                }}
              >
                {personal.fullName || "Your Name"}
              </h1>
              {personal.headline && (
                <p
                  data-element-id="personal.headline"
                  className="mt-1 block w-fit cursor-text text-[0.92em]"
                  style={{
                    color: accent,
                    fontFamily:
                      "var(--font-manrope, 'Manrope'), sans-serif",
                    fontWeight: 600,
                    ...elementStyle(data, "personal.headline"),
                  }}
                >
                  {personal.headline}
                </p>
              )}
            </div>
            {design.photo.enabled && personal.photoUrl && (
              <div
                data-element-id="personal.photo"
                className="cursor-grab"
                style={elementStyle(data, "personal.photo")}
              >
                {/* Square aspect + object-cover + object-top so the face
                    stays visible regardless of source image aspect. The
                    earlier `h-32 w-full object-cover` baked in a 128 px
                    height that, combined with the cell's wide width on
                    large pages, cropped the top + bottom of any portrait
                    image — Philip noticed his head being chopped off.
                    Square + top-anchor matches the convention every CV
                    template that ships avatars uses. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={personal.photoUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  draggable={false}
                  className="aspect-square w-full rounded-xl object-cover object-top"
                />
              </div>
            )}
          </div>
        </div>

        {/* SUMMARY (top-right) */}
        {summary ? (
          <BentoCell
            section={summary}
            data={data}
            cardCls={cardCls}
            cardStyle={cardStyle}
          />
        ) : (
          <PlaceholderCell title="Summary" cardCls={cardCls} cardStyle={cardStyle} />
        )}

        {/* CONTACT (mid-right) — synthetic block; shares `personal` section id */}
        <div
          data-section-id="personal"
          className={cardCls}
          style={cardStyle}
        >
          <h3
            className="mb-1.5 text-[0.78em] uppercase"
            style={{
              color: accent,
              fontWeight: 700,
              letterSpacing: "0.16em",
            }}
          >
            Contact
          </h3>
          <BentoContact data={data} />
        </div>

        {/* EXPERIENCE — full width */}
        {experience ? (
          <div className="col-span-2">
            <BentoCell
              section={experience}
              data={data}
              cardCls={cardCls}
              cardStyle={cardStyle}
            />
          </div>
        ) : (
          <div className="col-span-2">
            <PlaceholderCell title="Experience" cardCls={cardCls} cardStyle={cardStyle} />
          </div>
        )}

        {/* SKILLS (bot-left) */}
        {skills ? (
          <BentoCell
            section={skills}
            data={data}
            cardCls={cardCls}
            cardStyle={cardStyle}
          />
        ) : (
          <PlaceholderCell title="Skills" cardCls={cardCls} cardStyle={cardStyle} />
        )}

        {/* EDUCATION (bot-right) */}
        {education ? (
          <BentoCell
            section={education}
            data={data}
            cardCls={cardCls}
            cardStyle={cardStyle}
          />
        ) : (
          <PlaceholderCell title="Education" cardCls={cardCls} cardStyle={cardStyle} />
        )}

        {/* Extras row — every other visible section, each its own card */}
        {extras.length > 0 &&
          extras.map((s) => (
            <div key={s.id} className="col-span-2">
              <BentoCell
                section={s}
                data={data}
                cardCls={cardCls}
                cardStyle={cardStyle}
              />
            </div>
          ))}
      </div>
    </TemplateFrame>
  );
}

function BentoContact({ data }: { data: ResumeData }) {
  const { personal, design } = data;
  const grab =
    "block w-fit cursor-text rounded-sm";
  return (
    <div
      className="space-y-0.5 text-[0.85em] break-words"
      style={{ color: design.textColor }}
    >
      {personal.email && (
        <div
          data-element-id="personal.email"
          className={grab}
          style={elementStyle(data, "personal.email")}
        >
          {personal.email}
        </div>
      )}
      {personal.phone && (
        <div
          data-element-id="personal.phone"
          className={grab}
          style={elementStyle(data, "personal.phone")}
        >
          {personal.phone}
        </div>
      )}
      {personal.location && (
        <div
          data-element-id="personal.location"
          className={grab}
          style={elementStyle(data, "personal.location")}
        >
          {personal.location}
        </div>
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
            style={{ color: design.accentColor, ...elementStyle(data, id) }}
          >
            {l.label || l.url}
          </a>
        );
      })}
    </div>
  );
}

/** Bento cell wrapper around any section. Renders the section title + body
 *  inside a white-card container; preserves all draggability. */
function BentoCell({
  section,
  data,
  cardCls,
  cardStyle,
}: {
  section: Section;
  data: ResumeData;
  cardCls: string;
  cardStyle: React.CSSProperties;
}) {
  const d = resolveDesign(data.design, section);
  const titleId = `section.${section.id}.title`;
  return (
    <section
      data-section-id={section.id}
      style={{ ...cardStyle, ...positionStyle(section) }}
      className={cardCls}
    >
      <h2
        data-element-id={titleId}
        className="mb-2 inline-block cursor-text text-[0.78em] uppercase"
        style={{
          color: d.accentColor,
          fontFamily: "var(--font-manrope, 'Manrope'), sans-serif",
          fontWeight: 700,
          letterSpacing: "0.16em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <SectionBody section={section} design={d} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function PlaceholderCell({
  title,
  cardCls,
  cardStyle,
}: {
  title: string;
  cardCls: string;
  cardStyle: React.CSSProperties;
}) {
  return (
    <div className={cardCls} style={cardStyle}>
      <h2
        className="mb-1.5 text-[0.78em] uppercase"
        style={{
          color: "#a3a3a3",
          fontWeight: 700,
          letterSpacing: "0.16em",
        }}
      >
        {title}
      </h2>
      <p className="text-[0.85em] italic text-neutral-300">
        Add a {title.toLowerCase()} section to fill this cell.
      </p>
    </div>
  );
}
