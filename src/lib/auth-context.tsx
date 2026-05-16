/**
 * AuthProvider — single source of truth for the signed-in user.
 *
 * Wraps the entire app in `layout.tsx`. Subscribes once to Supabase's
 * auth state changes and pushes the current user / loading flag down
 * through context. Consumers grab it via `useAuth()`.
 *
 * `loading` is exposed so consumers can render a skeleton instead of
 * bouncing a logged-in user to /login on first paint (which would
 * happen if `user === null` and "auth not yet resolved" were
 * collapsed into the same state).
 *
 * Admin-revoked-account kick-out (2026-05-16): we don't use the
 * session_revocations table + Realtime channel pattern yet (that's
 * still v0.5 if the latency requirement tightens) — but we DO run
 * a server-side `getUser()` validation on tab focus + every 60 s
 * while the tab is visible. If the call returns "user not found"
 * (admin deleted), "user banned" (admin suspended), or any other
 * 401/403 indicating the session no longer authenticates, we sign
 * the user out client-side and surface a toast explaining why.
 *
 * Without this, admin actions in Supabase Studio had no client-side
 * effect until the user's JWT next refreshed (~50 min), so a deleted
 * user kept seeing the UI (RLS blocked every read so no data
 * leaked, but the UX was confusing).
 */

"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { createClient } from "./supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
});

/** Map a Supabase auth-error string to the toast key that explains it. */
function reasonToTranslationKey(
  raw: string | undefined | null,
):
  | "auth.accountDeleted"
  | "auth.accountSuspended"
  | "auth.sessionExpired"
  | "auth.sessionRevoked" {
  const r = (raw ?? "").toLowerCase();
  if (
    r.includes("user not found") ||
    r.includes("user_not_found") ||
    r.includes("not found")
  )
    return "auth.accountDeleted";
  if (r.includes("banned") || r.includes("user_banned") || r.includes("suspend"))
    return "auth.accountSuspended";
  if (r.includes("expired") || r.includes("jwt expired"))
    return "auth.sessionExpired";
  return "auth.sessionRevoked";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  // Mirror the current user id into a ref so the validation loop can
  // read the latest value without re-creating its interval on every
  // user change. Without this, the polling interval would tear down +
  // re-create on every onAuthStateChange tick.
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;
  // Guards a single kick-out per session — without this, the validation
  // loop + the tab-focus listener can both fire and produce two toasts
  // + two redirects on the same revocation event.
  const kickedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    // Resolve initial state. `getSession` reads from local storage so this
    // is a synchronous-feeling read; no network unless the token is stale.
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to subsequent changes (sign-in, sign-out, token refresh).
    // Returning the unsubscribe is critical — without it, React 19's strict
    // double-mount in dev would leak listeners.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      // Reset the kick-guard when the user signs in fresh so a future
      // revocation can fire the toast again.
      if (event === "SIGNED_IN") kickedRef.current = false;
    });

    // Server-side session validation. Runs:
    //   (a) immediately if a user is signed in,
    //   (b) every 60 s while the tab is visible,
    //   (c) every time the tab regains focus from background.
    // Calls supabase.auth.getUser() which validates the JWT against
    // GoTrue — if the user was admin-deleted or banned, the call
    // returns an error. We then force a sign-out + toast.
    async function validate() {
      if (kickedRef.current) return;
      if (!userIdRef.current) return; // anonymous, nothing to validate
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        // Pick the right toast based on what GoTrue said.
        const key = reasonToTranslationKey(error?.message);
        kickedRef.current = true;
        toast.error(t(key), { duration: 8000 });
        await supabase.auth.signOut();
        if (typeof window !== "undefined") window.location.assign("/");
      }
    }

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible")
        return;
      void validate();
    }, 60_000);
    function onVisible() {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      )
        void validate();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    // Kick off one validation right after mount so an already-deleted
    // user gets kicked on first paint instead of waiting 60 s.
    setTimeout(validate, 1_000);

    return () => {
      sub.subscription.unsubscribe();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [t]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Hard navigation home so any cached page state is dropped — simpler
    // than chasing every component to re-render after sign-out.
    if (typeof window !== "undefined") window.location.assign("/");
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
