/**
 * AuthGate — client-side guard for routes that need a signed-in user.
 *
 * Replaces the Node.js proxy/middleware we'd use in a regular Next deploy.
 * On a static export, gating happens here:
 *
 *   - While auth is resolving, show a neutral placeholder (no flash).
 *   - If unauthenticated, redirect to /login with `next` set so we bounce
 *     the user back after sign-in. Crucially, `next` includes the *full*
 *     path + search string so query params like `?template=berlin` survive
 *     the auth round-trip.
 *   - Otherwise render children.
 *
 * RLS on every Supabase call is the authoritative security gate; this
 * component is purely UX (don't render dashboard chrome to anonymous users).
 *
 * Implementation note: we read `useSearchParams()` to preserve the current
 * query string in the `next` param. Next.js requires anything reading search
 * params to live inside a Suspense boundary in static-export / prerender
 * mode, so AuthGate provides one internally — every call site gets the
 * boundary for free without thinking about it.
 */

"use client";

import { Suspense, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function GateInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && !user) {
      // Build the *complete* return URL — pathname AND any query string the
      // user arrived with. Without this, clicking a template card on the
      // landing page would lose the template choice across login.
      const qs = searchParams.toString();
      const fullPath = (pathname ?? "/") + (qs ? `?${qs}` : "");
      const params = new URLSearchParams({ next: fullPath });
      // Use replace (not push) so back-button doesn't loop the user back
      // into the gated page they couldn't see.
      router.replace(`/login?${params.toString()}`);
    }
  }, [loading, user, router, pathname, searchParams]);

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-subtle">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  // Suspense is required because GateInner calls useSearchParams, which
  // triggers a CSR bailout during static export. Wrapping at the gate level
  // means callers don't need to remember to add their own boundary.
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-subtle">
          Loading…
        </div>
      }
    >
      <GateInner>{children}</GateInner>
    </Suspense>
  );
}
