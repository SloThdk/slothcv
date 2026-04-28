/**
 * Cloudflare Pages Function — `/auth/google/callback`
 *
 * Sibling of `init.ts`. Google redirects the user back here after
 * consent, with `?code=...&state=...` (or `?error=...` if declined).
 *
 * # The callback-side checklist (every item must pass)
 *
 *   1. Read `code` + `state` from query string.
 *   2. Read `g_state`, `g_nonce`, `g_pkce`, `g_next` from cookies.
 *   3. Verify `state === g_state` — CSRF guard. If a victim browser
 *      were tricked into landing on a forged callback URL with an
 *      attacker's `code`, the cookie state wouldn't match.
 *   4. POST the authorization code to Google's token endpoint with
 *      `client_secret` + `code_verifier`. Google validates PKCE and
 *      the secret, returns `id_token` + `access_token`.
 *   5. Decode the ID token's payload (no signature verification yet —
 *      Supabase verifies on its end via `signInWithIdToken`). Extract
 *      the `nonce` claim.
 *   6. Verify `claim.nonce === g_nonce` — replay guard. A stolen ID
 *      token from a different OAuth round-trip wouldn't match.
 *   7. Hand the ID token to the client via a redirect to
 *      `/auth/google/finalize/` with `id_token` + `nonce` in the URL
 *      HASH FRAGMENT. Hash fragments are NEVER sent to servers
 *      (no proxy log, no referer leak), only readable by JS in the
 *      browser. The finalize page calls `supabase.auth.signInWithIdToken`
 *      which sets the session cookies and redirects to the dashboard.
 *
 * # Why we don't verify the ID-token signature here
 *
 * Skipping signature verification on this side feels suspicious but
 * is intentional + safe:
 *
 *   - We're posting the token to Supabase via signInWithIdToken
 *     within seconds. Supabase fetches Google's JWKS, verifies the
 *     RS256 signature against the right kid, checks aud/iss/exp,
 *     verifies the nonce we passed. If any of that fails, Supabase
 *     refuses to mint a session.
 *   - Adding our own JWKS-fetch + RS256-verify would duplicate that
 *     work, ship more code to the Worker, and create a divergence
 *     risk if Google rotates keys mid-deploy.
 *
 * The nonce check we DO perform here is cheap (compare two strings)
 * and gives us a fast-fail before we even render the finalize page —
 * worth the code.
 *
 * # Cookie hygiene
 *
 * On every response (success or error) we clear all four OAuth-state
 * cookies. Failure to clear leaves stale state behind that'd be
 * picked up by the next flow → "expired_session" or "csrf_mismatch"
 * the user doesn't understand because their fresh click "should
 * work". The 10-minute Max-Age in init.ts catches the worst case
 * (closed tab, never returned), but explicit clears here cover the
 * common path.
 */

interface Env {
  GOOGLE_CLIENT_ID: string;
  /** Stored as a CF Pages SECRET — NOT a regular env var. Set via:
   *
   *     wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name slothcv
   *
   *  Encrypted at rest, decrypted into the Worker runtime per request.
   *  Never commit this value to the repo or print it in logs. */
  GOOGLE_CLIENT_SECRET: string;
}

interface FunctionContext<E> {
  request: Request;
  env: E;
}

