#!/usr/bin/env node
/*
 * generate-og-image.mjs — build the social share card + the 512px PWA icon.
 *
 * Outputs:
 *   public/og.png                         1200x630 OpenGraph / Twitter card
 *   public/icons/slothcv-mark-v1-512.png  512x512 maskable PWA icon
 *
 * SlothCV has no founder/product photo to use as a backdrop, so the card is a
 * self-contained branded SVG: a deep-slate gradient, the real sloth mark as a
 * large low-opacity watermark plus a small solid lockup, and the value
 * proposition set in type. NO domain URL is baked in — the card stays correct
 * after the domain is bought.
 *
 * Text is rendered as SVG <text> with a system-font fallback chain; sharp's
 * SVG rasteriser resolves these on the build machine (same approach proven on
 * the other sites). Run from the project root:
 *   node scripts/generate-og-image.mjs
 */
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const WIDTH = 1200;
const HEIGHT = 630;

// Pull the real brand mark and strip its <svg> wrapper so we can re-place the
// raw paths inside our own canvas with our own fill + transform.
const markInner = readFileSync(resolve("public/icons/slothcv-mark.svg"), "utf8")
  .replace(/^[\s\S]*?<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "");

const ogSvg = `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>

  <!-- backdrop -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>

  <!-- oversized mark watermark, bleeding off the right edge -->
  <g transform="translate(735,35) scale(0.275)" fill="#ffffff" opacity="0.05">
    ${markInner}
  </g>

  <!-- top-left lockup: small mark + wordmark -->
  <g transform="translate(64,52) scale(0.05)" fill="#fafaf9">
    ${markInner}
  </g>
  <text x="186" y="120" fill="#fafaf9"
        font-family="'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="40" font-weight="700" letter-spacing="-0.5">SlothCV</text>

  <!-- headline -->
  <text x="64" y="332" fill="#fafaf9"
        font-family="'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="84" font-weight="800" letter-spacing="-2.5">Free CV &amp; resume</text>
  <text x="64" y="426" fill="#fafaf9"
        font-family="'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="84" font-weight="800" letter-spacing="-2.5">builder.</text>

  <!-- subhead -->
  <text x="66" y="498" fill="#cbd5e1"
        font-family="'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="34" font-weight="400">No signup wall. No watermark. Just a clean PDF.</text>

  <!-- trust strip -->
  <text x="66" y="568" fill="#7c8aa0"
        font-family="'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="22" font-weight="600" letter-spacing="3">FREE FOREVER   .   EU-HOSTED   .   ATS-FRIENDLY PDF</text>
</svg>`;

// Light tile + dark glyph for the PWA icon, matching the existing apple-icon.
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048">
  <rect width="2048" height="2048" rx="280" fill="#fafaf9"/>
  <g fill="#0a0a0a">${markInner}</g>
</svg>`;

async function main() {
  await sharp(Buffer.from(ogSvg), { density: 144 })
    .png({ compressionLevel: 9 })
    .toFile(resolve("public/og.png"));

  await sharp(Buffer.from(iconSvg), { density: 150 })
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(resolve("public/icons/slothcv-mark-v1-512.png"));

  const og = await readFile(resolve("public/og.png"));
  console.log(`OK og.png: ${WIDTH}x${HEIGHT}, ${(og.length / 1024).toFixed(1)} KB`);
  const icon = await readFile(resolve("public/icons/slothcv-mark-v1-512.png"));
  console.log(
    `OK slothcv-mark-v1-512.png: 512x512, ${(icon.length / 1024).toFixed(1)} KB`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
