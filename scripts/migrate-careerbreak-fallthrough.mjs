#!/usr/bin/env node
// One-shot migration: add `case "careerBreak":` fallthrough above every
// `case "experience":` in templates that switch on section.type, so the
// new careerBreak section type renders identically to experience.
// CareerBreakSection has the same item shape (ExperienceItem[]) so the
// downstream rendering code handles both seamlessly.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
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
for (const rel of FILES) {
  const path = join(ROOT, rel);
  const original = readFileSync(path, "utf8");
  // Match `<indent>case "experience":` and prepend a careerBreak case above
  // it with matching indentation. The fallthrough is implicit — the next
  // line is the case body which serves both labels.
  const re = /^(\s+)case "experience":/gm;
  let edits = 0;
  const updated = original.replace(re, (match, indent) => {
    edits += 1;
    return `${indent}case "careerBreak":\n${indent}case "experience":`;
  });
  if (edits > 0) {
    writeFileSync(path, updated);
    touched += 1;
    console.log(`  ${rel} (+${edits})`);
  }
}
console.log(`\nDone. ${touched} files touched.`);
