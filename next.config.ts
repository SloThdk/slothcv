import type { NextConfig } from "next";

/**
 * Phase 1 ships SSR via Next's regular server because we use:
 *   - Server Components that read cookies (Supabase SSR helper).
 *   - Route Handlers for OAuth callback and signout.
 *   - Server Actions for dashboard mutations.
 *
 * Static export (`output: "export"`) would break all four. We deploy via
 * `@cloudflare/next-on-pages` (added in a follow-up step) so the same
 * runtime works on Cloudflare Pages.
 *
 * Image optimization is disabled because we have no remote images yet and
 * the static optimizer adds a runtime dependency we don't need on Pages.
 */
const nextConfig: NextConfig = {
  images: { unoptimized: true },
  // Avoid emitting the source-map files into the final build artifact —
  // smaller upload, no accidental leak of file paths.
  productionBrowserSourceMaps: false,
  // Pin Turbopack's project root to this folder. Without it Next walks
  // upward and may pick a stray lockfile in C:\Users\phili\ as the root,
  // which produces noisy warnings during build.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
