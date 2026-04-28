/**
 * Cloudflare Pages Function — `/auth/google/init`
 *
 * Kicks off the DIY Google OAuth handshake. The user clicks "Continue
 * with Google" → frontend `window.location.href = "/auth/google/init"`
 * → THIS function generates the OAuth security parameters, sets them
 * as httpOnly cookies, and 302-redirects the browser to Google's
 * authorization endpoint.
 *
 * # Why a Cloudflare Pages Function (not a Next.js route handler)
 *
 * slothcv ships as `output: "export"` static, deployed to Cloudflare
 * Pages. There are no server-side route handlers in the bundle. CF
 * Pages Functions live in a sibling `functions/` directory, compile to
 * a separate Worker, and serve at the matching URL alongside the
 * static site. Adding ONE function (this one + the callback) is
 * surgical — no migration to OpenNext / SSR / Edge runtime, no
 * deploy-pipeline rewrite. The existing static export keeps shipping
 * verbatim.
 *
 * # The OAuth security parameters and why each is needed
 *
 *   - **state**: random opaque string. Round-tripped through the
 *     browser via cookie + Google's redirect query. The callback
 *     verifies the cookie value matches the query value — proves the
 *     callback request originated from a flow this server started, not
 *     a CSRF attacker pasting `?code=...&state=...` into a victim's
 *     browser.
 *
 *   - **nonce**: random opaque string. Embedded in Google's
 *     authorization URL → Google copies it into the issued ID token's
 *     `nonce` claim. The callback verifies token-claim-nonce matches
 *     the cookie-stored nonce — proves the ID token was minted in
 *     response to OUR specific request, not replayed from a cached
 *     prior session. The frontend then passes the nonce to
 *     `signInWithIdToken({ nonce })` for Supabase to verify
 *     independently — defense in depth.
 *
 *   - **PKCE code_verifier + code_challenge**: random secret +
 *     SHA-256(secret) = challenge. Google's authorize endpoint
 *     records the challenge; our callback presents the verifier when
 *     exchanging the code. An attacker who somehow intercepts the
 *     authorization code can't redeem it without the verifier sealed
 *     in our httpOnly cookie. PKCE is the modern OAuth recommendation
 *     for ALL flows (RFC 7636), not just public clients.
 *
 * # Cookie attributes — non-negotiable
 *
 *   - **HttpOnly**: blocks JS access. The verifier and nonce never
 *     touch the page's JS context.
 *   - **Secure**: only sent over HTTPS. CF Pages is HTTPS-only on the
 *     production domain; localhost dev would need adjustment, but
 *     slothcv only ships to production via this path.
 *   - **SameSite=Lax**: Google's redirect back to our domain is a
 *     top-level navigation, which Lax permits. Strict would refuse.
 *     None would invite CSRF on cross-site iframe redirects.
 *   - **Path=/auth/**: scope cookies to the auth flow. The dashboard /
 *     editor pages can't read or accidentally clobber them.
 *   - **Max-Age=600**: 10 minutes. Long enough for slow users with
 *     2FA or account-picker friction; short enough that a cookie left
 *     behind on a closed tab can't be picked up by a later session.
 *
 * # Why GET (not POST)
 *
 * The flow starts from a `<button onClick>` that just sets
 * `window.location.href = "/auth/google/init"`. A GET endpoint lets
 * us redirect cleanly without a hidden form / fetch+follow dance.
 * There's nothing CSRF-sensitive at THIS step (no state mutation —
 * we're starting a fresh OAuth flow); the CSRF protection lives in
 * the state cookie that the callback enforces.
 */

interface Env {
  /** Google OAuth 2.0 Client ID. Public-ish — visible in the Google
   *  authorization URL we redirect to, so no need to mark as secret.
   *  Stored in CF Pages env vars for change-management hygiene. */
  GOOGLE_CLIENT_ID: string;
}

/** Minimal CF Pages Function context shape. We don't depend on
 *  `@cloudflare/workers-types` to avoid a devDep that doesn't exist
 *  in this project — the runtime contract is stable. */
interface FunctionContext<E> {
  request: Request;
  env: E;
}

const COOKIE_PATH = "/auth/";
const COOKIE_MAX_AGE = 600;

