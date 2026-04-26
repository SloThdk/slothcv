/**
 * /auth/callback — finishes the magic-link / OAuth round-trip.
 *
 * Phase 1 ships as a static export, so this is a client component (no
 * Route Handler). Supabase's PKCE flow appends `?code=...` to the redirect;
 * `exchangeCodeForSession` swaps it for a session cookie/local-storage token,
 * after which we navigate to the `next` param the login form passed in.
 *
 * If anything goes wrong, we send the user back to /login with an error
 * flag — never leave them on a blank screen.
 */

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;
    const code = params.get("code");
    const next = params.get("next") ?? "/dashboard";
    const errorDescription = params.get("error_description");

    // Provider-side error (e.g. user denied OAuth consent) — surface and
    // bounce. Don't try to redeem a non-existent code.
    if (errorDescription) {
      router.replace(`/login?error=${encodeURIComponent(errorDescription)}`);
      return;
    }

    if (!code) {
      router.replace("/login?error=missing_code");
      return;
    }

    (async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;
      if (error) {
        router.replace("/login?error=exchange_failed");
        return;
      }
      // `next` is user-supplied, so only honour relative paths to avoid an
      // open-redirect (e.g. ?next=https://evil.com).
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      setMessage("Signed in. Redirecting…");
      router.replace(safeNext);
    })();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-neutral-500">
      {message}
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-neutral-500">
          Loading…
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
