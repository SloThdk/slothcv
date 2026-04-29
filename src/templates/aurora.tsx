/**
 * Aurora — dark, opinionated template tuned to match Philip's reference CV.
 *
 * Layout (matches the reference 1:1):
 *   - Full-page dark navy background
 *   - Top header bar across the full width:
 *       Left  → big name + tagline + contact lines
 *       Right → circular photo
 *   - Body split into ~30% sidebar + 70% main column
 *   - Sidebar: Personal info key-value list, then skill GROUPS rendered as
 *     section heading + chip cluster, then Education
 *   - Main: Profile (summary) → Experience entries with year-right pill
 *   - Bottom-left: oversized "CV" / watermark in accent color, semi-transparent
 *
 * Aurora is fully driven by `design.accentColor`, `design.pageBg`, and
 * `design.textColor`. Default palette in `sampleResumeData('aurora')`
 * is pageBg #0F1419, accent #7FFAB6 (mint), text #E5E5E5 — matching the
 * reference. The user can recolor every part from the Design tab.
 */

"use client";

import { TemplateFrame } from "./frame";
import {
  ContactLine as DefaultContactLine,
} from "./scratch";
import {
  bulletGlyph,
  elementStyle,
  formatDateRange,
  positionStyle,
  visibleBullets,
  visibleSections,
} from "./shared";
import { SectionActions } from "./section-actions";
import type {
  Bullet,
  ExperienceSection,
  GlobalDesign,
  ProjectsSection,
  ResumeData,
  Section,
  SkillsSection,
} from "@/types/resume";
import { EditableFallback, EditableSectionTitle } from "./components";

