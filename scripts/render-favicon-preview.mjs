import sharp from "sharp";
import { readFileSync } from "node:fs";

const svg = readFileSync("public/icons/slothcv-mark-v1.svg", "utf8");
const fixed = svg.replace('preserveAspectRatio="none"', "");

await Promise.all([
  sharp(Buffer.from(fixed), { density: 150 })
    .resize(192, 192)
    .png()
    .toFile("public/icons/slothcv-mark-v1-192.png"),
  sharp(Buffer.from(fixed), { density: 150 })
    .resize(64, 64)
    .png()
    .toFile("public/icons/slothcv-mark-v1-64.png"),
  sharp(Buffer.from(fixed), { density: 150 })
    .resize(32, 32)
    .png()
    .toFile("public/icons/slothcv-mark-v1-32.png"),
  sharp(Buffer.from(fixed), { density: 150 })
    .resize(16, 16)
    .png()
    .toFile("public/icons/slothcv-mark-v1-16.png"),
]);
console.log("rendered 192/64/32/16 PNGs");
