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
 * v0.5 plan: real-time admin-revoked-account kick-out via a
 * `public.session_revocations` table + an `auth.users` BEFORE DELETE
 * trigger that inserts into it. The Realtime channel that consumes
 * those events is not in v0.1 — admin-deleted users keep the UI
 * showing them as signed in until their access token next refreshes
 * (RLS still blocks every query, so the worst-case is a stale-looking
 * UI for ≤1 hour, not a data leak).
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
