import type { NextConfig } from "next";

/**
 * Phase 1 ships as a static export.
 *
 * Why static instead of SSR:
 *   - Next 16 forces `proxy.ts` to use the Node.js runtime (no opt-out),
 *     which the Cloudflare adapter (`@opennextjs/cloudflare`) refuses to
 *     bundle. Edge Runtime opt-in only exists for legacy `middleware.ts`,
 *     which the same Next 16 release deprecated.
 *   - We deploy to Cloudflare Pages (free, instant rollouts, zero cold
 *     start) instead of Workers. RLS is the security gate, and all data
 *     calls are client-side via @supabase/ssr's browser client.
 *
 * Trade-off: gating happens client-side via <AuthGate>, not in middleware.
 * Anonymous visitors briefly see a "Loading…" before the redirect. RLS still
 * prevents any actual data leakage — the loading flash is a UX papercut.
 *
 * If Phase 2 needs SSR (server-rendered PDF preview, ISR templates), we
 * downgrade to Next 15 + @cloudflare/next-on-pages or move to a Worker
 * deploy with Edge middleware.
 */
// Unique per build. Baked into the client as NEXT_PUBLIC_BUILD_STAMP AND used
// as the Next build id, so scripts/write-version.mjs can read it back from
// .next/BUILD_ID and write out/version.json with the SAME value. VersionGuard
// (src/components/version-guard.tsx) compares the baked constant to the live
// file at runtime and reloads once when a browser is showing a stale deploy —
// the client-side half of the no-store HTML caching policy in public/_headers.
const BUILD_STAMP = process.env.NEXT_PUBLIC_BUILD_STAMP ?? String(Date.now());

// Make the stamp a real NEXT_PUBLIC_ env var BEFORE the build compiles. This is
// the mechanism Next's standard `process.env.NEXT_PUBLIC_*` inliner reads from,
// so the literal lands in BOTH the client and server bundles (the well-known
// git-sha-in-next.config pattern). The `env: {}` config key looks equivalent
// but does NOT inline into client chunks under Next 16 + Turbopack — verified
// empirically (the stamp was absent from out/_next/static), so we set the var
// directly instead. VersionGuard reads it back as a baked constant.
process.env.NEXT_PUBLIC_BUILD_STAMP = BUILD_STAMP;

// --- Canonical site origin (2026-05-31 custom-domain launch) -----------------
// slothcv now lives at https://slothcv.philipsloth.com (Cloudflare Pages custom
// domain on the philipsloth.com zone — same project, same stack, the .pages.dev
// URL still resolves). This is the SSOT the SEO layer reads (src/lib/site.ts:
// canonical, OG, sitemap, robots, and INDEXABLE — which flips true on a real
// host). Set here in committed config rather than .env so every build, local or
// CI, bakes the right canonical and can't silently regress. We only UPGRADE the
// legacy pages.dev default — an explicit non-pages.dev override (a preview host,
// localhost) is still respected.
if (
  !process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL.includes("pages.dev")
) {
  process.env.NEXT_PUBLIC_SITE_URL = "https://slothcv.philipsloth.com";
}

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Static export emits to `out/` by default — wrangler.toml points there.
  // Force trailing-slash so every page is `/foo/index.html`, which Pages and
  // most static hosts serve cleanly without rewrites.
  trailingSlash: true,
  productionBrowserSourceMaps: false,
  // Pin the build id to BUILD_STAMP so .next/BUILD_ID equals the value baked
  // into the client — the postbuild version writer reads it back from there.
  generateBuildId: () => BUILD_STAMP,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
