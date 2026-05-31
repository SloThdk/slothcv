/**
 * Pages Functions middleware — retire the old *.pages.dev URL.
 *
 * slothcv's canonical home is https://slothcv.philipsloth.com (custom domain on
 * the same Cloudflare Pages project). The project's built-in slothcv.pages.dev
 * URL can't be deleted without deleting the whole project (which would also
 * take down the custom domain + the Google OAuth env vars), so instead we make
 * it inert: any request that arrives on the production pages.dev host is
 * 301-redirected to the same path on the custom domain. Permanent redirect so
 * search engines transfer authority to the real domain (canonical points there
 * too).
 *
 * Scope:
 *   - EXACT match on `slothcv.pages.dev` only — preview deploys
 *     (`<hash>.slothcv.pages.dev`) are left alone so they stay previewable.
 *   - The custom domain falls straight through to next() — static assets and
 *     the /auth/google/* functions serve normally, unchanged.
 *   - Path + query are preserved across the redirect.
 */

const CANONICAL_HOST = "slothcv.philipsloth.com";
const RETIRED_HOST = "slothcv.pages.dev";

/** Minimal CF Pages Function context shape. We don't depend on
 *  `@cloudflare/workers-types` (not a devDep here) — same approach as
 *  functions/auth/google/init.ts. */
interface MiddlewareContext {
  request: Request;
  next: () => Promise<Response>;
}

export const onRequest = async (
  context: MiddlewareContext,
): Promise<Response> => {
  const url = new URL(context.request.url);
  if (url.hostname === RETIRED_HOST) {
    return Response.redirect(
      `https://${CANONICAL_HOST}${url.pathname}${url.search}`,
      301,
    );
  }
  return context.next();
};
