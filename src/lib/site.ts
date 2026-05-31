/**
 * site.ts — single source of truth for everything SEO + brand identity.
 *
 * THE DOMAIN SWITCH
 * -----------------
 * Every absolute-URL surface on the site (metadata canonical, OpenGraph +
 * Twitter tags, sitemap.xml, robots.txt host, JSON-LD @id/url) derives from
 * `SITE_URL` below. There is exactly ONE thing to change when the real domain
 * is bought: set `NEXT_PUBLIC_SITE_URL` in the environment (.env.local for a
 * local build, or the Cloudflare Pages project env for CI) and rebuild.
 * Nothing else needs touching.
 *
 * Until a domain is set, `SITE_URL` falls back to the live Pages subdomain so
 * the whole pipeline is correct today. Because that subdomain is a *preview*
 * host, the site auto-sets `noindex` (see INDEXABLE) — we don't want Google
 * indexing slothcv.pages.dev and then having to migrate that index to the
 * real domain later. The instant NEXT_PUBLIC_SITE_URL points at a real custom
 * domain, indexing switches on by itself. No second step on launch day.
 *
 * Static-export note: these values are read at BUILD time and baked into the
 * exported HTML/XML. They are not runtime-dynamic — rebuild to change them.
 */

const FALLBACK_URL = "https://slothcv.pages.dev";

/** Strip any trailing slash(es) so we can append paths without doubling up. */
function normalize(url: string): string {
  return url.replace(/\/+$/, "");
}

const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim();

/** Canonical absolute origin, e.g. "https://slothcv.com" (no trailing slash). */
export const SITE_URL = normalize(
  RAW_SITE_URL && RAW_SITE_URL.length > 0 ? RAW_SITE_URL : FALLBACK_URL,
);

/**
 * A "preview" host is localhost or any *.pages.dev / *.workers.dev subdomain —
 * anything that is NOT the customer-facing production domain. We keep preview
 * hosts out of the search index entirely.
 */
function isPreviewHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "localhost" ||
      host.startsWith("127.") ||
      host.endsWith(".pages.dev") ||
      host.endsWith(".workers.dev")
    );
  } catch {
    // Malformed URL → treat as preview (fail safe: never accidentally index).
    return true;
  }
}

/**
 * True only when serving from a real custom domain. Drives the global robots
 * directive: index production, noindex previews. Flips on automatically the
 * moment NEXT_PUBLIC_SITE_URL is pointed at the bought domain.
 */
export const INDEXABLE = !isPreviewHost(SITE_URL);

export const SITE_NAME = "SlothCV";
export const SITE_SHORT_NAME = "SlothCV";

/** <=60 chars — keyword-front-loaded for the SERP title. */
export const SITE_TITLE_DEFAULT =
  "Free CV & Resume Builder — No Watermark | SlothCV";

/** Child pages render as e.g. "Privacy | SlothCV". */
export const SITE_TITLE_TEMPLATE = "%s | SlothCV";

/** <=155 chars — the SERP meta description. */
export const SITE_DESCRIPTION =
  "Build a polished CV or resume for free — no signup wall, no watermark. Pick a template, fill a simple form, and export a crisp vector PDF. EU-hosted.";

/** Shorter line for social cards, where space is tighter. */
export const SITE_OG_DESCRIPTION =
  "Free, watermark-free CV & resume builder. Templates, live preview, and crisp vector-PDF export. Hosted in the EU.";

/**
 * Primary UI language. The DA toggle is metadata-only today (no /da/ URLs),
 * so we advertise a single canonical language rather than a dishonest hreflang
 * that would point at URLs which don't exist yet.
 */
export const SITE_LOCALE = "en";
export const SITE_OG_LOCALE = "en_US";

/** Path to the 1200x630 share image (built by scripts/generate-og-image.mjs). */
export const OG_IMAGE_PATH = "/og.png";

/** Square brand mark used as the JSON-LD logo. */
export const LOGO_PATH = "/icons/slothcv-mark-v1-192.png";

/**
 * sameAs[] — official brand profiles. SlothCV stands on its own brand and has
 * no social presence yet; leaving this empty is correct (pointing Google at
 * unrelated personal accounts would muddy the entity). Add real profiles here
 * when they exist.
 */
export const SOCIAL_LINKS: string[] = [];

/** Resolve a site-relative path to an absolute URL against SITE_URL. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Soft keyword set — low SEO weight today, but harmless and honest. */
export const SITE_KEYWORDS = [
  "free CV builder",
  "free resume builder",
  "CV maker",
  "resume maker",
  "no watermark CV",
  "PDF resume",
  "online CV builder",
  "ATS-friendly resume",
  "gratis CV",
  "CV generator",
];

/** Feature list surfaced in the SoftwareApplication JSON-LD node. */
export const SITE_FEATURES = [
  "Free CV and resume builder",
  "30+ professionally designed templates",
  "Live preview editor",
  "Vector PDF export (ATS-friendly)",
  "No watermark",
  "No signup wall to export",
  "EU-hosted (GDPR-compliant)",
  "Light and dark themes",
  "English and Danish interface",
];
