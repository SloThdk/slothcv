/**
 * LoginForm — magic-link email + Google OAuth.
 *
 * Both flows complete at `/auth/callback`. The `next` query param is honored
 * so when AuthGate bounces an anonymous visitor here, they land back on the
 * page they were trying to reach after sign-in. Already-signed-in users are
 * forwarded to `next` immediately so the back button doesn't strand them on
 * the login page.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const next = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  // Forward already-signed-in users so they don't see a confusing login form.
  useEffect(() => {
    if (!loading && user) {
      const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      router.replace(safe);
    }
  }, [loading, user, next, router]);

  // Surface ?error=... once on mount so the user knows the previous attempt
  // failed (e.g. expired magic link, OAuth declined).
  useEffect(() => {
    if (!error) return;
    toast.error(decodeURIComponent(error).replaceAll("_", " "));
  }, [error]);

  // Build the absolute callback URL on the client so we hit the same origin
  // we're running on (works in localhost AND on every Pages preview URL).
  const callback = (() => {
    if (typeof window === "undefined") return "/auth/callback";
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("next", next);
    return url.toString();
  })();

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback },
    });
    setSubmitting(false);
    if (err) {
      // Generic external message; details are in the network response for
      // debugging without leaking provider internals to the user.
      toast.error("Couldn't send the link. Try again in a moment.");
      return;
    }
    setSent(true);
    toast.success("Check your inbox for a sign-in link.");
  }

  async function handleGoogle() {
    setSubmitting(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback },
    });
    if (err) {
      setSubmitting(false);
      toast.error("Google sign-in failed. Try again.");
    }
    // On success the browser is redirected away — no further state to set.
  }

  // While auth is resolving (and we might be about to forward), avoid the
  // login form briefly flashing for already-signed-in users.
  if (loading || user) {
    return (
      <p className="text-center text-sm text-neutral-400">Loading…</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sent ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          We sent a sign-in link to <strong>{email}</strong>. Open it on this
          device to continue.
        </div>
      ) : (
        <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
          <label
            htmlFor="email"
            className="text-sm font-medium text-neutral-800"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
          <Button type="submit" disabled={submitting || !email}>
            <Mail className="h-4 w-4" />
            {submitting ? "Sending…" : "Send magic link"}
          </Button>
        </form>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--background)] px-2 text-neutral-400">
            or
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogle}
        disabled={submitting}
      >
        Continue with Google
      </Button>
    </div>
  );
}
