/**
 * sitemap.ts — the crawlable URL inventory, emitted to /sitemap.xml at build.
 *
 * Only the genuinely indexable public marketing surface is listed: the landing
 * page plus the two legal pages. Auth flows, the dashboard, the editor and the
 * other utility routes are intentionally excluded (they're noindex via
 * public/_headers + robots.ts) — listing them would waste crawl budget and
 * dilute the site with thin content.
 *
 * `force-static` is required: with output:"export" Next must render this at
 * build time into a static file (Next 16). URLs derive from site.ts so the
 * sitemap points at whatever SITE_URL resolves to.
 */

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

// A fixed, honest last-modified stamp. Bump it when the marketing/legal pages
// get a real content revision. Using a constant (not new Date()) keeps the
// sitemap byte-identical across rebuilds — pointless churn reads as a
// low-trust signal to some crawlers.
const LAST_MODIFIED = "2026-05-31";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/privacy/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
