import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";

const mark = readFileSync("public/icons/slothcv-mark.svg", "utf8")
  .replace('fill="currentColor"', 'fill="#0a0a0a"');

const composed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048">
<rect width="2048" height="2048" fill="#fafaf9"/>
${mark.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}
</svg>`;

await sharp(Buffer.from(composed), { density: 150 })
  .resize(180, 180)
  .png()
  .toFile("src/app/apple-icon.png");

console.log("rendered src/app/apple-icon.png (180x180, #fafaf9 bg + #0a0a0a glyph)");
