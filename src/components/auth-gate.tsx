/**
 * AuthGate — client-side guard for routes that need a signed-in user.
 *
 * Replaces the Node.js proxy/middleware we'd use in a regular Next deploy.
 * On a static export, gating happens here:
 *
 *   - While auth is resolving, show a neutral placeholder (no flash).
 *   - If unauthenticated, redirect to /login with `next` set so we bounce
 *     the user back after sign-in.
 *   - Otherwise render children.
 *
 * RLS on every Supabase call is the authoritative security gate; this
 * component is purely UX (don't render dashboard chrome to anonymous users).
 */

"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      // Use replace (not push) so back-button doesn't loop the user back
      // into the gated page they couldn't see.
      const params = new URLSearchParams({ next: pathname ?? "/" });
      router.replace(`/login?${params.toString()}`);
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-neutral-400">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
