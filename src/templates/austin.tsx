/**
 * Austin — 1:1 port of PhilipSlothCV (the canonical HTML/CSS source
 * lives at C:/Users/phili/Sync/PhilipSlothCV — style.css + cv-en.html
 * are the visual contract). Dark mint-on-charcoal developer CV, A4
 * print-first, designed for full-stack-and-3D generalists.
 *
 * Why every number / color in this file is hardcoded:
 *   The canonical source ships as raw HTML+CSS at a fixed A4 scale.
 *   Slothcv's editor renders the same component at a scaled-down
 *   preview, so the template uses em units (relative to the slothcv
 *   base) but the color palette and proportional ratios are locked
 *   to the source. A user editing this template can still change the
 *   accent color etc. via the design panel; the template's `themed`
 *   override re-locks the three identity colors (page bg, ink, mint
 *   accent) so the gallery card always reads as Austin.
 *
 * Palette (single source of truth — change them together or not at all):
 *   --bg          #0c1410   page background (cool charcoal-green)
 *   --ink         #e8ece9   primary body text
 *   --ink-soft    #b6c1bb   secondary text (job descriptions, contact)
 *   --ink-mute    #7c8a83   labels in personal-info rows
 *   --mint        #4ee6a8   accent — name role, section heads, links, dates
 *   --mint-dim    #38a87a   bottom-left "CV" wordmark via watermark API
 *   --mint-line   rgba(.35) hairline dividers between sidebar and main
 *   --pill-bg     #1a2520   pill background
 *   --pill-border rgba(.18) pill outline
 *   --dotted      rgba white 8% — dotted rule under each personal-info row
 *
 * Industry-fit: full-stack developers, 3D / VFX artists who also code,
 * indie hackers, creator-developers who ship both code and visuals.
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

const BG = "#0c1410";
const INK = "#e8ece9";
const INK_SOFT = "#b6c1bb";
const INK_MUTE = "#7c8a83";
const MINT = "#4ee6a8";
const MINT_LINE = "rgba(78, 230, 168, 0.35)";
const PILL_BG = "#1a2520";
const PILL_BORDER = "rgba(78, 230, 168, 0.18)";
const DOTTED_RULE = "rgba(255, 255, 255, 0.08)";

// Section types that render in the left sidebar. Personal-Info, skills,
// education, languages, certifications, hobbies, references all live there.
// Everything else (summary, experience, projects) goes to the main column.
const SIDEBAR_TYPES = new Set<Section["type"]>([
  "skills",
  "languages",
  "certifications",
  "hobbies",
  "references",
  "education",
  "custom",
]);

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function AustinTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const sidebar = visible.filter((s) => SIDEBAR_TYPES.has(s.type));
  const main = visible.filter((s) => !SIDEBAR_TYPES.has(s.type));

  // Override the user's design palette with the Austin identity. Page bg,
  // accent, and text stay locked; everything else (fonts, per-element
  // overrides via the inline editor) flows through normally.
  const themed: ResumeData = {
    ...data,
    design: {
      ...design,
      pageBg: BG,
      accentColor: MINT,
      textColor: INK,
    },
  };

  return (
    <TemplateFrame
      data={themed}
      fixedSize={fixedSize}
      skipOverlay={skipOverlay}
    >
      {/* Header: name + role + contact (left, 1fr) | round photo (right).
          Canonical CSS: .header { grid-template-columns: 1fr auto; gap: 10mm }
          The role uses 0.32em letter-spacing — wide enough to feel like a
          tag-line, narrow enough to stay legible at preview scale. */}
      <header
        data-section-id="personal"
        className="grid items-center cursor-pointer mb-[4mm] pb-[4mm]"
        style={{ gridTemplateColumns: "1fr auto", gap: "10mm" }}
      >
        <div className="min-w-0">
          <h1
            data-element-id="personal.name"
            className="block w-fit cursor-text leading-[1.05] mb-[4mm]"
            style={{
              fontSize: "3.2em",
              fontWeight: 300,
              letterSpacing: "-0.01em",
              color: "#ffffff",
              ...elementStyle(data, "personal.name"),
            }}
          >
            {personal.fullName || "Your name"}
          </h1>
          {personal.headline && (
            <div
              data-element-id="personal.headline"
              className="block w-fit cursor-text uppercase mb-[6mm]"
              style={{
                fontSize: "0.85em",
                fontWeight: 500,
                letterSpacing: "0.32em",
                color: MINT,
                ...elementStyle(data, "personal.headline"),
              }}
            >
              {personal.headline}
            </div>
          )}
          <AustinContact data={data} />
        </div>
        {design.photo.enabled && personal.photoUrl && (
          <div
            data-element-id="personal.photo"
            className="shrink-0 cursor-grab"
            style={elementStyle(data, "personal.photo")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={personal.photoUrl}
              alt=""
              referrerPolicy="no-referrer"
              draggable={false}
              className="rounded-full object-cover"
              style={{
                width: "38mm",
                height: "38mm",
                border: `1px solid ${MINT_LINE}`,
              }}
            />
          </div>
        )}
      </header>

      {/* Body grid: 56mm sidebar + 1fr main, 8mm gap, with a 1px mint-line
          vertical divider absolutely positioned between the columns to
          match the canonical .body-grid::before pseudo-element. */}
      <div
        className="grid relative"
        style={{ gridTemplateColumns: "56mm 1fr", gap: "8mm" }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 bottom-0"
          style={{ left: "56mm", width: "1px", background: MINT_LINE }}
        />

        <aside
          className="flex flex-col"
          style={{ paddingRight: "6mm", gap: "5mm" }}
        >
          {sidebar.map((s) => (
            <SidebarSection key={s.id} section={s} data={data} />
          ))}
        </aside>

        <div
          className="flex flex-col"
          style={{ paddingLeft: "4mm", gap: "6mm" }}
        >
          {main.map((s, i) => (
            <MainSection
              key={s.id}
              section={s}
              data={data}
              addDividerAbove={i > 0}
            />
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

/**
 * Contact stack under the name. Renders email / phone / location / each
 * link as one row per line, mint-colored where the row is clickable.
 * Each item carries a stable data-element-id so the inline editor can
 * target it individually.
 */
function AustinContact({ data }: { data: ResumeData }) {
  const { personal } = data;
  const rows: { id: string; label: string; href?: string }[] = [];
  if (personal.email)
    rows.push({
      id: "personal.email",
      label: personal.email,
      href: `mailto:${personal.email}`,
    });
  if (personal.phone)
    rows.push({
      id: "personal.phone",
      label: personal.phone,
      href: `tel:${personal.phone.replace(/\s/g, "")}`,
    });
  if (personal.location)
    rows.push({ id: "personal.location", label: personal.location });
  for (const l of personal.links) {
    rows.push({
      id: `personal.links.${l.id}`,
      label: l.label || l.url,
      href: l.url,
    });
  }
  if (rows.length === 0) return null;
  return (
    <div
      className="grid"
      style={{ gap: "1.5mm", fontSize: "0.9em", color: INK_SOFT }}
    >
      {rows.map((it) => (
        <span key={it.id}>
          {it.href ? (
            <a
              data-element-id={it.id}
              href={
                it.href.startsWith("http") ||
                it.href.startsWith("mailto:") ||
                it.href.startsWith("tel:")
                  ? it.href
                  : `https://${it.href}`
              }
              target={
                it.href.startsWith("mailto:") || it.href.startsWith("tel:")
                  ? undefined
                  : "_blank"
              }
              rel="noopener noreferrer"
              className="cursor-text"
              style={{
                color: MINT,
                textDecoration: "none",
                ...elementStyle(data, it.id),
              }}
            >
              {it.label}
            </a>
          ) : (
            <span
              data-element-id={it.id}
              className="cursor-text"
              style={elementStyle(data, it.id)}
            >
              {it.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/**
 * Sidebar block. Section title in tracked mint, body varies by section
 * type: skills → pill cluster, custom (Personal Info pattern) → dotted
 * Label/Value rows, education → school-name + place + years, everything
 * else falls through to the shared SectionBody.
 */
function SidebarSection({
  section,
  data,
}: {
  section: Section;
  data: ResumeData;
}) {
  const d = resolveDesign(data.design, section);
  const titleId = `section.${section.id}.title`;
  return (
    <div
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1"
    >
      <h2
        data-element-id={titleId}
        className="inline-block cursor-text uppercase"
        style={{
          fontSize: "0.75em",
          fontWeight: 600,
          letterSpacing: "0.28em",
          color: MINT,
          marginBottom: "2.5mm",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>
          {section.title}
        </EditableSectionTitle>
      </h2>
      {section.type === "skills" ? (
        <SkillChips section={section} />
      ) : section.type === "custom" ? (
        <InfoRows body={section.body} />
      ) : section.type === "education" ? (
        <EduList section={section} />
      ) : (
        <SectionBody section={section} design={d} data={data} />
      )}
      <SectionActions section={section} />
    </div>
  );
}

/**
 * Pill-style chip rendering. Specific pill background, mint-18% border,
 * 2mm border-radius — canonical .pill values. The whole cluster wraps;
 * each chip stays one line.
 */
function SkillChips({ section }: { section: Section }) {
  if (section.type !== "skills") return null;
  return (
    <div
      className="flex flex-wrap"
      style={{ gap: "1.4mm" }}
    >
      {section.items
        .filter((it) => it.visible !== false)
        .map((it) => (
          <span
            key={it.id}
            style={{
              fontSize: "0.75em",
              padding: "1mm 2.4mm",
              background: PILL_BG,
              border: `1px solid ${PILL_BORDER}`,
              borderRadius: "2mm",
              color: INK,
              lineHeight: 1.2,
            }}
          >
            {it.name}
          </span>
        ))}
    </div>
  );
}

/**
 * Renders a custom-section body as Label/Value rows with a dotted
 * separator under each row. Parses "Label: Value" lines from the
 * section's free-text body. If a line doesn't contain a colon, it's
 * rendered as a single-cell value with no label — graceful fallback.
 *
 * This is the format the Personal-Info section in the canonical CV
 * uses (Born / Age / Nationality). The schema didn't add a dedicated
 * "person details" type because custom + "Label: Value" lines is
 * editable by the user in the standard custom-section editor.
 */
function InfoRows({ body }: { body: string }) {
  const lines = body
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (lines.length === 0) return null;
  return (
    <div className="grid" style={{ gap: "1.2mm", fontSize: "0.85em" }}>
      {lines.map((line, i) => {
        const colonAt = line.indexOf(":");
        const label = colonAt >= 0 ? line.slice(0, colonAt).trim() : "";
        const value = colonAt >= 0 ? line.slice(colonAt + 1).trim() : line;
        return (
          <div
            key={i}
            className="grid"
            style={{
              gridTemplateColumns: "auto 1fr",
              gap: "2mm",
              borderBottom: `1px dotted ${DOTTED_RULE}`,
              paddingBottom: "1mm",
            }}
          >
            <span style={{ color: INK_MUTE }}>{label}</span>
            <span style={{ color: INK, textAlign: "right" }}>{value}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Sidebar education rendering. Match the canonical .edu-item shape:
 * institution+degree on a 10pt bold white line, free location below
 * in soft ink, year range in muted ink. Multiple items stack with
 * a small gap.
 */
function EduList({ section }: { section: Section }) {
  if (section.type !== "education") return null;
  return (
    <div className="flex flex-col" style={{ gap: "3mm" }}>
      {section.items
        .filter((it) => it.visible !== false)
        .map((it) => {
          const titleLine = [it.degree, it.field].filter(Boolean).join(" ");
          return (
            <div key={it.id}>
              <div
                style={{
                  fontSize: "1em",
                  fontWeight: 600,
                  color: "#ffffff",
                  marginBottom: "0.5mm",
                }}
              >
                {titleLine || it.institution}
              </div>
              {titleLine && (
                <div style={{ fontSize: "0.85em", color: INK_SOFT }}>
                  {it.institution}
                </div>
              )}
              {(it.startDate || it.endDate) && (
                <div style={{ fontSize: "0.8em", color: INK_MUTE }}>
                  {[it.startDate, it.endDate].filter(Boolean).join(" — ")}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

/**
 * Main column section. Profile renders as styled paragraphs; experience
 * uses the title+year+link+description layout that defines the template.
 * Adds a horizontal mint divider above every section after the first to
 * match the canonical .divider between Profile and Experience.
 */
function MainSection({
  section,
  data,
  addDividerAbove,
}: {
  section: Section;
  data: ResumeData;
  addDividerAbove: boolean;
}) {
  const d = resolveDesign(data.design, section);
  const titleId = `section.${section.id}.title`;
  return (
    <>
      {addDividerAbove && (
        <div
          aria-hidden
          style={{ height: "1px", background: MINT_LINE, margin: "1mm 0" }}
        />
      )}
      <section
        data-section-id={section.id}
        style={positionStyle(section)}
        className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1"
      >
        <h2
          data-element-id={titleId}
          className="inline-block cursor-text uppercase"
          style={{
            fontSize: "0.75em",
            fontWeight: 600,
            letterSpacing: "0.28em",
            color: MINT,
            marginBottom: "2.5mm",
            ...elementStyle(data, titleId),
          }}
        >
          <EditableSectionTitle sid={section.id} data={data}>
            {section.title}
          </EditableSectionTitle>
        </h2>
        {section.type === "summary" ? (
          <ProfileText section={section} />
        ) : section.type === "experience" ? (
          <ExperienceList section={section} />
        ) : (
          <SectionBody section={section} design={d} data={data} />
        )}
        <SectionActions section={section} />
      </section>
    </>
  );
}

/**
 * Profile paragraph(s). The canonical wraps highlighted terms in
 * <span class="accent"> to tint them mint inside otherwise-soft text.
 * Slothcv stores plain text in summary.body, so this template renders
 * straight ink — users can manually accent words via the inline editor
 * (per-element color override).
 */
function ProfileText({ section }: { section: Section }) {
  if (section.type !== "summary") return null;
  const paragraphs = section.body
    .split("\n\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return (
    <div className="flex flex-col" style={{ gap: "2.5mm" }}>
      {paragraphs.map((p, i) => (
        <p
          key={i}
          style={{
            fontSize: "0.95em",
            lineHeight: 1.55,
            color: INK,
          }}
        >
          {p}
        </p>
      ))}
    </div>
  );
}

/**
 * Experience entries — title (white, weight 700) on the left, year
 * (mint) right-aligned on the same row, then a mint link row below
 * spanning both columns, then the description below in soft ink.
 * Canonical .exp-item shape. Multiple entries stack with 5mm gap.
 */
function ExperienceList({ section }: { section: Section }) {
  if (section.type !== "experience") return null;
  return (
    <div className="flex flex-col" style={{ gap: "5mm" }}>
      {section.items
        .filter((it) => it.visible !== false)
        .map((it) => {
          // The "year" displayed on the right of each entry is the END
          // year (or "Present" for current roles). Canonical CV uses a
          // single year per entry — matches the print-CV convention.
          const yr = it.current
            ? new Date().getFullYear().toString()
            : it.endDate
              ? it.endDate.slice(0, 4)
              : it.startDate
                ? it.startDate.slice(0, 4)
                : "";
          return (
            <article
              key={it.id}
              className="grid"
              style={{
                gridTemplateColumns: "1fr auto",
                columnGap: "4mm",
                rowGap: "1mm",
              }}
            >
              <h3
                style={{
                  fontSize: "1.1em",
                  fontWeight: 700,
                  color: "#ffffff",
                  letterSpacing: "-0.005em",
                }}
              >
                {it.role || "Role"}
              </h3>
              {yr && (
                <span
                  style={{
                    fontSize: "0.85em",
                    color: MINT,
                    alignSelf: "start",
                    paddingTop: "1.5mm",
                  }}
                >
                  {yr}
                </span>
              )}
              {it.company && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    fontSize: "0.85em",
                    color: MINT,
                    marginTop: "0.5mm",
                  }}
                >
                  {it.company}
                </div>
              )}
              {it.bullets && it.bullets.length > 0 && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    fontSize: "0.9em",
                    lineHeight: 1.5,
                    color: INK_SOFT,
                    marginTop: "1mm",
                  }}
                >
                  {it.bullets
                    .filter((b) => b.visible !== false)
                    .map((b, i) => (
                      <p key={b.id || i}>{b.text}</p>
                    ))}
                </div>
              )}
            </article>
          );
        })}
    </div>
  );
}