export const onRequestGet = async ({
  request,
  env,
}: FunctionContext<Env>): Promise<Response> => {
  if (!env.GOOGLE_CLIENT_ID) {
    // Server misconfiguration — log via the response body so the
    // operator sees it in CF logs without bouncing through to a vague
    // error page on the client.
    return redirectToLogin(request, "config_error");
  }

  const url = new URL(request.url);

  // Sanitize `next`. Only relative paths — never honour a full URL
  // even if it points at our domain (would be an open-redirect waiting
  // to be turned into a phishing template). Same rule as the
  // `/auth/callback` page enforces for the magic-link flow.
  const nextRaw = url.searchParams.get("next") ?? "/dashboard";
  const safeNext =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/dashboard";

  // Crypto: state, nonce, PKCE.
  //
  // **The nonce dance with Supabase.** Supabase's
  // `signInWithIdToken({ nonce })` does NOT compare the passed nonce
  // to the ID token's `nonce` claim verbatim — it expects the claim to
  // be `sha256(nonce)`. So:
  //
  //   - Generate raw nonce R
  //   - Send sha256(R) to Google as the OAuth `nonce` param
  //   - Google embeds sha256(R) in the id_token's `nonce` claim
  //   - Cookie stores R
  //   - Callback verifies id_token.nonce === sha256(cookie R)
  //   - Finalize passes raw R to signInWithIdToken
  //   - Supabase computes sha256(R), compares to id_token.nonce → match
  //
  // First revision sent the raw nonce. Supabase rejected the ID token
  // with "Nonces mismatch" because the claim it received was the raw
  // nonce, but it computed sha256(nonce) and saw they differed. This
  // is the same pattern Apple's Sign-in-with-Apple uses, and Supabase
  // applies it uniformly across providers when a nonce is supplied.
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  // **Encoding matters for the nonce hash.** Supabase's
  // `signInWithIdToken` server-side computes `sha256(rawNonce)` and
  // expects it as a HEX STRING (64 chars, e.g.
  // "abc123def...0a"). PKCE's code_challenge per RFC 7636 uses
  // base64url, which is a different encoding of the same bytes.
  // Sending base64url where HEX is expected made Supabase reject
  // the id_token with "Nonces mismatch" — verified in the smoke
  // test via the dbg=SBE:Nonces+mismatch capture. So:
  //
  //   - PKCE code_challenge → base64url (RFC 7636)
  //   - Nonce sent to Google → HEX (so Supabase's hex compare matches)
  const hashedNonce = await sha256Hex(nonce);
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await sha256Base64Url(codeVerifier);

  // The redirect_uri must EXACTLY match the value registered in Google
  // Cloud Console (case + path + protocol + host). We derive it from
  // the request URL so dev (localhost) and prod (slothcv.pages.dev)
  // produce the right value automatically — operator only registers
  // each domain once on the Google side, no env-var coupling.
  const redirectUri = `${url.protocol}//${url.host}/auth/google/callback`;

  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  // openid → ID token issuance. email + profile → user identity claims
  // we hand to Supabase via signInWithIdToken. No drive / contacts /
  // anything else — minimum scope possible.
  auth.searchParams.set("scope", "openid email profile");
  auth.searchParams.set("state", state);
  // Send the HASHED nonce to Google. Google stores this in the
  // id_token's `nonce` claim. Cookie below stores the raw nonce so
  // the callback + finalize chain can hand the raw value to
  // signInWithIdToken, which hashes it server-side for comparison.
  auth.searchParams.set("nonce", hashedNonce);
  auth.searchParams.set("code_challenge", codeChallenge);
  auth.searchParams.set("code_challenge_method", "S256");
  // `select_account` forces the chooser even if only one Google
  // account is signed in — matches the user's intuition that
  // "Continue with Google" should let them pick. Without this Google
  // sometimes silently uses the most recently active account.
  auth.searchParams.set("prompt", "select_account");
  // `online` = we don't ask for a refresh token. signInWithIdToken
  // doesn't need one (Supabase manages its own session refresh).
  // Omitting `offline` keeps the consent screen single-step.
  auth.searchParams.set("access_type", "online");

  const headers = new Headers({ Location: auth.toString() });
  headers.append("Set-Cookie", serializeCookie("g_state", state));
  headers.append("Set-Cookie", serializeCookie("g_nonce", nonce));
  headers.append("Set-Cookie", serializeCookie("g_pkce", codeVerifier));
  headers.append("Set-Cookie", serializeCookie("g_next", safeNext));
  return new Response(null, { status: 302, headers });
};

/**
 * Generate a 32-byte random secret encoded as base64url (43 chars).
 * RFC 7636 §4.1 requires code_verifier to be 43-128 chars from the
 * unreserved URL set; 32 random bytes hits 43 chars and is sufficient
 * entropy.
 */
function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/** SHA-256 the input string, return base64url. Used for PKCE
 *  code_challenge per RFC 7636. */
async function sha256Base64Url(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return base64UrlEncode(new Uint8Array(buf));
}

/** SHA-256 the input string, return lowercase hex (64 chars). Used
 *  for the OAuth nonce, because Supabase's `signInWithIdToken`
 *  server-side computes the hex digest of the supplied nonce and
 *  compares it to the id_token's nonce claim — anything else is
 *  rejected as "Nonces mismatch". */
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  let out = "";
  for (const b of new Uint8Array(buf)) {
    out += b.toString(16).padStart(2, "0");
  }
  return out;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  // btoa is available in Workers / browsers; standard b64 → url-safe.
  return btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function serializeCookie(name: string, value: string): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    `Path=${COOKIE_PATH}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ];
  return parts.join("; ");
}

/** Trailing-slash because next.config.ts has `trailingSlash: true`,
 *  so /login resolves to a 308 → /login/. Going straight to the
 *  trailing-slash form skips that redirect. */
function redirectToLogin(request: Request, errCode: string): Response {
  const url = new URL(request.url);
  return new Response(null, {
    status: 302,
    headers: { Location: `${url.protocol}//${url.host}/login/?error=${errCode}` },
  });
}
