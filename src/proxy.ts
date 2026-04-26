/**
 * Root proxy — runs Supabase session refresh + auth gating on every
 * non-static request. The matcher excludes Next internals and common static
 * asset extensions so we don't pay the cookie/refresh round-trip for them.
 *
 * Note: in Next 16 the `middleware` file convention was renamed to `proxy`.
 * The exported function name follows suit (`proxy`, not `middleware`).
 */

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip Next internals, image optimization output, favicon, and any file
    // with a recognised static extension (images, fonts). Everything else,
    // including our auth callback, runs through `updateSession`.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)",
  ],
};
