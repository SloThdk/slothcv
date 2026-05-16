#!/usr/bin/env node
// One-shot follow-up to migrate-careerbreak-fallthrough.mjs:
// every template's section-type switch now widens `section` to
// `ExperienceSection | CareerBreakSection` because both labels fall
// through to the same case. The subcomponent props that receive that
// section were typed as `ExperienceSection` only — widen them to the
// union so the typecheck clears. CareerBreakSection has the same item
// shape (ExperienceItem[]) so the function bodies need no change.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const FILES = [
  "src/templates/atelier.tsx",
  "src/templates/aurora.tsx",
  "src/templates/boston.tsx",
  "src/templates/cambridge.tsx",
  "src/templates/canvas.tsx",
  "src/templates/carbon.tsx",
  "src/templates/components.tsx",
  "src/templates/davos.tsx",
  "src/templates/eclipse.tsx",
  "src/templates/geist.tsx",
  "src/templates/graphite.tsx",
  "src/templates/helvetica.tsx",
  "src/templates/linear.tsx",
  "src/templates/madison.tsx",
  "src/templates/mayfair.tsx",
  "src/templates/midnight.tsx",
  "src/templates/obsidian.tsx",
  "src/templates/onyx.tsx",
  "src/templates/scrubs.tsx",
  "src/templates/stanford.tsx",
  "src/templates/stripe.tsx",
  "src/templates/studio.tsx",
];

let touched = 0;
let totalEdits = 0;
for (const rel of FILES) {
  const path = join(ROOT, rel);
  const original = readFileSync(path, "utf8");

  let updated = original;
  let edits = 0;

  // Widen the prop-type declaration. Pattern: `  section: ExperienceSection;`
  // (with whitespace + trailing semicolon, on its own line). Any match of
  // ExperienceSection that isn't already part of a union gets widened.
  const re = /( +section: )ExperienceSection(;)/g;
  updated = updated.replace(re, (_m, lead, tail) => {
    edits += 1;
    return `${lead}ExperienceSection | CareerBreakSection${tail}`;
  });

  // Ensure the file imports CareerBreakSection if we widened any prop.
  if (edits > 0 && !updated.includes("CareerBreakSection")) {
    // The existing import block has `ExperienceSection,` — slot
    // CareerBreakSection in alphabetical-ish order right after it.
    // (Files were generated from a template so the import shape is
    // uniform — `import type { ... } from "@/types/resume";`.)
    updated = updated.replace(
      /(\bExperienceSection,)/,
      "$1\n  CareerBreakSection,",
    );
  }

  if (edits > 0) {
    writeFileSync(path, updated);
    touched += 1;
    totalEdits += edits;
    console.log(`  ${rel} (+${edits})`);
  }
}
console.log(`\nDone. ${touched} files touched, ${totalEdits} prop types widened.`);
