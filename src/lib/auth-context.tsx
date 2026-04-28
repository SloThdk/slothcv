/**
 * AuthProvider — single source of truth for the signed-in user.
 *
 * Wraps the entire app in `layout.tsx`. Subscribes once to Supabase's auth
 * state changes and pushes the current user / loading flag down through
 * context. Consumers grab it via `useAuth()`.
 *
 * We expose `loading` so consumers can render a skeleton instead of bouncing
 * a logged-in user to /login on first paint (which would happen if we treated
 * `user === null` and "auth not yet resolved" as the same state).
 *
 * # Real-time session revocation
 *
 * In addition to local auth-state events, this provider opens a Supabase
 * Realtime subscription on `public.session_revocations` filtered by the
 * signed-in user's own UUID. A Postgres trigger on `auth.users` BEFORE
 * DELETE inserts a row into that table — so when an admin deletes a user
 * (via Supabase Dashboard, Admin API, or SQL) the still-active browser
 * session receives the INSERT event within ~500 ms, signs out cleanly,
 * and bounces to /login with an `account_deleted` toast.
 *
 * Without this, a deleted user's UI keeps showing them as signed in until
 * their access token expires (up to 1 h default), even though every RLS
 * call would 401. The realtime kick-out removes that window entirely.
 */

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // Realtime session-revocation listener. Opens / tears down whenever the
  // signed-in user changes. We bind the channel name to the user id so
  // sign-out → sign-in (or user A → user B mid-tab) cleanly resubscribes
  // on the new identity. Filter is server-side (`user_id=eq.<uid>`) so
  // even if RLS were misconfigured the channel only delivers our own
  // events.
  //
  // On INSERT we hard-redirect to /login with `error=account_deleted`,
  // which the login page renders as a friendly "your account was
  // deleted" banner. The signOut() call before the redirect clears the
  // local session + cookies so the bounce target doesn't see a stale
  // user and re-enter the gated app.
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`session-revocations-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_revocations",
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          // Be defensive: if the trigger fires twice (it shouldn't, but
          // a manual INSERT for testing could) we don't want to race
          // multiple signOut calls. The first one wins; subsequent ones
          // are cheap no-ops because the session is already gone.
          try {
            await supabase.auth.signOut();
          } catch {
            // Network failure is acceptable — the redirect still
            // takes the user to a logged-out screen.
          }
          if (typeof window !== "undefined") {
            window.location.assign("/login/?error=account_deleted");
          }
        },
      )
      .subscribe();
    return () => {
      // removeChannel is idempotent — safe even if the subscribe
      // never fully completed (e.g. token refresh in flight).
      supabase.removeChannel(channel);
    };
  }, [user]);

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
