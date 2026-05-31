/**
 * postbuild step (runs after copy-functions-into-out.mjs) — write
 * out/version.json so the client-side VersionGuard can detect a stale deploy
 * and self-heal with a single reload. See src/components/version-guard.tsx.
 *
 * The stamp is the Next build id (.next/BUILD_ID). next.config sets that id to
 * the SAME value it bakes into the client bundle as NEXT_PUBLIC_BUILD_STAMP,
 * so the file written here and the constant compiled into the app are
 * guaranteed to match for a given build and to differ across deploys. That's
 * the whole mechanism: matching stamps = up to date, differing = stale.
 *
 * Cross-platform (Node fs only, Bun-compatible), idempotent, and fails loud
 * only when the build output is genuinely missing.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BUILD_ID_FILE = path.join(ROOT, ".next", "BUILD_ID");
const OUT_DIR = path.join(ROOT, "out");
const VERSION_FILE = path.join(OUT_DIR, "version.json");

if (!fs.existsSync(OUT_DIR)) {
  console.error(
    "[postbuild] out/ missing — was `next build` run with output:'export'?",
  );
  process.exit(1);
}

// Resolution order:
//   1. An explicit NEXT_PUBLIC_BUILD_STAMP in the environment (lets a caller
//      pin the stamp if they ever want to).
//   2. .next/BUILD_ID — the normal path; next.config's generateBuildId put the
//      baked stamp here.
//   3. Current time — last-resort so version.json is never written empty (and
//      so the guard still has SOMETHING to compare, even if it forces one
//      conservative reload).
let stamp = process.env.NEXT_PUBLIC_BUILD_STAMP;
if (!stamp && fs.existsSync(BUILD_ID_FILE)) {
  stamp = fs.readFileSync(BUILD_ID_FILE, "utf8").trim();
}
if (!stamp) {
  stamp = String(Date.now());
  console.warn(
    "[postbuild] no build id found — version.json stamped with current time",
  );
}

fs.writeFileSync(VERSION_FILE, JSON.stringify({ stamp }) + "\n", "utf8");
console.log(`[postbuild] wrote out/version.json (stamp=${stamp})`);