export const onRequestGet = async ({
  request,
  env,
}: FunctionContext<Env>): Promise<Response> => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  // User declined consent / Google returned an error → friendly bounce.
  // The error_description query param sometimes carries Google-side
  // detail; we don't surface it to the client (avoids prompt-injection
  // chains via the `?error_description=` parameter which would leak
  // straight into the user-facing /login error toast).
  if (providerError) {
    const lower = providerError.toLowerCase();
    const mapped =
      lower === "access_denied" || lower.includes("denied")
        ? "oauth_declined"
        : "exchange_failed";
    return clearStateAndRedirect(request, mapped);
  }

  if (!code || !state) {
    return clearStateAndRedirect(request, "missing_code");
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return clearStateAndRedirect(request, "config_error");
  }

  const cookies = parseCookies(request);
  const cookieState = cookies["g_state"];
  const cookieNonce = cookies["g_nonce"];
  const cookiePkce = cookies["g_pkce"];
  const cookieNext = cookies["g_next"] ?? "/dashboard";

  if (!cookieState || !cookieNonce || !cookiePkce) {
    // Cookies missing (cleared mid-flow, lab tools, super-private
    // browsing, or 10-min TTL exceeded). User has to start over.
    return clearStateAndRedirect(request, "expired_session");
  }
  if (state !== cookieState) {
    // CSRF guard. Almost never benign — if a user lands here with a
    // mismatched state, treat the session as poisoned and reset.
    return clearStateAndRedirect(request, "exchange_failed");
  }

  // Exchange the authorization code with Google.
  const redirectUri = `${url.protocol}//${url.host}/auth/google/callback`;
  const tokenBody = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code_verifier: cookiePkce,
  });

  let tokenJson: { id_token?: string; access_token?: string; error?: string };
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    });
    if (!tokenRes.ok) {
      // Google returned 4xx/5xx. Body has `error` + `error_description`
      // but we don't surface details to the client. Common causes:
      //   - redirect_uri mismatch (operator misconfig)
      //   - invalid_grant (code already used, code expired, PKCE
      //     mismatch). Single-use tokens; a refresh on this URL trips
      //     this branch.
      //   - invalid_client (wrong client_secret)
      return clearStateAndRedirect(request, "exchange_failed");
    }
    tokenJson = await tokenRes.json();
  } catch {
    // Network error, DNS failure, etc.
    return clearStateAndRedirect(request, "exchange_failed");
  }

  const idToken = tokenJson.id_token;
  if (!idToken || typeof idToken !== "string") {
    return clearStateAndRedirect(request, "exchange_failed");
  }

  // Decode JWT payload (NO signature check — Supabase does that). We
  // only need the nonce claim for the replay guard.
  //
  // **Nonce comparison is HASHED + HEX-encoded.** Init sent
  // sha256Hex(cookieNonce) to Google, and Google stored that hex hash
  // in the id_token's `nonce` claim. So we compute sha256Hex of the
  // cookie value and compare. The raw nonce stays in the cookie
  // because the finalize page hands it (raw) to Supabase's
  // signInWithIdToken, which performs its OWN sha256-hex + compare.
  // Encoding choice (hex, not base64url) matches Supabase's
  // server-side implementation — see init.ts for the lesson learned.
  const claim = decodeJwtPayload(idToken);
  const expectedClaimNonce = await sha256Hex(cookieNonce);
  if (!claim || claim.nonce !== expectedClaimNonce) {
    return clearStateAndRedirect(request, "exchange_failed");
  }

  // Hand off to the client-side finalize page.
  //
  // Earlier revision used the URL HASH FRAGMENT (#id_token=...) so the
  // token never appeared in server logs or referers. That was the
  // textbook OAuth implicit-flow handoff. In practice it didn't survive
  // a CF Pages 302 redirect: somewhere in the Worker → Cloudflare edge
  // → browser chain, the fragment was being dropped, and the finalize
  // page saw an empty `window.location.hash` → bounced to /login with
  // `missing_code`.
  //
  // Replacement: store the id_token + nonce in SHORT-LIVED httpOnly
  // cookies (Max-Age=120s). The finalize page makes a fetch to a
  // sibling Function (`/auth/google/finalize-data`) which reads the
  // cookies, returns them in the response body, and clears them in
  // the response headers. The token is in the response body for
  // exactly one HTTP round-trip and never lives on disk in any log.
  // It's the same security posture as Supabase's broker (which also
  // keeps the access_token server-side until the client asks for it).
  const safeNext =
    cookieNext.startsWith("/") && !cookieNext.startsWith("//")
      ? cookieNext
      : "/dashboard";

  const finalizeUrl =
    `${url.protocol}//${url.host}/auth/google/finalize/` +
    `?next=${encodeURIComponent(safeNext)}`;

  const headers = new Headers({ Location: finalizeUrl });
  // Clear the OAuth-flow cookies (g_state, g_nonce, g_pkce, g_next).
  appendClearStateCookies(headers);
  // Set the SHORT-LIVED handoff cookies. These live only long enough
  // for the finalize page to fetch and consume them — typically a few
  // hundred milliseconds. The 120s ceiling is a safety net for slow
  // 3G / inspector-paused-page scenarios; the finalize-data endpoint
  // clears them on first read regardless.
  headers.append(
    "Set-Cookie",
    `g_id_token=${encodeURIComponent(idToken)}; Max-Age=120; Path=/auth/; HttpOnly; Secure; SameSite=Lax`,
  );
  headers.append(
    "Set-Cookie",
    `g_id_nonce=${encodeURIComponent(cookieNonce)}; Max-Age=120; Path=/auth/; HttpOnly; Secure; SameSite=Lax`,
  );
  return new Response(null, { status: 302, headers });
};

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

/** SHA-256 the input string, return lowercase hex. Matches Supabase's
 *  server-side hex-digest used for nonce verification in
 *  `signInWithIdToken`. Same impl as init.ts — duplicated rather than
 *  shared because Pages Functions bundle each file independently. */
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

/** Decode a JWT's middle segment (claims) without signature
 *  verification. Returns null if the token isn't a well-formed JWT. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const claim = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = claim + "=".repeat((4 - (claim.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Set-Cookie strings that expire each OAuth-state cookie immediately.
 *  Path + attributes must EXACTLY match what init.ts set, or the
 *  browser refuses to clear (different cookie identity). */
function clearCookieHeader(name: string): string {
  return `${name}=; Max-Age=0; Path=/auth/; HttpOnly; Secure; SameSite=Lax`;
}

function appendClearStateCookies(headers: Headers): void {
  for (const name of ["g_state", "g_nonce", "g_pkce", "g_next"]) {
    headers.append("Set-Cookie", clearCookieHeader(name));
  }
}

function clearStateAndRedirect(request: Request, errCode: string): Response {
  const url = new URL(request.url);
  const headers = new Headers({
    Location: `${url.protocol}//${url.host}/login/?error=${errCode}`,
  });
  appendClearStateCookies(headers);
  return new Response(null, { status: 302, headers });
}
