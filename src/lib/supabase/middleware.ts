/**
 * Session-refresh middleware helper.
 *
 * Supabase auth tokens expire on a short TTL; without a per-request refresh
 * the user's session would silently invalidate between page loads. This
 * helper is invoked from `src/middleware.ts` on every matched request:
 *
 *   1. Reads the current request cookies.
 *   2. Calls `supabase.auth.getUser()` to force a refresh if needed.
 *   3. Mirrors the refreshed cookies onto the outgoing response.
 *
 * It also gates the `/dashboard` and `/editor/*` routes — unauthenticated
 * visitors get a 302 to `/login`. Returning the response (instead of just
 * `NextResponse.next()`) is what ships the refreshed cookies back to the
 * browser; never short-circuit that or sessions will drift.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require an authenticated user. Anything not listed here renders
// for anonymous visitors (landing page, login page, auth callbacks).
const PROTECTED_PREFIXES = ["/dashboard", "/editor"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Mirror cookies onto BOTH the request (so downstream RSC reads see
          // the refreshed session) and the response (so the browser persists
          // it). Mutating just one would cause a one-request lag.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run any logic between client creation and getUser() —
  // the SSR helper relies on the call here to perform the refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const requiresAuth = PROTECTED_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (requiresAuth && !user) {
    // Bounce unauthenticated visitors to login, preserving where they wanted
    // to go via `next` so we can return them after sign-in.
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
