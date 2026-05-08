/**
 * postbuild step — copy functions/ into out/functions/ so the
 * `wrangler pages deploy out` command picks up the Pages Functions.
 *
 * Why this script exists:
 *   The Cloudflare Pages CLI looks for Functions inside the
 *   directory passed to `pages deploy`. We deploy `out/` (the
 *   Next.js static export), but `functions/` lives at the repo root.
 *   Without this copy, `pages deploy out` ships the static site WITHOUT
 *   any Functions — the Google OAuth init/callback/finalize-data
 *   endpoints respond 404 on the live site, silently breaking the
 *   "Continue with Google" flow. Magic-link sign-in still works, so
 *   the failure is invisible to anyone not actively using OAuth.
 *
 *   Spotted in the 2026-05-08 abuse-hardening audit. Pure functional
 *   bug, not a security exposure — but breaking auth is breaking
 *   auth, and the fix is a one-line copy.
 *
 * Cross-platform:
 *   Uses Node's fs.cpSync (Node 16.7+, Bun-compatible) so the same
 *   script works on the GitHub Actions Ubuntu runner AND on Philip's
 *   Windows dev machine when he runs `bun run build` locally.
 *
 * Idempotent:
 *   - If `functions/` doesn't exist, the script logs and exits 0
 *     (Pages Functions are optional; absence is not an error).
 *   - If `out/` doesn't exist, the script throws — but that means
 *     `next build` failed to produce the static export, which is
 *     already caught by the lifecycle (postbuild only runs after a
 *     successful build).
 *   - If `out/functions/` already exists from a previous run, the
 *     copy overwrites it (recursive: true, force: true).
 *
 * Wired into package.json as the `postbuild` script — runs
 * automatically after every `bun run build` / `npm run build` /
 * `next build` invocation.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "functions");
const DEST = path.join(ROOT, "out", "functions");

if (!fs.existsSync(SRC)) {
  console.log(
    "[postbuild] no functions/ directory at repo root — skipping (Pages Functions are optional)",
  );
  process.exit(0);
}

if (!fs.existsSync(path.join(ROOT, "out"))) {
  console.error(
    "[postbuild] out/ directory missing — was `next build` run successfully?",
  );
  process.exit(1);
}

fs.cpSync(SRC, DEST, { recursive: true, force: true });

// Print a one-line confirmation so CI logs make the copy auditable
// without requiring `actions/setup-bun` log inspection.
const fileCount = fs
  .readdirSync(DEST, { recursive: true, withFileTypes: true })
  .filter((d) => d.isFile()).length;
console.log(
  `[postbuild] copied ${fileCount} file(s) from functions/ into out/functions/`,
);
