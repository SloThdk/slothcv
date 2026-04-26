/**
 * Browser-side Supabase client.
 *
 * Phase 1 ships as a static export to Cloudflare Pages — there's no server
 * process, so auth + data access run entirely from the browser. RLS (see
 * `supabase/migrations/00000000000001_init.sql`) is the authoritative
 * security gate. The anon key is safe to ship to clients.
 *
 * The factory function pattern (rather than a module-level singleton) keeps
 * each call cheap and avoids cross-tab leakage if we ever need a per-tab
 * session in the future.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Explicit type so the memoized client retains its full Supabase generics
// (otherwise destructuring `{ data }` from `getSession` widens to `any`).
let cached: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  // Memoize within a tab so `useEffect`/`useTransition` callers aren't
  // creating new clients on every render — Supabase keeps internal state
  // (auth listeners, realtime channels) and constructing fresh clients
  // would leak listeners.
  if (cached) return cached;
  cached = createBrowserClient(
    // Both env vars are required at build time; missing values fail loudly so
    // a misconfigured deploy never silently degrades to "no auth".
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return cached;
}
