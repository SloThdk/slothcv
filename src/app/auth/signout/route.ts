/**
 * POST /auth/signout — clears the Supabase session cookies and bounces home.
 *
 * Wired up as a `<form action="/auth/signout" method="post">` from the site
 * header so it works without JS. Using POST (not GET) is intentional — sign
 * out is a state-changing action and should be CSRF-resistant by construction.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), {
    // Browsers preserve the request method on 302/307. 303 forces GET on the
    // redirect target, which is what we want after a POST.
    status: 303,
  });
}
