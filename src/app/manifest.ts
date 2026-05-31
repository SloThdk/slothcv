/**
 * manifest.ts — PWA web app manifest, emitted to /manifest.webmanifest.
 *
 * Makes SlothCV installable (Add to Home Screen / desktop PWA) and sets the
 * standalone window + splash colors. Not a search ranking factor, but part of
 * a complete, Lighthouse-clean setup and a real win for repeat users.
 *
 * Next auto-injects the <link rel="manifest"> for us when this route exists.
 * `force-static` is required for output:"export".
 */

import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_SHORT_NAME, SITE_DESCRIPTION } from "@/lib/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#0f172a",
    // Next's manifest type takes a single `purpose` per entry (not the
    // spec's space-separated form), so the 512 is listed twice — once as
    // "any" for normal use, once "maskable" for adaptive-icon platforms.
    icons: [
      {
        src: "/icons/slothcv-mark-v1-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/slothcv-mark-v1-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/slothcv-mark-v1-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
