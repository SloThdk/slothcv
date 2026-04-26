/**
 * Site header — wordmark left, auth controls right.
 *
 * Renders as a Server Component so we can read the current user without a
 * client-side roundtrip. Sign-out is a `<form action="/auth/signout"
 * method="post">` so it works without JS and survives RSC navigation.
 */

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-neutral-900"
        >
          slothcv
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              {/*
                Server-side sign-out: the route handler clears the Supabase
                session cookies and redirects home. No client JS required —
                works even if hydration is broken.
              */}
              <form action="/auth/signout" method="post">
                <Button variant="outline" size="sm" type="submit">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
