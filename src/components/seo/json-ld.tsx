/**
 * JsonLd — server-rendered schema.org structured data for the whole site.
 *
 * Emits a single @graph that ties three nodes together by @id so Google reads
 * them as one connected entity rather than three loose blobs:
 *   - Organization                          (the brand / publisher)
 *   - WebSite                               (the site itself)
 *   - SoftwareApplication / WebApplication  (the product — a free web app)
 *
 * Deliberately NO aggregateRating: there are no real reviews, and an empty or
 * fabricated rating is a Google rich-results penalty (rules/seo-first.md §4).
 * Deliberately NO LocalBusiness: SlothCV is a web app, not a place.
 *
 * Rendered once in the root layout. Every URL derives from site.ts, so the
 * graph tracks the domain automatically.
 */

import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_FEATURES,
  SITE_LOCALE,
  SOCIAL_LINKS,
  absoluteUrl,
  LOGO_PATH,
  OG_IMAGE_PATH,
} from "@/lib/site";

export function JsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl(LOGO_PATH),
          width: 192,
          height: 192,
        },
        description: SITE_DESCRIPTION,
        // Only emit sameAs when there are real profiles to point at.
        ...(SOCIAL_LINKS.length > 0 ? { sameAs: SOCIAL_LINKS } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: SITE_LOCALE,
      },
      {
        "@type": ["SoftwareApplication", "WebApplication"],
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        description: SITE_DESCRIPTION,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web browser",
        browserRequirements: "Requires JavaScript. Requires HTML5.",
        // The whole point of SlothCV: genuinely free. Price 0 is the honest,
        // rich-result-eligible signal.
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
        },
        featureList: SITE_FEATURES,
        screenshot: absoluteUrl(OG_IMAGE_PATH),
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: SITE_LOCALE,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Static JSON, no user input flows in — safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
