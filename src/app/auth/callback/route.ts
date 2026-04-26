/**
 * /auth/callback — completes the OAuth / magic-link round-trip.
 *
 * Supabase appends `?code=...` (PKCE) for both magic-link redemptions and
 * OAuth provider callbacks. We exchange the code for a session cookie and
 * then redirect to the `next` param the login form passed in (defaults to
 * /dashboard so users land on something useful).
 *
 * Errors redirect back to /login with a flag so the user gets feedback
 * instead of a blank screen.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  // Honor `next` to land the user where they came from.
  return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/dashboard"}`);
}
