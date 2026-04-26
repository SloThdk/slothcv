/**
 * Site header — wordmark left, auth controls right.
 *
 * Client component because we read auth state from the AuthContext (which
 * itself depends on browser-only Supabase APIs). The signed-in/out branch
 * waits on `loading` to avoid the "logged-in user briefly sees Sign in"
 * flash on hard navigations.
 */

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function SiteHeader() {
  const { user, loading, signOut } = useAuth();

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
          {loading ? (
            // Reserve the slot so layout doesn't shift when auth resolves.
            <div className="h-9 w-20" aria-hidden />
          ) : user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  void signOut();
                }}
              >
                Sign out
              </Button>
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
