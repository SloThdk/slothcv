/**
 * Vesterbro — Danish-flavored two-column with a circular photo at top,
 * section-icon badges in the gutter, and a soft blue accent.
 *
 * Visual character:
 *   - Page-top centered photo in circle with a thin accent ring.
 *     Name + role tagline directly under the photo, also centered.
 *   - Two-column body: ~33 % left for personal/skills/languages/short
 *     items, 67 % right for narrative (summary, experience, education).
 *   - Each section heading shows a 28 px accent-tinted square badge with
 *     a lucide icon, then the title in a friendly weight 600.
 *   - Hairline accent rule under each heading. Generous line-height.
 *   - Off-white page (#fdfdfb) so the photo + badges read with warmth.
 */

"use client";

import {
  Award,
  Briefcase,
  Code2,
  FolderGit2,
  GraduationCap,
  HandHeart,
  Heart,
  Languages as LanguagesIcon,
  Lightbulb,
  Mic,
  Newspaper,
  ShieldCheck,
  Sparkles,
  User,
  Users as UsersIcon,
} from "lucide-react";
import { TemplateFrame } from "./frame";
import { SectionBody } from "./components";
import { SectionActions } from "./section-actions";
import { ContactLine } from "./scratch";
import {
  elementStyle,
  positionStyle,
  resolveDesign,
  visibleSections,
} from "./shared";
import type { ResumeData, Section, SectionType } from "@/types/resume";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

const SECTION_ICONS: Record<SectionType, React.ComponentType<{ className?: string }>> = {
  summary: User,
  experience: Briefcase,
  education: GraduationCap,
  skills: Code2,
  languages: LanguagesIcon,
  projects: FolderGit2,
  certifications: ShieldCheck,
  awards: Award,
  publications: Newspaper,
  volunteer: HandHeart,
  talks: Mic,
  hobbies: Heart,
  references: UsersIcon,
  custom: Sparkles,
};

/** Section types that prefer the narrow left column. */
const LEFT_TYPES = new Set<SectionType>([
  "skills",
  "languages",
  "certifications",
  "hobbies",
  "references",
  "awards",
]);

export function VesterbroTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);
  const left = visible.filter((s) => LEFT_TYPES.has(s.type));
  const right = visible.filter((s) => !LEFT_TYPES.has(s.type));

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Centered photo + name + role */}
      <header
        data-section-id="personal"
        className="mb-6 flex flex-col items-center cursor-pointer rounded-md p-1 -m-1 transition-colors hover:bg-neutral-100/60"
      >
        {design.photo.enabled && personal.photoUrl && (
          <div
            data-element-id="personal.photo"
            className="cursor-grab overflow-hidden rounded-full"
            style={{
              width: 110,
              height: 110,
              outline: `3px solid ${design.accentColor}33`,
              outlineOffset: 4,
              ...elementStyle(data, "personal.photo"),
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={personal.photoUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        <h1
          data-element-id="personal.name"
          className="mt-4 block w-fit cursor-text text-[2.1em] font-bold leading-[1.05] tracking-tight transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
          style={elementStyle(data, "personal.name")}
        >
          {personal.fullName || "Your name"}
        </h1>
        {personal.headline && (
          <p
            data-element-id="personal.headline"
            className="mt-1 block w-fit cursor-text text-[0.9em] font-semibold uppercase tracking-[0.22em] transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
            style={{
              color: design.accentColor,
              ...elementStyle(data, "personal.headline"),
            }}
          >
            {personal.headline}
          </p>
        )}
        <div className="mt-2">
          <ContactLine data={data} />
        </div>
      </header>

      {/* Two-column body */}
      <div
        className="grid gap-8"
        style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)" }}
      >
        <div className="space-y-5">
          {left.map((s) => (
            <BadgeSection key={s.id} section={s} data={data} />
          ))}
        </div>
        <div className="space-y-5">
          {right.map((s) => (
            <BadgeSection key={s.id} section={s} data={data} />
          ))}
        </div>
      </div>
    </TemplateFrame>
  );
}

function BadgeSection({
  section,
  data,
}: {
  section: Section;
  data: ResumeData;
}) {
  const d = resolveDesign(data.design, section);
  const Icon = SECTION_ICONS[section.type] ?? Lightbulb;
  return (
    <section
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-neutral-100/60 hover:ring-2 hover:ring-neutral-900/15"
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          aria-hidden
          className="grid h-7 w-7 place-items-center rounded-md"
          style={{
            background: `${d.accentColor}1a`,
            color: d.accentColor,
          }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h2
          className="text-[1em] font-semibold tracking-wide"
          style={{ color: d.accentColor }}
        >
          {section.title}
        </h2>
      </div>
      {/* Hairline rule under the heading row */}
      <div
        aria-hidden
        className="mb-2 h-px w-full"
        style={{ background: `${d.accentColor}33` }}
      />
      <SectionBody section={section} design={d} data={data} />
      <SectionActions section={section} />
    </section>
  );
}
