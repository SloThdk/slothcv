/**
 * Cloudflare Pages Function — `/auth/google/finalize-data`
 *
 * One-shot bridge between the OAuth callback Function and the
 * client-side finalize page. The callback Function (`callback.ts`)
 * exchanges the Google authorization code for an ID token, stores
 * the token + nonce in short-lived httpOnly cookies (`g_id_token`,
 * `g_id_nonce`, Path=/auth/, Max-Age=120s), and 302-redirects the
 * browser to `/auth/google/finalize/`. That client-side page can't
 * read httpOnly cookies, so it `fetch()`-es THIS endpoint, which:
 *
 *   1. Reads the two cookies from the request
 *   2. Returns them in a JSON response body
 *   3. CLEARS both cookies in the response headers
 *
 * After the fetch round-trip, the id_token has lived in:
 *   - The httpOnly cookie (for the duration of the redirect, ~ms)
 *   - The fetch response body (in transit, then in JS variables)
 *   - The Supabase session cookies after `signInWithIdToken` (encrypted)
 *
 * It NEVER appears in:
 *   - The URL bar / browser history
 *   - The Referer header
 *   - CF Pages access logs (cookies aren't logged by default)
 *   - Server-side application logs (we don't log it)
 *
 * Security posture is equivalent to Supabase's broker model — the
 * id_token spends a brief moment in transit between server and client
 * and is consumed on arrival.
 *
 * # Why a separate Function (not the callback Function inline)
 *
 * The callback Function returns a 302 redirect — its response body
 * is meaningless. Returning JSON there would require the client to
 * follow the redirect and read the response body, which browsers
 * don't expose for cross-origin redirects. A second endpoint that
 * the finalize page explicitly fetches sidesteps that.
 *
 * # Why GET (not POST)
 *
 * GET is fine here — the cookie is the auth credential, no body
 * is needed. The "operation" (clearing the cookies) is technically
 * a state mutation, but it's the natural ONE-SHOT consumption of a
 * single-use token. Idempotent for the user (calling twice produces
 * the same effective outcome: first call returns the token + clears,
 * second call returns null because cookies are gone).
 */

interface FunctionContext {
  request: Request;
}

export const onRequestGet = async ({
  request,
}: FunctionContext): Promise<Response> => {
  const cookies = parseCookies(request);
  const idToken = cookies["g_id_token"];
  const nonce = cookies["g_id_nonce"];

  // Clear cookies regardless of whether we got values — defense
  // against partial-state replay attacks. Cookie attributes must
  // match the SET attributes byte-for-byte for the browser to clear.
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    // Don't cache this response — every fetch must hit the Function
    // fresh so each finalize attempt sees the cookies once and only
    // once. Without this, an aggressive CDN cache could replay an
    // old token to a new browser session.
    "Cache-Control": "no-store, max-age=0",
  });
  headers.append(
    "Set-Cookie",
    `g_id_token=; Max-Age=0; Path=/auth/; HttpOnly; Secure; SameSite=Lax`,
  );
  headers.append(
    "Set-Cookie",
    `g_id_nonce=; Max-Age=0; Path=/auth/; HttpOnly; Secure; SameSite=Lax`,
  );

  if (!idToken || !nonce) {
    // Either the user navigated here without going through the
    // OAuth flow, OR the cookies expired (>120s since callback), OR
    // a previous fetch already consumed them. Return 410 Gone so the
    // client can distinguish "expired" from network errors.
    return new Response(
      JSON.stringify({ error: "no_pending_session" }),
      { status: 410, headers },
    );
  }

  return new Response(
    JSON.stringify({ id_token: idToken, nonce }),
    { status: 200, headers },
  );
};

/** Cookie parser — same logic as in callback.ts. Intentionally
 *  duplicated rather than shared via an import because Pages Functions
 *  bundle each file independently and a lib import would compile
 *  separately into both Workers, doubling the cold-start path. */
function parseCookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  const header = req.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}