// Skill / language / certification / hobby etc → sidebar.
// Narrative sections → main column.
const SIDEBAR_TYPES = new Set<Section["type"]>([
  "skills",
  "languages",
  "certifications",
  "hobbies",
  "references",
  "education",
]);

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function AuroraTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const sidebar = visible.filter((s) => SIDEBAR_TYPES.has(s.type));
  const main = visible.filter((s) => !SIDEBAR_TYPES.has(s.type));

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Header band — `data-section-id="personal"` makes the whole block
          jump-to-form on click; the individually-tagged children inside
          (name / headline / photo) are draggable in their own right. */}
      <header
        data-section-id="personal"
        className="relative grid cursor-pointer grid-cols-[1fr_auto] items-center gap-4 pb-5 transition-opacity hover:opacity-90"
      >
        <div>
          <h1
            data-element-id="personal.name"
            className="block w-fit cursor-text text-[2.4em] font-light leading-tight tracking-tight transition-shadow hover:ring-2 hover:ring-white/30 hover:ring-offset-2 hover:ring-offset-transparent"
            style={{
              color: design.textColor,
              ...elementStyle(data, "personal.name"),
            }}
          >
            {personal.fullName || "Your Name"}
          </h1>
          {personal.headline && (
            <p
              data-element-id="personal.headline"
              className="mt-2 block w-fit cursor-text text-[0.78em] font-semibold uppercase tracking-[0.18em] transition-shadow hover:ring-2 hover:ring-white/30 hover:ring-offset-2 hover:ring-offset-transparent"
              style={{
                color: design.accentColor,
                ...elementStyle(data, "personal.headline"),
              }}
            >
              {personal.headline}
            </p>
          )}
          <DefaultContactLine data={data} />
        </div>
        {design.photo.enabled && personal.photoUrl && (
          <div
            data-element-id="personal.photo"
            className="cursor-grab transition-shadow hover:ring-2 hover:ring-white/30 hover:ring-offset-2 hover:ring-offset-transparent"
            style={elementStyle(data, "personal.photo")}
          >
            <Photo
              src={personal.photoUrl}
              shape={design.photo.shape}
              accent={design.accentColor}
            />
          </div>
        )}
      </header>

      {/* Divider — accent line under the header */}
      <div
        className="mb-4 h-px w-full"
        style={{ background: `${design.accentColor}33` }}
      />

      {/* Body */}
      <div
        className="grid gap-7"
        style={{
          gridTemplateColumns: `${design.sidebarWidth * 100}% 1fr`,
        }}
      >
        {/* ---- Sidebar ---- */}
        <aside className="space-y-5">
          <PersonalInfoBlock data={data} />
          {sidebar.map((s) => (
            <AuroraSidebarSection
              key={s.id}
              section={s}
              design={design}
              data={data}
            />
          ))}
        </aside>

        {/* ---- Main column ---- */}
        <div className="space-y-5">
          {main.map((s) => (
            <AuroraMainSection
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

// ---------------------------------------------------------------------------
// Header photo
// ---------------------------------------------------------------------------

function Photo({
  src,
  shape,
  accent,
}: {
  src: string;
  shape: GlobalDesign["photo"]["shape"];
  accent: string;
}) {
  const cls =
    shape === "circle"
      ? "rounded-full"
      : shape === "rounded"
        ? "rounded-2xl"
        : shape === "arch"
          ? "rounded-t-full"
          : "rounded";
  return (
    <div
      className={`relative h-28 w-28 overflow-hidden ${cls}`}
      style={{ outline: `2px solid ${accent}66`, outlineOffset: "2px" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- avatar is a
          user-supplied URL or generated SVG data URI; <Image> would force
          remotePatterns config without a benefit. */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Personal info — key/value rows, tucked into the sidebar above any section.
// We synthesize this from the standard PersonalInfo fields rather than adding
// a section type, since every CV has one and the reference shows it as the
// first sidebar block.
// ---------------------------------------------------------------------------

function PersonalInfoBlock({ data }: { data: ResumeData }) {
  const { design, personal } = data;
  // Note: the regular contact line is already rendered in the header. The
  // sidebar Personal Info block is for the OPTIONAL key/value extras like
  // birthdate / age / nationality. We don't have first-class fields for
  // those yet, so we read them out of the (optional) Custom section named
  // "Personal Info" if present. If not, this block stays compact.
  const customMatch = data.sections.find(
    (s) =>
      s.visible &&
      s.type === "custom" &&
      /personal/i.test(s.title),
  );
  return (
    <div>
      <SidebarHeading title="Personal Info" design={design} />
      <div className="mt-1 space-y-1 text-[0.78em]" style={{ color: design.textColor }}>
        {personal.location && (
          <KeyValue
            elementId="personal.location"
            data={data}
            label="Location"
            value={personal.location}
            muted={`${design.accentColor}99`}
          />
        )}
        {personal.email && (
          <KeyValue
            elementId="personal.email"
            data={data}
            label="Email"
            value={personal.email}
            muted={`${design.accentColor}99`}
          />
        )}
        {personal.phone && (
          <KeyValue
            elementId="personal.phone"
            data={data}
            label="Phone"
            value={personal.phone}
            muted={`${design.accentColor}99`}
          />
        )}
        {customMatch && customMatch.type === "custom" && customMatch.body
          ? customMatch.body
              .split("\n")
              .filter(Boolean)
              .map((line, i) => {
                const [k, ...rest] = line.split(":");
                if (!rest.length)
                  return (
                    <div key={i} className="text-[0.95em]">
                      {line}
                    </div>
                  );
                return (
                  <KeyValue
                    key={i}
                    label={k.trim()}
                    value={rest.join(":").trim()}
                    muted={`${design.accentColor}99`}
                    elementId={`section.${customMatch.id}.kv.${i}`}
                    data={data}
                  />
                );
              })
          : null}
      </div>
    </div>
  );
}

function KeyValue({
  label,
  value,
  muted,
  elementId,
  data,
}: {
  label: string;
  value: string;
  muted: string;
  elementId: string;
  data: ResumeData;
}) {
  return (
    <div
      data-element-id={elementId}
      className="grid cursor-grab grid-cols-[auto_1fr] gap-3 rounded-sm transition-shadow hover:ring-2 hover:ring-white/20 hover:ring-offset-1 hover:ring-offset-transparent"
      style={elementStyle(data, elementId)}
    >
      <span className="text-[0.95em]" style={{ color: muted }}>
        {label}
      </span>
      <span className="text-right">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar section dispatch — hand-tuned for the reference look.
// Skills get the chip-with-border treatment by default in Aurora.
// ---------------------------------------------------------------------------

function AuroraSidebarSection({
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
    <div
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-white/[0.06] hover:ring-2 hover:ring-[var(--aurora-accent,#7FFAB6)]/40"
    >
      <h2
        data-element-id={titleId}
        className="inline-block cursor-text text-[0.72em] font-semibold uppercase tracking-[0.22em] transition-shadow hover:ring-2 hover:ring-white/30 hover:ring-offset-2 hover:ring-offset-transparent"
        style={{ color: design.accentColor, ...elementStyle(data, titleId) }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <div className="mt-1.5">
        <AuroraSidebarBody section={section} design={design} data={data} />
      </div>
      <SectionActions section={section} />
    </div>
  );
}

const auroraGrab =
  "cursor-grab transition-shadow hover:ring-2 hover:ring-white/20 hover:ring-offset-1 hover:ring-offset-transparent rounded-sm";

function AuroraSidebarBody({
  section,
  design,
  data,
}: {
  section: Section;
  design: GlobalDesign;
  data: ResumeData;
}) {
  switch (section.type) {
    case "skills":
      return (
        <SkillsGroupedChips section={section} design={design} data={data} />
      );
    case "languages": {
      const items = section.items.filter((i) => i.visible);
      return (
        <div className="space-y-1 text-[0.85em]" style={{ color: design.textColor }}>
          {items.map((l) => {
            const id = `section.${section.id}.item.${l.id}`;
            return (
              <div
                key={l.id}
                data-element-id={id}
                className={`${auroraGrab} flex justify-between`}
                style={elementStyle(data, id)}
              >
                <EditableFallback
                  data={data}
                  fieldId={`${id}.name`}
                  value={l.name}
                  placeholder="Language"
                />
                <span style={{ color: `${design.accentColor}cc` }}>
                  <EditableFallback
                    data={data}
                    fieldId={`${id}.proficiency`}
                    value={l.proficiency}
                    placeholder="Proficiency"
                  />
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    case "education": {
      const items = section.items.filter((i) => i.visible);
      return (
        <div className="space-y-2 text-[0.85em]" style={{ color: design.textColor }}>
          {items.map((it) => {
            const id = `section.${section.id}.item.${it.id}`;
            return (
              <div
                key={it.id}
                data-element-id={id}
                className={auroraGrab}
                style={elementStyle(data, id)}
              >
                <div className="font-semibold">
                  <EditableFallback
                    data={data}
                    fieldId={`${id}.degree`}
                    value={it.degree}
                    placeholder="Degree"
                  />
                  {" · "}
                  <EditableFallback
                    data={data}
                    fieldId={`${id}.field`}
                    value={it.field}
                    placeholder="Field of study"
                  />
                </div>
                <EditableFallback
                  data={data}
                  fieldId={`${id}.institution`}
                  value={it.institution}
                  placeholder="Institution"
                  inline={false}
                  className=""
                />
                <div className="text-[0.9em]" style={{ color: `${design.textColor}80` }}>
                  {[it.startDate, it.endDate].filter(Boolean).join("–") ||
                    "Date range"}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    case "certifications": {
      const items = section.items.filter((i) => i.visible);
      return (
        <div className="space-y-1.5 text-[0.85em]" style={{ color: design.textColor }}>
          {items.map((c) => {
            const id = `section.${section.id}.item.${c.id}`;
            return (
              <div
                key={c.id}
                data-element-id={id}
                className={auroraGrab}
                style={elementStyle(data, id)}
              >
                <EditableFallback
                  data={data}
                  fieldId={`${id}.name`}
                  value={c.name}
                  placeholder="Certification name"
                  inline={false}
                  className="font-medium"
                />
                <div style={{ color: `${design.textColor}99` }}>
                  <EditableFallback
                    data={data}
                    fieldId={`${id}.issuer`}
                    value={c.issuer}
                    placeholder="Issuer"
                  />
                  {" · "}
                  <EditableFallback
                    data={data}
                    fieldId={`${id}.date`}
                    value={c.date}
                    placeholder="Date"
                  />
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    case "hobbies": {
      const items = section.items.filter((i) => i.visible && i.text.trim());
      const id = `section.${section.id}.body`;
      return (
        <p
          data-element-id={id}
          className={`${auroraGrab} text-[0.85em]`}
          style={{ color: design.textColor, ...elementStyle(data, id) }}
        >
          {items.map((h) => h.text).join(" · ")}
        </p>
      );
    }
    case "references": {
      if (section.onRequest) {
        const id = `section.${section.id}.body`;
        return (
          <p
            data-element-id={id}
            className={`${auroraGrab} text-[0.85em] italic`}
            style={{
              color: `${design.textColor}99`,
              ...elementStyle(data, id),
            }}
          >
            Available on request.
          </p>
        );
      }
      return (
        <div className="space-y-2 text-[0.85em]" style={{ color: design.textColor }}>
          {section.items
            .filter((r) => r.visible)
            .map((r) => {
              const id = `section.${section.id}.item.${r.id}`;
              return (
                <div
                  key={r.id}
                  data-element-id={id}
                  className={auroraGrab}
                  style={elementStyle(data, id)}
                >
                  <EditableFallback
                    data={data}
                    fieldId={`${id}.name`}
                    value={r.name}
                    placeholder="Reference name"
                    inline={false}
                    className="font-semibold"
                  />
                  <div style={{ color: `${design.textColor}99` }}>
                    <EditableFallback
                      data={data}
                      fieldId={`${id}.role`}
                      value={r.role}
                      placeholder="Role"
                    />
                    {" · "}
                    <EditableFallback
                      data={data}
                      fieldId={`${id}.company`}
                      value={r.company}
                      placeholder="Company"
                    />
                  </div>
                </div>
              );
            })}
        </div>
      );
    }
    default:
      return null;
  }
}

/** Skill chips grouped by `group`, with the group label rendered as its own
 *  small accent-colored heading above each chip cluster. Matches the
 *  "WEB & BACKEND / DATABASE & CLOUD / 3D & KREATIV / ANDET" pattern in
 *  the reference. Each chip is individually draggable. */
function SkillsGroupedChips({
  section,
  design,
  data,
}: {
  section: SkillsSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  if (items.length === 0) return null;

  const groups = new Map<string, typeof items>();
  for (const s of items) {
    const key = s.group || "Skills";
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }

  return (
    <div className="space-y-3">
      {[...groups.entries()].map(([group, list]) => (
        <div key={group}>
          {groups.size > 1 && (
            <div
              className="mb-1.5 text-[0.7em] font-semibold uppercase tracking-[0.2em]"
              style={{ color: design.accentColor }}
            >
              {group}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {list.map((s) => {
              const id = `section.${section.id}.item.${s.id}`;
              return (
                <span
                  key={s.id}
                  data-element-id={id}
                  className="cursor-grab rounded-md px-2 py-0.5 text-[0.78em] transition-shadow hover:ring-2 hover:ring-white/30 hover:ring-offset-1 hover:ring-offset-transparent"
                  style={{
                    background: `${design.accentColor}10`,
                    border: `1px solid ${design.accentColor}40`,
                    color: design.textColor,
                    ...elementStyle(data, id),
                  }}
                >
                  {s.name}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar heading
// ---------------------------------------------------------------------------

function SidebarHeading({
  title,
  design,
}: {
  title: string;
  design: GlobalDesign;
}) {
  return (
    <h2
      className="text-[0.72em] font-semibold uppercase tracking-[0.22em]"
      style={{ color: design.accentColor }}
    >
      {title}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// Main column
// ---------------------------------------------------------------------------

function AuroraMainSection({
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
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-white/[0.06] hover:ring-2 hover:ring-[var(--aurora-accent,#7FFAB6)]/40"
    >
      <h2
        data-element-id={titleId}
        className="inline-block cursor-text text-[0.72em] font-semibold uppercase tracking-[0.22em] transition-shadow hover:ring-2 hover:ring-white/30 hover:ring-offset-2 hover:ring-offset-transparent"
        style={{ color: design.accentColor, ...elementStyle(data, titleId) }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <div className="mt-2">
        <AuroraMainBody section={section} design={design} data={data} />
      </div>
      <SectionActions section={section} />
    </section>
  );
}

function AuroraMainBody({
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
          className={`${auroraGrab} whitespace-pre-wrap text-[0.92em] leading-[1.55]`}
          style={{ color: design.textColor, ...elementStyle(data, id) }}
        >
          {section.body || "Add a short summary to introduce yourself."}
        </p>
      );
    }
    case "experience":
      return <Experience section={section} design={design} data={data} />;
    case "projects":
      return <Projects section={section} design={design} data={data} />;
    case "publications":
    case "talks":
    case "awards":
    case "volunteer":
    case "custom":
    default:
      // Fall back to a compact main-column rendering using the same chip
      // language. We render bullets if any.
      return <FallbackMain section={section} design={design} data={data} />;
  }
}

function Experience({
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
            className={auroraGrab}
            style={elementStyle(data, id)}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3
                className="text-[1em] font-semibold"
                style={{ color: design.textColor }}
              >
                <EditableFallback
                  data={data}
                  fieldId={`${id}.role`}
                  value={it.role}
                  placeholder="Role"
                />
                <>
                  {"  —  "}
                  <EditableFallback
                    data={data}
                    fieldId={`${id}.company`}
                    value={it.company}
                    placeholder="Company"
                  />
                </>
              </h3>
              <span
                className="text-[0.82em] font-medium"
                style={{ color: design.accentColor }}
              >
                {formatDateRange(
                  it.startDate,
                  it.endDate,
                  it.current,
                  design.dateFormat,
                )}
              </span>
            </div>
            <EditableFallback
              data={data}
              fieldId={`${id}.location`}
              value={it.location}
              placeholder="Location"
              inline={false}
              className="text-[0.82em]"
            />
            <AuroraBulletList
              bullets={it.bullets}
              design={design}
              data={data}
              sectionId={section.id}
            />
          </article>
        );
      })}
    </div>
  );
}

function Projects({
  section,
  design,
  data,
}: {
  section: ProjectsSection;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const id = `section.${section.id}.item.${it.id}`;
        return (
          <article
            key={it.id}
            data-element-id={id}
            className={auroraGrab}
            style={elementStyle(data, id)}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3
                className="text-[1em] font-semibold"
                style={{ color: design.textColor }}
              >
                {it.url ? (
                  <a
                    href={it.url.startsWith("http") ? it.url : `https://${it.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: design.accentColor }}
                    className="underline-offset-2 hover:underline"
                  >
                    {it.name}
                  </a>
                ) : (
                  it.name
                )}
                {it.role ? ` · ${it.role}` : ""}
              </h3>
              {(it.startDate || it.endDate || it.current) && (
                <span
                  className="text-[0.82em] font-medium"
                  style={{ color: design.accentColor }}
                >
                  {formatDateRange(
                    it.startDate,
                    it.endDate,
                    it.current,
                    design.dateFormat,
                  )}
                </span>
              )}
            </div>
            {it.techStack && (
              <div
                className="text-[0.82em]"
                style={{ color: `${design.textColor}99` }}
              >
                {it.techStack}
              </div>
            )}
            <AuroraBulletList
              bullets={it.bullets}
              design={design}
              data={data}
              sectionId={section.id}
            />
          </article>
        );
      })}
    </div>
  );
}

function FallbackMain({
  section,
  design,
  data,
}: {
  section: Section;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const bullets =
    "items" in section && Array.isArray((section as { items: unknown }).items)
      ? ((section as { items: Bullet[] | unknown[] }).items as unknown[])
      : [];
  if ("body" in section && (section as { body?: string }).body) {
    const id = `section.${section.id}.body`;
    return (
      <p
        data-element-id={id}
        className={`${auroraGrab} whitespace-pre-wrap text-[0.92em]`}
        style={{ color: design.textColor, ...elementStyle(data, id) }}
      >
        {(section as { body: string }).body}
      </p>
    );
  }
  if (
    bullets.length > 0 &&
    typeof bullets[0] === "object" &&
    bullets[0] !== null &&
    "text" in (bullets[0] as object)
  ) {
    return (
      <AuroraBulletList
        bullets={bullets as Bullet[]}
        design={design}
        data={data}
        sectionId={section.id}
      />
    );
  }
  return null;
}

function AuroraBulletList({
  bullets,
  design,
  data,
  sectionId,
}: {
  bullets: Bullet[];
  design: GlobalDesign;
  data: ResumeData;
  sectionId: string;
}) {
  const list = visibleBullets(bullets);
  if (list.length === 0) return null;
  const glyph = bulletGlyph(design);
  return (
    <ul className="mt-1.5 space-y-1 text-[0.9em]" style={{ color: design.textColor }}>
      {list.map((b) => {
        const id = `section.${sectionId}.bullet.${b.id}`;
        return (
          <li
            key={b.id}
            data-element-id={id}
            className={`${auroraGrab} flex gap-2`}
            style={elementStyle(data, id)}
          >
            {glyph && (
              <span
                className="select-none"
                style={{ color: design.accentColor }}
                aria-hidden
              >
                {glyph}
              </span>
            )}
            <span className="flex-1 whitespace-pre-wrap">{b.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
