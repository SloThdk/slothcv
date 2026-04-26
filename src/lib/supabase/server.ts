/**
 * Server-side Supabase client (App Router edition).
 *
 * Used inside Server Components, Route Handlers and Server Actions to issue
 * session-aware queries. Cookies are read/written through Next's `cookies()`
 * helper so Supabase's auth tokens stay in sync with the user's session
 * cookie across SSR navigations.
 *
 * Cookie writes inside Server Components throw — that's expected; the
 * middleware (`src/middleware.ts`) is responsible for the refresh-write
 * leg. Swallowing the throw here keeps Server Components functional while
 * still allowing Server Actions / Route Handlers to mutate cookies.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot mutate cookies. The middleware handles
            // the refresh write, so this branch is only hit in RSC reads —
            // safe to ignore.
          }
        },
      },
    },
  );
}
