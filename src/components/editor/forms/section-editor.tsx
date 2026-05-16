/**
 * SectionEditor — dispatches to the right per-type form for the expanded
 * section row in the left pane.
 *
 * All forms share two header controls: rename + (eventually) per-section
 * design override toggles. For v1 we only expose rename here; per-section
 * design overrides land in Phase 2.5 (the data model already supports them
 * via `Section.overrides`).
 */

"use client";

import { useEditorStore } from "@/lib/store/editor";
import type { Section } from "@/types/resume";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SummaryForm } from "./summary-form";
import { ExperienceForm } from "./experience-form";
import { EducationForm } from "./education-form";
import { SkillsForm } from "./skills-form";
import { LanguagesForm } from "./languages-form";
import { ProjectsForm } from "./projects-form";
import { CertificationsForm } from "./certifications-form";
import { AwardsForm } from "./awards-form";
import { PublicationsForm } from "./publications-form";
import { VolunteerForm } from "./volunteer-form";
import { TalksForm } from "./talks-form";
import { HobbiesForm } from "./hobbies-form";
import { ReferencesForm } from "./references-form";
import { CustomForm } from "./custom-form";
import { SectionDesignOverrides } from "./section-design-overrides";

export function SectionEditor({ section }: { section: Section }) {
  const updateSection = useEditorStore((s) => s.updateSection);

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={`title-${section.id}`}>Section title</Label>
        <Input
          id={`title-${section.id}`}
          value={section.title}
          onChange={(e) => updateSection(section.id, { title: e.target.value })}
          maxLength={80}
        />
      </div>
      <Body section={section} />
      <SectionDesignOverrides section={section} />
    </div>
  );
}

function Body({ section }: { section: Section }) {
  switch (section.type) {
    case "summary":
      return <SummaryForm section={section} />;
    case "experience":
      return <ExperienceForm section={section} />;
    case "careerBreak":
      // Career break shares ExperienceForm — same item shape, just a
      // different section-type discriminator. See CareerBreakSection
      // in src/types/resume.ts for the rationale.
      return <ExperienceForm section={section} />;
    case "education":
      return <EducationForm section={section} />;
    case "skills":
      return <SkillsForm section={section} />;
    case "languages":
      return <LanguagesForm section={section} />;
    case "projects":
      return <ProjectsForm section={section} />;
    case "certifications":
      return <CertificationsForm section={section} />;
    case "awards":
      return <AwardsForm section={section} />;
    case "publications":
      return <PublicationsForm section={section} />;
    case "volunteer":
      return <VolunteerForm section={section} />;
    case "talks":
      return <TalksForm section={section} />;
    case "hobbies":
      return <HobbiesForm section={section} />;
    case "references":
      return <ReferencesForm section={section} />;
    case "custom":
      return <CustomForm section={section} />;
  }
}
