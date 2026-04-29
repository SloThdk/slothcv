/**
 * Element-text lens — maps a `data-element-id` string to read/write
 * functions on the resume data.
 *
 * Used by the inline-edit-on-canvas feature: when a user double-clicks
 * any element marked with `data-element-id`, the editor looks up its
 * lens here. If a lens exists, an inline textarea is shown over the
 * element pre-filled with the current text, and on commit the lens
 * writes the new text back into the right field of the resume data.
 *
 * Element-id conventions live alongside the type definitions in
 * `src/types/resume.ts` (see ResumeData.elementOverrides). The lens
 * here parses the id and returns the right slice of the data model.
 *
 * Returning `null` means "this element-id isn't editable inline" — the
 * caller falls back to the previous behaviour (jump to the section's
 * form). Items with multiple text fields (work entries, education
 * entries, etc.) return null because there's no single text to edit;
 * the user uses the form for those.
 */

import type {
  CustomSection,
  HobbiesSection,
  ResumeData,
  Section,
  SummarySection,
} from "@/types/resume";

export interface TextLens {
  /** Current text — read live from the data passed in. */
  read: () => string;
  /** Commit a new value via the appropriate store action. The store
   *  actions are passed in so this stays a pure data layer with no
   *  Zustand coupling — the caller wires them. */
  write: (text: string) => void;
}

export interface LensWriters {
  setPersonal: (
    patch: Partial<ResumeData["personal"]>,
  ) => void;
  updateSection: <T extends Section>(id: string, patch: Partial<T>) => void;
  /** Patch the design block — needed for design-level inline-editable
   *  fields (watermark text). Optional so older callers that didn't
   *  expose design editing keep compiling. */
  setDesign?: (patch: Partial<ResumeData["design"]>) => void;
}

/** Resolve an element-id into a TextLens, or return null if the id
 *  isn't editable. Pure: no React, no Zustand. */
