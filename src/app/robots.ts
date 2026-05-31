/**
 * robots.ts — emitted to /robots.txt at build time.
 *
 * Two modes, switched by whether SITE_URL is a real domain (site.ts INDEXABLE):
 *   - PREVIEW (localhost / *.pages.dev): Disallow everything. We never want the
 *     preview deployment crawled or indexed; this pairs with the global noindex
 *     meta so the preview can't leak into search and force a domain migration
 *     later.
 *   - PRODUCTION (custom domain): allow the marketing surface, disallow the
 *     auth/app/utility routes that carry no SEO value or hold private data.
 *
 * Replaces the former static public/robots.txt so the Sitemap + host lines
 * track the domain automatically (a static file would hard-code the old URL,
 * and Next won't let a public/robots.txt coexist with this route anyway).
 *
 * Note on /login, /signup, /forgot-password, /reset-password: these are NOT
 * disallowed here on purpose — they're left crawlable but marked noindex via
 * public/_headers, so Google fetches them, sees the header, and drops them
 * cleanly. Disallowing them would block the crawl and could leave a bare URL
 * lingering in the index instead.
 *
 * `force-static` is required for output:"export".
 */

import type { MetadataRoute } from "next";
import { SITE_URL, INDEXABLE } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) {
    // Preview / non-production host — keep the whole thing out of search.
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      sitemap: `${SITE_URL}/sitemap.xml`,
      host: SITE_URL,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/auth/",
          "/dashboard",
          "/dashboard/",
          "/editor",
          "/editor/",
          "/new",
          "/new/",
          "/account",
          "/account/",
          "/debug-templates",
          "/debug-templates/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
