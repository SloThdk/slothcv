/**
 * Browser-side Supabase client.
 *
 * Used inside React Client Components for interactive flows (login form,
 * editor save buttons) where we need a session-aware client running in the
 * user's tab. Never import this from a Server Component or Route Handler —
 * it would defeat SSR session handling. Use `lib/supabase/server.ts` there.
 *
 * The anon key is safe to expose; row access is enforced server-side by RLS
 * (see `supabase/migrations/00000000000001_init.sql`).
 */

"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    // Both env vars are required at build time; missing values fail loudly so
    // a misconfigured deploy never silently degrades to "no auth".
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
