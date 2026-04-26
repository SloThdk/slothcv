/**
 * Shared DOM section renderers used by every template (except Aurora,
 * which has its own bespoke layout).
 *
 * Each section type has one "render this section's body" function. Templates
 * compose these around their own header/divider chrome so layout stays
 * template-specific while content rendering stays consistent.
 *
 * IMPORTANT: every text field is rendered via React (which auto-escapes
 * dangerous chars). We do NOT use dangerouslySetInnerHTML anywhere — even
 * Summary/Custom bodies are rendered as plain text with `whitespace-pre-wrap`.
 * Future rich-text MUST go through DOMPurify with a strict allowlist.
 *
 * Per-element drag: every per-item / per-bullet wrapper carries a stable
 * `data-element-id` so the preview's drag handler can move JUST that
 * element. See `ResumeData.elementOverrides` in `src/types/resume.ts` for
 * the keying convention.
 */

"use client";

import {
  bulletGlyph,
  elementStyle,
  formatDate,
  formatDateRange,
  visibleBullets,
} from "./shared";
import type {
  AwardsSection,
  Bullet,
  CertificationsSection,
  CustomSection,
  EducationSection,
  ExperienceSection,
  GlobalDesign,
  HobbiesSection,
  LanguagesSection,
  ProjectsSection,
  PublicationsSection,
  ReferencesSection,
  ResumeData,
  Section,
  SkillsSection,
  SummarySection,
  TalksSection,
  VolunteerSection,
} from "@/types/resume";

interface SectionProps<S extends Section> {
  section: S;
  design: GlobalDesign;
  /** Full resume data — needed to read `elementOverrides[id]` so each
   *  per-item / per-bullet wrapper can apply its drag offset. */
  data: ResumeData;
}

// ---------- Element-id helpers ----------

const eid = {
  bullet: (sectionId: string, bulletId: string) =>
    `section.${sectionId}.bullet.${bulletId}`,
  item: (sectionId: string, itemId: string) =>
    `section.${sectionId}.item.${itemId}`,
};

// Common Tailwind classes for any draggable element. Kept as a constant so
// every instrumented wrapper renders the same hover/grab affordance.
const dragClass =
  "cursor-grab transition-shadow hover:ring-2 hover:ring-neutral-900/15 hover:ring-offset-2 rounded-sm";

/**
 * Editable — wraps a piece of text with a stable `data-element-id` so
 * the inline-edit overlay (see `<InlineTextEditor>`) can pick it up
 * on double-click. The CSS cursor flips to `text` on hover so users
 * see at a glance that the field is editable. Inline by default —
 * doesn't disturb the surrounding flex/inline layout.
 */
function Editable({
  data,
  fieldId,
  children,
  className,
  inline = true,
}: {
  data: ResumeData;
  fieldId: string;
  children: React.ReactNode;
  className?: string;
  inline?: boolean;
}) {
  const Tag = inline ? "span" : "div";
  return (
    <Tag
      data-element-id={fieldId}
      className={`${inline ? "" : "block"} cursor-text rounded-sm transition-shadow hover:ring-2 hover:ring-blue-400/40 hover:ring-offset-1 ${className ?? ""}`}
      style={elementStyle(data, fieldId)}
    >
      {children}
    </Tag>
  );
}

/**
 * EditableDate — like Editable but specifically for date fields. Shows
 * the formatted display ("Mar 2024") while the underlying lens reads
 * and writes the RAW value ("2024-03"). The `title` attribute hints
 * the expected raw format — also accepts "Present" / "Now" sentinels
 * for endDate (handled in the lens).
 */
function EditableDate({
  data,
  fieldId,
  raw,
  formatted,
  current,
  className,
  isEnd,
}: {
  data: ResumeData;
  fieldId: string;
  raw: string;
  formatted: string;
  current?: boolean;
  className?: string;
  isEnd?: boolean;
}) {
  const display = isEnd && current ? "Present" : formatted || (isEnd ? "—" : raw || "—");
  const hint = isEnd
    ? "Type 'Present' or YYYY-MM (e.g. 2024-03)"
    : "YYYY-MM (e.g. 2022-09)";
  return (
    <span
      data-element-id={fieldId}
      className={`cursor-text rounded-sm transition-shadow hover:ring-2 hover:ring-blue-400/40 hover:ring-offset-1 ${className ?? ""}`}
      style={elementStyle(data, fieldId)}
      title={hint}
    >
      {display}
    </span>
  );
}

