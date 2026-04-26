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
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Static export emits to `out/` by default — wrangler.toml points there.
  // Force trailing-slash so every page is `/foo/index.html`, which Pages and
  // most static hosts serve cleanly without rewrites.
  trailingSlash: true,
  productionBrowserSourceMaps: false,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
