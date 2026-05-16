#!/usr/bin/env node
// One-shot migration: wraps every hardcoded `fontFamily: "var(--font-X, ...)"`
// in template files with `var(--cv-title-font, ...)` or `var(--cv-body-font, ...)`
// so that the Design tab's Title/Body font pickers actually swap fonts on the
// 33 templates that had been bypassing those CSS vars and going straight to
// the next/font slug.
//
// Mapping comes from `defaultDesignForTemplate(id)` in src/lib/resume-defaults.ts.
// Third fonts (mono accents like JetBrains Mono on Geist, IBM Plex Mono on Carbon)
// are left unchanged — they are intentional template character, not a font-picker
// target. The user can still override them via per-element design overrides.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const TEMPLATES_DIR = join(ROOT, "src", "templates");

// Per-template title/body font from defaultDesignForTemplate. Mirrors
// src/lib/resume-defaults.ts — keep in sync if those defaults change.
// Templates not listed here use Inter/Inter (the base default).
const TEMPLATE_FONTS = {
  scratch: { title: "Inter", body: "Inter" },
  berlin: { title: "Inter", body: "Inter" },
  helsinki: { title: "Inter", body: "Inter" },
  tokyo: { title: "Inter", body: "Inter" },
  oslo: { title: "Inter", body: "Inter" },
  madrid: { title: "Inter", body: "Inter" },
  reykjavik: { title: "Inter", body: "Inter" },
  austin: { title: "Inter", body: "Inter" },
  aurora: { title: "Inter", body: "Inter" },
  eclipse: { title: "Fraunces", body: "Albert Sans" },
  copenhagen: { title: "Onest", body: "Onest" },
  vienna: { title: "Public Sans", body: "Public Sans" },
  manhattan: { title: "Lora", body: "Inter" },
  cambridge: { title: "EB Garamond", body: "EB Garamond" },
  blank: { title: "Inter", body: "Inter" },
  helvetica: { title: "Inter", body: "Inter" },
  geist: { title: "Geist", body: "Inter" },
  notion: { title: "Outfit", body: "Outfit" },
  linear: { title: "Inter", body: "Inter" },
  stripe: { title: "Inter", body: "Inter" },
  obsidian: { title: "Fraunces", body: "Inter" },
  carbon: { title: "IBM Plex Mono", body: "IBM Plex Mono" },
  midnight: { title: "EB Garamond", body: "EB Garamond" },
  onyx: { title: "Fraunces", body: "Inter" },
  graphite: { title: "Onest", body: "Onest" },
  geneva: { title: "Source Serif 4", body: "Inter" },
  zurich: { title: "Manrope", body: "Manrope" },
  frankfurt: { title: "Inter", body: "Inter" },
  singapore: { title: "Onest", body: "Source Serif 4" },
  dubai: { title: "EB Garamond", body: "EB Garamond" },
  bento: { title: "Manrope", body: "Manrope" },
  mosaic: { title: "Outfit", body: "Inter" },
  dashboard: { title: "Inter", body: "Inter" },
  atlas: { title: "Lora", body: "Inter" },
  heidelberg: { title: "EB Garamond", body: "EB Garamond" },
  boston: { title: "EB Garamond", body: "EB Garamond" },
  stanford: { title: "EB Garamond", body: "Inter" },
  madison: { title: "Lora", body: "Source Serif 4" },
  mayfair: { title: "Playfair Display", body: "Lora" },
  davos: { title: "Inter", body: "Inter" },
  atelier: { title: "Fraunces", body: "Inter" },
  studio: { title: "Inter", body: "Inter" },
  canvas: { title: "Lora", body: "Inter" },
  scrubs: { title: "Source Serif 4", body: "Inter" },
  founder: { title: "Fraunces", body: "Inter" },
  capitol: { title: "Inter", body: "Inter" },
  vesterbro: { title: "Inter", body: "Inter" },
  marina: { title: "Inter", body: "Inter" },
  // Danish bundle — already migrated, listed here for completeness so the
  // grep audit at the end recognises them as expected.
  aarhus: { title: "Inter", body: "Inter" },
  roskilde: { title: "Inter", body: "Inter" },
  odense: { title: "Fraunces", body: "Inter" },
  vejle: { title: "Inter", body: "Inter" },
  aalborg: { title: "Inter", body: "Inter" },
  frederiksberg: { title: "Inter", body: "Inter" },
  helsingor: { title: "Lora", body: "Inter" },
  silkeborg: { title: "Inter", body: "Inter" },
  aabenraa: { title: "Inter", body: "Inter" },
};

/** Mirrors slugFont() in src/templates/frame.tsx. */
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const STATIC_FILES = new Set([
  "registry.ts",
  "renderer.tsx",
  "sample-data.ts",
  "shared.ts",
  "components.tsx",
  "frame.tsx",
  "custom-elements-layer.tsx",
  "section-actions.tsx",
]);

let totalEdits = 0;
let totalFiles = 0;
let skippedThirdFonts = 0;
const filesTouched = [];
const filesSkipped = [];

for (const file of readdirSync(TEMPLATES_DIR)) {
  if (!file.endsWith(".tsx")) continue;
  if (STATIC_FILES.has(file)) continue;
  const templateId = file.replace(/\.tsx$/, "");
  const fonts = TEMPLATE_FONTS[templateId];
  if (!fonts) {
    console.warn(`[skip] ${templateId} — no font mapping`);
    filesSkipped.push(templateId);
    continue;
  }

  const titleSlug = slugify(fonts.title);
  const bodySlug = slugify(fonts.body);
  const path = join(TEMPLATES_DIR, file);
  const original = readFileSync(path, "utf8");

  // Match: fontFamily:\s*"var\(--font-<slug>, ...full-string-until-closing-quote..."
  // Multi-line aware via [\s\S].
  const re = /fontFamily:\s*"var\(--font-([a-z0-9-]+),([^"]*)"/g;

  let edits = 0;
  let skippedHere = 0;
  const updated = original.replace(re, (match, slug, rest) => {
    let varName;
    if (slug === titleSlug) varName = "--cv-title-font";
    else if (slug === bodySlug) varName = "--cv-body-font";
    else {
      // Third font — intentional secondary identity (e.g. JetBrains Mono dates
      // on Geist, IBM Plex Mono on Carbon). Leave alone.
      skippedHere += 1;
      return match;
    }
    edits += 1;
    return `fontFamily: "var(${varName}, var(--font-${slug},${rest})"`;
  });

  if (edits > 0) {
    writeFileSync(path, updated);
    totalEdits += edits;
    totalFiles += 1;
    filesTouched.push(`${templateId} (+${edits}${skippedHere ? `, ${skippedHere} third-font kept` : ""})`);
  }
  skippedThirdFonts += skippedHere;
}

console.log(`\nDone.`);
console.log(`  files touched   : ${totalFiles}`);
console.log(`  total edits     : ${totalEdits}`);
console.log(`  third-fonts kept: ${skippedThirdFonts}`);
console.log(`\nFiles changed:`);
for (const f of filesTouched) console.log(`  ${f}`);
if (filesSkipped.length > 0) {
  console.log(`\nSkipped (no mapping):`);
  for (const f of filesSkipped) console.log(`  ${f}`);
}