/** Inline editable date PAIR (start — end) used by Experience,
 *  Education, Projects, Volunteer items. Renders as
 *  "Start — End" with each half independently double-clickable.
 *  Honours the `current` boolean for "Present" rendering. */
function DateRange({
  data,
  itemPath,
  startRaw,
  endRaw,
  current,
  fmt,
  className,
}: {
  data: ResumeData;
  itemPath: string; // e.g. "section.<sid>.item.<iid>"
  startRaw: string;
  endRaw: string;
  current: boolean;
  fmt: GlobalDesign["dateFormat"];
  className?: string;
}) {
  const startFmt = formatDate(startRaw, fmt);
  const endFmt = formatDate(endRaw, fmt);
  return (
    <span className={className}>
      <EditableDate
        data={data}
        fieldId={`${itemPath}.startDate`}
        raw={startRaw}
        formatted={startFmt}
      />
      {(startRaw || endRaw || current) && (
        <span className="mx-1 select-none">—</span>
      )}
      <EditableDate
        data={data}
        fieldId={`${itemPath}.endDate`}
        raw={endRaw}
        formatted={endFmt}
        current={current}
        isEnd
      />
    </span>
  );
}

// ---------- Bullet list (shared) ----------

function BulletList({
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
  const visible = visibleBullets(bullets);
  if (visible.length === 0) return null;
  const glyph = bulletGlyph(design);
  return (
    <ul className="mt-1.5 space-y-1">
      {visible.map((b) => {
        const id = eid.bullet(sectionId, b.id);
        return (
          <li
            key={b.id}
            data-element-id={id}
            className={`${dragClass} flex gap-2 text-[0.95em]`}
            style={elementStyle(data, id)}
          >
            {glyph && (
              <span
                className="select-none text-[0.95em]"
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

// ---------- Section renderers ----------

export function SummaryBody({ section, data }: SectionProps<SummarySection>) {
  if (!section.body.trim()) {
    return (
      <p className="text-[0.95em] text-neutral-400 italic">
        Add a short summary to introduce yourself.
      </p>
    );
  }
  // Summary body is a single block of prose — make the whole paragraph
  // its own draggable target. Keyed by section id since there's only ever
  // one body per summary section.
  const id = `section.${section.id}.body`;
  return (
    <p
      data-element-id={id}
      className={`${dragClass} whitespace-pre-wrap text-[0.95em]`}
      style={elementStyle(data, id)}
    >
      {section.body}
    </p>
  );
}

export function ExperienceBody({
  section,
  design,
  data,
}: SectionProps<ExperienceSection>) {
  if (section.items.length === 0)
    return <Placeholder text="No experience yet." />;
  return (
    <div className="space-y-3">
      {section.items
        .filter((i) => i.visible)
        .map((it) => {
          const id = eid.item(section.id, it.id);
          // Inner-field element-ids — each individual text bit (role,
          // company, location) gets its own id so users can double-click
          // it for inline edit. The OUTER wrapper with the bare item id
          // still exists for whole-item drag/select.
          const roleId = `${id}.role`;
          const companyId = `${id}.company`;
          const locationId = `${id}.location`;
          return (
            <div
              key={it.id}
              data-element-id={id}
              className={dragClass}
              style={elementStyle(data, id)}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <div className="font-semibold">
                  <span
                    data-element-id={roleId}
                    className="cursor-text"
                    style={elementStyle(data, roleId)}
                  >
                    {it.role || "Role"}
                  </span>
                  {it.company && (
                    <span className="font-normal text-neutral-500">
                      {" · "}
                      <span
                        data-element-id={companyId}
                        className="cursor-text"
                        style={elementStyle(data, companyId)}
                      >
                        {it.company}
                      </span>
                    </span>
                  )}
                </div>
                <DateRange
                  data={data}
                  itemPath={id}
                  startRaw={it.startDate}
                  endRaw={it.endDate}
                  current={it.current}
                  fmt={design.dateFormat}
                  className="text-[0.85em] text-neutral-500"
                />
              </div>
              {it.location && (
                <Editable
                  data={data}
                  fieldId={locationId}
                  inline={false}
                  className="text-[0.85em] text-neutral-500"
                >
                  {it.location}
                </Editable>
              )}
              <BulletList
                bullets={it.bullets}
                design={design}
                data={data}
                sectionId={section.id}
              />
            </div>
          );
        })}
    </div>
  );
}

export function EducationBody({
  section,
  design,
  data,
}: SectionProps<EducationSection>) {
  if (section.items.length === 0)
    return <Placeholder text="No education yet." />;
  return (
    <div className="space-y-3">
      {section.items
        .filter((i) => i.visible)
        .map((it) => {
          const id = eid.item(section.id, it.id);
          return (
            <div
              key={it.id}
              data-element-id={id}
              className={dragClass}
              style={elementStyle(data, id)}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <div className="font-semibold">
                  <Editable data={data} fieldId={`${id}.degree`}>
                    {it.degree || "Degree"}
                  </Editable>
                  {it.field && (
                    <span className="font-normal">
                      {", "}
                      <Editable data={data} fieldId={`${id}.field`}>
                        {it.field}
                      </Editable>
                    </span>
                  )}
                </div>
                <DateRange
                  data={data}
                  itemPath={id}
                  startRaw={it.startDate}
                  endRaw={it.endDate}
                  current={it.current}
                  fmt={design.dateFormat}
                  className="text-[0.85em] text-neutral-500"
                />
              </div>
              <div className="text-[0.9em] text-neutral-700">
                <Editable data={data} fieldId={`${id}.institution`}>
                  {it.institution}
                </Editable>
                {it.location && (
                  <span className="text-neutral-500">
                    {" · "}
                    <Editable data={data} fieldId={`${id}.location`}>
                      {it.location}
                    </Editable>
                  </span>
                )}
                {it.gpa && (
                  <span className="text-neutral-500">
                    {" · GPA "}
                    <Editable data={data} fieldId={`${id}.gpa`}>
                      {it.gpa}
                    </Editable>
                  </span>
                )}
              </div>
              <BulletList
                bullets={it.bullets}
                design={design}
                data={data}
                sectionId={section.id}
              />
            </div>
          );
        })}
    </div>
  );
}

export function SkillsBody({
  section,
  design,
  data,
}: SectionProps<SkillsSection>) {
  const items = section.items.filter((i) => i.visible);
  if (items.length === 0) return <Placeholder text="No skills yet." />;

  // Group skills by category, preserving first-seen order.
  const groups = new Map<string, typeof items>();
  for (const s of items) {
    const key = s.group || "Skills";
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }

  return (
    <div className="space-y-2.5">
      {[...groups.entries()].map(([group, list]) => (
        <div key={group}>
          {groups.size > 1 && (
            <div className="mb-1 text-[0.8em] font-medium uppercase tracking-wider text-neutral-500">
              {group}
            </div>
          )}
          <div
            className={
              design.skillBarStyle === "pills"
                ? "flex flex-wrap gap-1.5"
                : "space-y-1"
            }
          >
            {list.map((s) => {
              const id = eid.item(section.id, s.id);
              return (
                <div
                  key={s.id}
                  data-element-id={id}
                  className={dragClass}
                  style={elementStyle(data, id)}
                >
                  <SkillRow
                    skill={s}
                    design={design}
                    data={data}
                    sectionId={section.id}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SkillRow({
  skill,
  design,
  data,
  sectionId,
}: {
  skill: SkillsSection["items"][number];
  design: GlobalDesign;
  data: ResumeData;
  sectionId: string;
}) {
  const style = design.skillBarStyle;
  const nameId = `section.${sectionId}.item.${skill.id}.name`;
  const nameNode = (
    <Editable data={data} fieldId={nameId}>
      {skill.name}
    </Editable>
  );
  if (style === "pills") {
    return (
      <span
        className="rounded-full px-2.5 py-0.5 text-[0.85em]"
        style={{
          background: `${design.accentColor}1a`,
          color: design.accentColor,
        }}
      >
        {nameNode}
      </span>
    );
  }
  if (style === "text-only") {
    return <div className="text-[0.95em]">{nameNode}</div>;
  }
  if (style === "dots" || style === "circles") {
    const filled = Math.max(0, Math.min(5, skill.level));
    return (
      <div className="flex items-center justify-between gap-3 text-[0.95em]">
        {nameNode}
        <span className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={
                style === "circles"
                  ? "h-2.5 w-2.5 rounded-full border"
                  : "h-1.5 w-1.5 rounded-full"
              }
              style={{
                background:
                  i < filled
                    ? design.accentColor
                    : style === "circles"
                      ? "transparent"
                      : "#d4d4d8",
                borderColor: design.accentColor,
              }}
            />
          ))}
        </span>
      </div>
    );
  }
  if (style === "stars") {
    const filled = Math.max(0, Math.min(5, skill.level));
    return (
      <div className="flex items-center justify-between gap-3 text-[0.95em]">
        {nameNode}
        <span style={{ color: design.accentColor }}>
          {"★".repeat(filled)}
          <span className="text-neutral-300">{"★".repeat(5 - filled)}</span>
        </span>
      </div>
    );
  }
  // bar (default)
  const pct = Math.max(0, Math.min(5, skill.level)) / 5;
  return (
    <div className="text-[0.95em]">
      <div className="flex justify-between">{nameNode}</div>
      {skill.level > 0 && (
        <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct * 100}%`,
              background: design.accentColor,
            }}
          />
        </div>
      )}
    </div>
  );
}

export function LanguagesBody({
  section,
  design,
  data,
}: SectionProps<LanguagesSection>) {
  const items = section.items.filter((i) => i.visible);
  if (items.length === 0) return <Placeholder text="No languages yet." />;
  return (
    <div className="space-y-1.5">
      {items.map((l) => {
        const id = eid.item(section.id, l.id);
        return (
          <div
            key={l.id}
            data-element-id={id}
            className={`${dragClass} flex items-center justify-between gap-3 text-[0.95em]`}
            style={elementStyle(data, id)}
          >
            <span className="font-medium">
              <Editable data={data} fieldId={`${id}.name`}>
                {l.name}
              </Editable>
            </span>
            {design.languageStyle === "cefr-badges" && l.proficiency ? (
              <span
                className="rounded px-2 py-0.5 text-[0.8em] font-semibold uppercase"
                style={{
                  background: `${design.accentColor}1a`,
                  color: design.accentColor,
                }}
              >
                <Editable data={data} fieldId={`${id}.proficiency`}>
                  {l.proficiency}
                </Editable>
              </span>
            ) : design.languageStyle === "dots" ? (
              <span className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background:
                        i < l.level ? design.accentColor : "#d4d4d8",
                    }}
                  />
                ))}
              </span>
            ) : design.languageStyle === "bar" ? (
              <span className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-200">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${(l.level / 5) * 100}%`,
                    background: design.accentColor,
                  }}
                />
              </span>
            ) : (
              <span className="text-[0.85em] text-neutral-500">
                <Editable data={data} fieldId={`${id}.proficiency`}>
                  {l.proficiency}
                </Editable>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ProjectsBody({
  section,
  design,
  data,
}: SectionProps<ProjectsSection>) {
  const items = section.items.filter((i) => i.visible);
  if (items.length === 0) return <Placeholder text="No projects yet." />;
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const id = eid.item(section.id, it.id);
        return (
          <div
            key={it.id}
            data-element-id={id}
            className={dragClass}
            style={elementStyle(data, id)}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <div className="font-semibold">
                {it.url ? (
                  <a
                    href={safeHref(it.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline"
                    style={{ color: design.accentColor }}
                  >
                    <Editable data={data} fieldId={`${id}.name`}>
                      {it.name || "Project"}
                    </Editable>
                  </a>
                ) : (
                  <Editable data={data} fieldId={`${id}.name`}>
                    {it.name || "Project"}
                  </Editable>
                )}
                {it.role && (
                  <span className="font-normal text-neutral-500">
                    {" · "}
                    <Editable data={data} fieldId={`${id}.role`}>
                      {it.role}
                    </Editable>
                  </span>
                )}
              </div>
              <DateRange
                data={data}
                itemPath={id}
                startRaw={it.startDate}
                endRaw={it.endDate}
                current={it.current}
                fmt={design.dateFormat}
                className="text-[0.85em] text-neutral-500"
              />
            </div>
            {it.techStack && (
              <Editable
                data={data}
                fieldId={`${id}.techStack`}
                inline={false}
                className="mt-0.5 text-[0.85em] text-neutral-500"
              >
                {it.techStack}
              </Editable>
            )}
            <BulletList
              bullets={it.bullets}
              design={design}
              data={data}
              sectionId={section.id}
            />
          </div>
        );
      })}
    </div>
  );
}

export function CertificationsBody({
  section,
  design,
  data,
}: SectionProps<CertificationsSection>) {
  const items = section.items.filter((i) => i.visible);
  if (items.length === 0)
    return <Placeholder text="No certifications yet." />;
  return (
    <div className="space-y-1.5">
      {items.map((c) => {
        const id = eid.item(section.id, c.id);
        return (
          <div
            key={c.id}
            data-element-id={id}
            className={`${dragClass} text-[0.95em]`}
            style={elementStyle(data, id)}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <div>
                <span className="font-semibold">
                  <Editable data={data} fieldId={`${id}.name`}>
                    {c.name}
                  </Editable>
                </span>
                {c.issuer && (
                  <span className="text-neutral-500">
                    {" · "}
                    <Editable data={data} fieldId={`${id}.issuer`}>
                      {c.issuer}
                    </Editable>
                  </span>
                )}
              </div>
              <div className="text-[0.85em] text-neutral-500">
                <Editable data={data} fieldId={`${id}.date`}>
                  {c.date}
                </Editable>
                {c.expiry && (
                  <>
                    {" – "}
                    <Editable data={data} fieldId={`${id}.expiry`}>
                      {c.expiry}
                    </Editable>
                  </>
                )}
              </div>
            </div>
            {(c.credentialId || c.url) && (
              <div className="text-[0.8em] text-neutral-500">
                {c.credentialId && (
                  <>
                    ID:{" "}
                    <Editable data={data} fieldId={`${id}.credentialId`}>
                      {c.credentialId}
                    </Editable>
                  </>
                )}
                {c.credentialId && c.url && " · "}
                {c.url && (
                  <a
                    href={safeHref(c.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:underline"
                    style={{ color: design.accentColor }}
                  >
                    Verify
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AwardsBody({ section, data }: SectionProps<AwardsSection>) {
  const items = section.items.filter((i) => i.visible);
  if (items.length === 0) return <Placeholder text="No awards yet." />;
  return (
    <div className="space-y-2">
      {items.map((a) => {
        const id = eid.item(section.id, a.id);
        return (
          <div
            key={a.id}
            data-element-id={id}
            className={`${dragClass} text-[0.95em]`}
            style={elementStyle(data, id)}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <div>
                <span className="font-semibold">
                  <Editable data={data} fieldId={`${id}.name`}>
                    {a.name}
                  </Editable>
                </span>
                {a.issuer && (
                  <span className="text-neutral-500">
                    {" · "}
                    <Editable data={data} fieldId={`${id}.issuer`}>
                      {a.issuer}
                    </Editable>
                  </span>
                )}
              </div>
              {a.date && (
                <div className="text-[0.85em] text-neutral-500">
                  <Editable data={data} fieldId={`${id}.date`}>
                    {a.date}
                  </Editable>
                </div>
              )}
            </div>
            {a.description && (
              <Editable
                data={data}
                fieldId={`${id}.description`}
                inline={false}
                className="text-[0.9em] text-neutral-700"
              >
                {a.description}
              </Editable>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PublicationsBody({
  section,
  design,
  data,
}: SectionProps<PublicationsSection>) {
  const items = section.items.filter((i) => i.visible);
  if (items.length === 0) return <Placeholder text="No publications yet." />;
  return (
    <div className="space-y-2 text-[0.95em]">
      {items.map((p) => {
        const id = eid.item(section.id, p.id);
        return (
          <div
            key={p.id}
            data-element-id={id}
            className={dragClass}
            style={elementStyle(data, id)}
          >
            <span className="font-semibold">
              <Editable data={data} fieldId={`${id}.title`}>
                {p.title}
              </Editable>
            </span>
            {p.authors && (
              <span className="text-neutral-700">
                {" — "}
                <Editable data={data} fieldId={`${id}.authors`}>
                  {p.authors}
                </Editable>
              </span>
            )}
            {p.venue && (
              <span className="italic text-neutral-700">
                {". "}
                <Editable data={data} fieldId={`${id}.venue`}>
                  {p.venue}
                </Editable>
              </span>
            )}
            {p.date && (
              <span className="text-neutral-500">
                {" ("}
                <Editable data={data} fieldId={`${id}.date`}>
                  {p.date}
                </Editable>
                {")"}
              </span>
            )}
            {p.url && (
              <>
                {" "}
                <a
                  href={safeHref(p.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.9em] underline-offset-2 hover:underline"
                  style={{ color: design.accentColor }}
                >
                  link
                </a>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function VolunteerBody({
  section,
  design,
  data,
}: SectionProps<VolunteerSection>) {
  const items = section.items.filter((i) => i.visible);
  if (items.length === 0)
    return <Placeholder text="No volunteer experience yet." />;
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const id = eid.item(section.id, it.id);
        return (
          <div
            key={it.id}
            data-element-id={id}
            className={dragClass}
            style={elementStyle(data, id)}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <div className="font-semibold">
                <Editable data={data} fieldId={`${id}.role`}>
                  {it.role || "Role"}
                </Editable>
                {it.organization && (
                  <span className="font-normal text-neutral-500">
                    {" · "}
                    <Editable data={data} fieldId={`${id}.organization`}>
                      {it.organization}
                    </Editable>
                  </span>
                )}
              </div>
              <DateRange
                data={data}
                itemPath={id}
                startRaw={it.startDate}
                endRaw={it.endDate}
                current={it.current}
                fmt={design.dateFormat}
                className="text-[0.85em] text-neutral-500"
              />
            </div>
            {it.location && (
              <Editable
                data={data}
                fieldId={`${id}.location`}
                inline={false}
                className="text-[0.85em] text-neutral-500"
              >
                {it.location}
              </Editable>
            )}
            <BulletList
              bullets={it.bullets}
              design={design}
              data={data}
              sectionId={section.id}
            />
          </div>
        );
      })}
    </div>
  );
}

export function TalksBody({ section, design, data }: SectionProps<TalksSection>) {
  const items = section.items.filter((i) => i.visible);
  if (items.length === 0) return <Placeholder text="No talks yet." />;
  return (
    <div className="space-y-1.5 text-[0.95em]">
      {items.map((t) => {
        const id = eid.item(section.id, t.id);
        return (
          <div
            key={t.id}
            data-element-id={id}
            className={dragClass}
            style={elementStyle(data, id)}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <div>
                {t.url ? (
                  <a
                    href={safeHref(t.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline-offset-2 hover:underline"
                    style={{ color: design.accentColor }}
                  >
                    <Editable data={data} fieldId={`${id}.title`}>
                      {t.title}
                    </Editable>
                  </a>
                ) : (
                  <span className="font-semibold">
                    <Editable data={data} fieldId={`${id}.title`}>
                      {t.title}
                    </Editable>
                  </span>
                )}
                {t.venue && (
                  <span className="text-neutral-500">
                    {" · "}
                    <Editable data={data} fieldId={`${id}.venue`}>
                      {t.venue}
                    </Editable>
                  </span>
                )}
              </div>
              {t.date && (
                <div className="text-[0.85em] text-neutral-500">
                  <Editable data={data} fieldId={`${id}.date`}>
                    {t.date}
                  </Editable>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HobbiesBody({ section, data }: SectionProps<HobbiesSection>) {
  const items = section.items.filter((i) => i.visible && i.text.trim());
  if (items.length === 0) return <Placeholder text="No hobbies yet." />;
  // Hobbies render as a single inline list — drag offset applies to the
  // whole paragraph since splitting individual hobbies would create too
  // many tiny drag targets for not enough payoff.
  const id = `section.${section.id}.body`;
  return (
    <p
      data-element-id={id}
      className={`${dragClass} text-[0.95em]`}
      style={elementStyle(data, id)}
    >
      {items.map((h) => h.text).join(" · ")}
    </p>
  );
}

export function ReferencesBody({
  section,
  data,
}: SectionProps<ReferencesSection>) {
  if (section.onRequest) {
    const id = `section.${section.id}.body`;
    return (
      <p
        data-element-id={id}
        className={`${dragClass} text-[0.95em] italic text-neutral-700`}
        style={elementStyle(data, id)}
      >
        References available on request.
      </p>
    );
  }
  const items = section.items.filter((i) => i.visible);
  if (items.length === 0) return <Placeholder text="No references yet." />;
  return (
    <div className="space-y-2">
      {items.map((r) => {
        const id = eid.item(section.id, r.id);
        return (
          <div
            key={r.id}
            data-element-id={id}
            className={`${dragClass} text-[0.95em]`}
            style={elementStyle(data, id)}
          >
            <div className="font-semibold">
              <Editable data={data} fieldId={`${id}.name`}>
                {r.name}
              </Editable>
            </div>
            <div className="text-neutral-700">
              <Editable data={data} fieldId={`${id}.role`}>
                {r.role}
              </Editable>
              {r.company && (
                <>
                  {" · "}
                  <Editable data={data} fieldId={`${id}.company`}>
                    {r.company}
                  </Editable>
                </>
              )}
            </div>
            <div className="text-[0.85em] text-neutral-500">
              <Editable data={data} fieldId={`${id}.email`}>
                {r.email}
              </Editable>
              {r.email && r.phone && " · "}
              <Editable data={data} fieldId={`${id}.phone`}>
                {r.phone}
              </Editable>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CustomBody({
  section,
  design,
  data,
}: SectionProps<CustomSection>) {
  const hasBody = section.body.trim().length > 0;
  const hasItems = section.items.some(
    (b) => b.visible && b.text.trim().length > 0,
  );
  if (!hasBody && !hasItems)
    return <Placeholder text="Empty custom section." />;
  const bodyId = `section.${section.id}.body`;
  return (
    <div>
      {hasBody && (
        <p
          data-element-id={bodyId}
          className={`${dragClass} whitespace-pre-wrap text-[0.95em]`}
          style={elementStyle(data, bodyId)}
        >
          {section.body}
        </p>
      )}
      {hasItems && (
        <BulletList
          bullets={section.items}
          design={design}
          data={data}
          sectionId={section.id}
        />
      )}
    </div>
  );
}

// ---------- Dispatch ----------

/** Single entry point — pick the right body renderer for any section. */
export function SectionBody({
  section,
  design,
  data,
}: {
  section: Section;
  design: GlobalDesign;
  data: ResumeData;
}) {
  switch (section.type) {
    case "summary":
      return <SummaryBody section={section} design={design} data={data} />;
    case "experience":
      return <ExperienceBody section={section} design={design} data={data} />;
    case "education":
      return <EducationBody section={section} design={design} data={data} />;
    case "skills":
      return <SkillsBody section={section} design={design} data={data} />;
    case "languages":
      return <LanguagesBody section={section} design={design} data={data} />;
    case "projects":
      return <ProjectsBody section={section} design={design} data={data} />;
    case "certifications":
      return (
        <CertificationsBody section={section} design={design} data={data} />
      );
    case "awards":
      return <AwardsBody section={section} design={design} data={data} />;
    case "publications":
      return <PublicationsBody section={section} design={design} data={data} />;
    case "volunteer":
      return <VolunteerBody section={section} design={design} data={data} />;
    case "talks":
      return <TalksBody section={section} design={design} data={data} />;
    case "hobbies":
      return <HobbiesBody section={section} design={design} data={data} />;
    case "references":
      return <ReferencesBody section={section} design={design} data={data} />;
    case "custom":
      return <CustomBody section={section} design={design} data={data} />;
  }
}

// ---------- Helpers ----------

function Placeholder({ text }: { text: string }) {
  return <p className="text-[0.85em] italic text-neutral-300">{text}</p>;
}

/**
 * Coerce a user-supplied URL into a safe `href`. Rejects `javascript:` and
 * `data:` even though Zod validation should have already filtered them —
 * defense in depth on every render.
 */
function safeHref(url: string): string {
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "#";
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:")
  ) {
    return trimmed;
  }
  // Bare domain — prepend https.
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return "#";
}

/** Public re-export so the editor's section header can also benefit from
 *  the URL sanitization. */
export { safeHref };