export function elementTextLens(
  id: string,
  data: ResumeData,
  writers: LensWriters,
): TextLens | null {
  // ----- design.* ---------------------------------------------------
  // The corner watermark — user-editable inline so double-clicking the
  // big "CV" letters lets them rename it to whatever they want
  // (initials, "Resume", company tag, etc.) without trip to the
  // Design tab. The setDesign writer is optional in the interface but
  // populated by the editor's preview so this path is live in practice.
  if (id === "design.watermark") {
    return {
      read: () => data.design.watermarkText ?? "",
      write: (s) => {
        if (writers.setDesign) {
          writers.setDesign({ watermarkText: s });
        }
      },
    };
  }

  // ----- personal.* ------------------------------------------------
  if (id === "personal.name") {
    return {
      read: () => data.personal.fullName,
      write: (s) => writers.setPersonal({ fullName: s }),
    };
  }
  if (id === "personal.headline") {
    return {
      read: () => data.personal.headline,
      write: (s) => writers.setPersonal({ headline: s }),
    };
  }
  if (id === "personal.email") {
    return {
      read: () => data.personal.email,
      write: (s) => writers.setPersonal({ email: s }),
    };
  }
  if (id === "personal.phone") {
    return {
      read: () => data.personal.phone,
      write: (s) => writers.setPersonal({ phone: s }),
    };
  }
  if (id === "personal.location") {
    return {
      read: () => data.personal.location,
      write: (s) => writers.setPersonal({ location: s }),
    };
  }
  // personal.links.<linkId> — edits the link's LABEL (not URL; URL
  // editing is via the form). Common case is "I want to change what
  // the link reads as", and labels are the visible text.
  if (id.startsWith("personal.links.")) {
    const linkId = id.slice("personal.links.".length);
    const idx = data.personal.links.findIndex((l) => l.id === linkId);
    if (idx < 0) return null;
    const link = data.personal.links[idx]!;
    return {
      read: () => link.label,
      write: (s) => {
        const links = [...data.personal.links];
        links[idx] = { ...link, label: s };
        writers.setPersonal({ links });
      },
    };
  }

  // ----- section.<sid>.* ------------------------------------------
  if (!id.startsWith("section.")) return null;
  const rest = id.slice("section.".length);
  // Format options:
  //   section.<sid>.title
  //   section.<sid>.body              (for summary/custom)
  //   section.<sid>.bullet.<bid>
  //   section.<sid>.item.<iid>        (no lens — see below)
  const firstDot = rest.indexOf(".");
  if (firstDot < 0) return null;
  const sid = rest.slice(0, firstDot);
  const tail = rest.slice(firstDot + 1);
  const section = data.sections.find((s) => s.id === sid);
  if (!section) return null;

  if (tail === "title") {
    return {
      read: () => section.title,
      write: (s) => writers.updateSection(sid, { title: s }),
    };
  }

  // section.<sid>.skillGroup.<encodedOldGroup> — bulk-rename the
  // `group` field on every skill that currently shares the old label.
  // Hits double-click on the "TECH" / "Soft skills" / etc. sub-header
  // in the rendered Skills section. Group name in the id is URI-
  // encoded by the renderer; we decode here so the comparison runs
  // against the original string.
  if (tail.startsWith("skillGroup.") && section.type === "skills") {
    const encoded = tail.slice("skillGroup.".length);
    let oldGroup: string;
    try {
      oldGroup = decodeURIComponent(encoded);
    } catch {
      // Malformed id — fall through and report null so the caller
      // shows the section's form instead of crashing the inline editor.
      return null;
    }
    type SkillsType = import("@/types/resume").SkillsSection;
    const skills = (section as SkillsType).items;
    return {
      read: () => oldGroup,
      write: (s) => {
        const next = s.trim();
        // Empty string → fall back to "Skills" so the renderer's
        // `s.group || "Skills"` default doesn't produce an empty
        // sub-header.
        const replacement = next || "Skills";
        const items = skills.map((it) =>
          it.group === oldGroup ? { ...it, group: replacement } : it,
        );
        writers.updateSection(sid, { items } as Partial<Section>);
      },
    };
  }

  if (tail === "body") {
    // Body lives on summary + custom sections. Hobbies/references "body"
    // is rendered from items, not from a single string — so for those
    // the body element-id isn't editable inline (returns null).
    if (section.type === "summary" || section.type === "custom") {
      return {
        read: () =>
          (section as SummarySection | CustomSection).body ?? "",
        write: (s) => writers.updateSection(sid, { body: s }),
      };
    }
    return null;
  }

  if (tail.startsWith("bullet.")) {
    const bid = tail.slice("bullet.".length);
    // Bullets live in section.items[*].bullets[*] for experience /
    // education / projects / volunteer / custom. Walk the structure to
    // find the one with matching id, then write back the modified item.
    // Sections whose items[] each contain a `bullets[]` array we can
    // walk to find the bullet by id. We use a generic helper instead of
    // four near-identical blocks, with `unknown` typing so TS doesn't
    // try to unify the discriminant types — the section is matched on
    // .type up front and `updateSection` accepts a `Partial<T>` that
    // covers each shape individually.
    if (
      section.type === "experience" ||
      section.type === "projects" ||
      section.type === "volunteer" ||
      section.type === "education"
    ) {
      type ItemWithBullets = { id: string; bullets: { id: string; text: string; visible: boolean }[] };
      const items = (section as { items: ItemWithBullets[] }).items;
      for (let i = 0; i < items.length; i++) {
        const it = items[i]!;
        const bIdx = it.bullets.findIndex((b) => b.id === bid);
        if (bIdx >= 0) {
          const bullet = it.bullets[bIdx]!;
          return {
            read: () => bullet.text,
            write: (s) => {
              const nextItems = items.map((row, rowI) => {
                if (rowI !== i) return row;
                const newBullets = row.bullets.slice();
                newBullets[bIdx] = { ...bullet, text: s };
                return { ...row, bullets: newBullets };
              });
              writers.updateSection(sid, {
                items: nextItems,
              } as Partial<Section>);
            },
          };
        }
      }
    }
    if (section.type === "custom") {
      // Custom sections render their bullets directly in section.items.
      const sec = section as CustomSection;
      const bIdx = sec.items.findIndex((b) => b.id === bid);
      if (bIdx >= 0) {
        const bullet = sec.items[bIdx]!;
        return {
          read: () => bullet.text,
          write: (s) => {
            const items = [...sec.items];
            items[bIdx] = { ...bullet, text: s };
            writers.updateSection(sid, { items });
          },
        };
      }
    }
    if (section.type === "hobbies") {
      // Hobbies items[] are { id, text } — bullets in disguise.
      const sec = section as HobbiesSection;
      const bIdx = sec.items.findIndex((b) => b.id === bid);
      if (bIdx >= 0) {
        const item = sec.items[bIdx]!;
        return {
          read: () => item.text,
          write: (s) => {
            const items = [...sec.items];
            items[bIdx] = { ...item, text: s };
            writers.updateSection(sid, { items });
          },
        };
      }
    }
    return null;
  }

  // section.<sid>.item.<iid>.<field> — inner field of an item.
  // Tagged in the body renderers (components.tsx + per-template
  // sources) so users can double-click a role / company / location
  // / institution / date / etc. to edit it inline.
  if (tail.startsWith("item.")) {
    const after = tail.slice("item.".length);
    const dot = after.indexOf(".");
    // No-field form — `section.<sid>.item.<iid>` with nothing after.
    // Some templates (Aurora's SkillsGroupedChips, certain compact
    // chip layouts) put `data-element-id` on the chip wrapper itself
    // without a `.name` / `.text` suffix, so the user sees the chip,
    // tries to double-click, and nothing happens because the lens
    // can't pick a target. Resolve the most-visible string property
    // of the item — `name` for skills / languages / certifications,
    // `text` for hobbies / custom bullets, `title` for talks /
    // publications — and treat THAT as the inline-edit target. This
    // makes "double-click on a chip / row to rename it" work for
    // free across every template that uses the chip pattern.
    if (dot < 0) {
      const itemId = after;
      const items = (section as { items?: unknown[] }).items;
      if (Array.isArray(items)) {
        const idx = items.findIndex(
          (it) =>
            it &&
            typeof it === "object" &&
            "id" in it &&
            (it as { id: string }).id === itemId,
        );
        if (idx >= 0) {
          const item = items[idx] as Record<string, unknown>;
          // Priority: name > text > title. These cover every item
          // shape in the schema. Anything else (compound items like
          // experience entries) keeps returning null since there's
          // no single text to edit and the user is expected to use
          // the form.
          const field =
            typeof item.name === "string"
              ? "name"
              : typeof item.text === "string"
                ? "text"
                : typeof item.title === "string"
                  ? "title"
                  : null;
          if (field) {
            return {
              read: () => (item[field] as string) ?? "",
              write: (s) => {
                const next = items.slice();
                next[idx] = { ...item, [field]: s };
                writers.updateSection(sid, {
                  items: next,
                } as Partial<Section>);
              },
            };
          }
        }
      }
    }
    if (dot > 0) {
      const itemId = after.slice(0, dot);
      const field = after.slice(dot + 1);
      const items = (section as { items?: unknown[] }).items;
      if (Array.isArray(items)) {
        const idx = items.findIndex(
          (it) =>
            it &&
            typeof it === "object" &&
            "id" in it &&
            (it as { id: string }).id === itemId,
        );
        if (idx >= 0) {
          const item = items[idx] as Record<string, unknown>;

          // Special case: `endDate` on items that have a `current`
          // boolean (experience / education / projects / volunteer).
          // When `current` is true the rendered text reads "Present"
          // instead of an actual date — so reading the raw "" field
          // would confuse the user. Read returns "Present", and the
          // write parser flips current on/off based on what the user
          // typed.
          if (
            field === "endDate" &&
            typeof item.current === "boolean"
          ) {
            const presentRe =
              /^(present|now|currently|today|nu|nuværende|nuvaerende)$/i;
            return {
              read: () =>
                item.current
                  ? "Present"
                  : ((item[field] as string) ?? ""),
              write: (s) => {
                const trimmed = s.trim();
                const isPresent = !trimmed || presentRe.test(trimmed);
                const next = items.slice();
                next[idx] = isPresent
                  ? { ...item, endDate: "", current: true }
                  : { ...item, endDate: trimmed, current: false };
                writers.updateSection(sid, {
                  items: next,
                } as Partial<Section>);
              },
            };
          }

          // Generic string field (role / company / location /
          // institution / degree / field / name / techStack / issuer
          // / authors / venue / date / startDate / etc.).
          if (typeof item[field] === "string") {
            return {
              read: () => (item[field] as string) ?? "",
              write: (s) => {
                const next = items.slice();
                next[idx] = { ...item, [field]: s };
                writers.updateSection(sid, {
                  items: next,
                } as Partial<Section>);
              },
            };
          }
        }
      }
    }
  }

  return null;
}
