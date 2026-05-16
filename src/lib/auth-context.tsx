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

/** Format a banned-until ISO timestamp into a human phrase (EN/DA-bilingual).
 *  Picks the largest meaningful unit so the toast reads cleanly:
 *    < 1 h  → "for the next N minutes" / "i de næste N minutter"
 *    < 24 h → "for the next N hours" / "i de næste N timer"
 *    < 30 d → "for the next N days" / "i de næste N dage"
 *    >= 30 d → "until <localised date>" / "indtil <dato>"
 *  Returns empty string if the timestamp is invalid or already in the past. */
function formatBanDuration(
  iso: string,
  lang: "en" | "da",
): string {
  const until = new Date(iso);
  if (Number.isNaN(until.getTime())) return "";
  const ms = until.getTime() - Date.now();
  if (ms <= 0) return "";
  const minutes = Math.round(ms / 60_000);
  const hours = Math.round(ms / 3_600_000);
  const days = Math.round(ms / 86_400_000);
  if (minutes < 60) {
    return lang === "da"
      ? `i de næste ${minutes} minutter`
      : `for the next ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  if (hours < 24) {
    return lang === "da"
      ? `i de næste ${hours} timer`
      : `for the next ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  if (days < 30) {
    return lang === "da"
      ? `i de næste ${days} dage`
      : `for the next ${days} day${days === 1 ? "" : "s"}`;
  }
  const dateStr = until.toLocaleDateString(lang === "da" ? "da-DK" : undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return lang === "da" ? `indtil ${dateStr}` : `until ${dateStr}`;
}

/** How long the toast stays visible AND how long we wait before
 *  hard-navigating. Earlier "redirect immediately after toast" path
 *  unmounted the toast before it could render — the user saw a flash
 *  and got bounced with no idea what happened. 6 s readable, 4 s
 *  navigation delay gives the toast time to settle on the new page. */
const TOAST_DURATION_MS = 6_000;
const REDIRECT_DELAY_MS = 4_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useLanguage();
  // Mirror the current user id into a ref so the validation loop can
  // read the latest value without re-creating its interval on every
  // user change. Without this, the polling interval would tear down +
  // re-create on every onAuthStateChange tick.
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;
  // Mirror the current language too — the kick toast needs the live
  // value so a language switch mid-session affects the ban-duration
  // formatting.
  const langRef = useRef<"en" | "da">(lang);
  langRef.current = lang;
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

    /** Hard-kick. Shows the toast at full duration, signs out, then
     *  hard-navs after REDIRECT_DELAY_MS so the toast has time to be
     *  read before the page unmounts. The earlier "redirect immediately
     *  after toast" path made the toast vanish before the user could
     *  read why they got bounced — Philip's bug report 2026-05-16. */
    async function kick(
      reason: string | undefined,
      extra?: { bannedUntil?: string | null },
    ) {
      if (kickedRef.current) return;
      kickedRef.current = true;
      const key = reasonToTranslationKey(reason);
      let copy = t(key);
      // Append the ban duration when known. Reads the live language ref
      // so a mid-session lang switch picks the right format.
      if (key === "auth.accountSuspended" && extra?.bannedUntil) {
        const dur = formatBanDuration(extra.bannedUntil, langRef.current);
        if (dur) {
          copy =
            langRef.current === "da"
              ? `Din konto er suspenderet ${dur}.`
              : `Your account has been suspended ${dur}.`;
        }
      }
      toast.error(copy, { duration: TOAST_DURATION_MS });
      await supabase.auth.signOut();
      setTimeout(() => {
        if (typeof window !== "undefined") window.location.assign("/");
      }, REDIRECT_DELAY_MS);
    }

    // Server-side session validation. Runs:
    //   (a) immediately if a user is signed in,
    //   (b) every 30 s while the tab is visible,
    //   (c) every time the tab regains focus from background,
    //   (d) on any click / keystroke (throttled to 10 s).
    // (d) is the catch-net for split-screen / side-by-side workflows
    // where the tab is always visible (so visibilitychange never fires)
    // but the user is actively interacting — without it, the only kick
    // path is the 30 s interval and the user has to wait or click
    // randomly until they happen to trigger something.
    async function validate() {
      if (kickedRef.current) return;
      if (!userIdRef.current) return; // anonymous, nothing to validate
      const { data, error } = await supabase.auth.getUser();
      if (kickedRef.current) return;
      if (error || !data.user) {
        // For ban responses, try to fetch the actual until-timestamp via
        // a SECURITY DEFINER RPC so the toast can show "for the next N
        // days" instead of just "suspended". Falls back silently when
        // the RPC isn't installed on the project.
        let bannedUntil: string | null = null;
        const errText = (error?.message ?? "").toLowerCase();
        if (
          errText.includes("banned") ||
          errText.includes("user_banned") ||
          errText.includes("suspend")
        ) {
          try {
            const { data: rpcData } = await supabase.rpc("get_my_ban_until");
            if (typeof rpcData === "string") bannedUntil = rpcData;
          } catch {
            // RPC may not exist on every project; fall back to generic copy.
          }
        }
        void kick(error?.message, { bannedUntil });
      }
    }

    let lastCheckAt = 0;
    function throttledCheck() {
      const now = Date.now();
      if (now - lastCheckAt < 10_000) return;
      lastCheckAt = now;
      void validate();
    }

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible")
        return;
      void validate();
    }, 30_000);
    function onVisible() {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      )
        void validate();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    document.addEventListener("click", throttledCheck);
    document.addEventListener("keydown", throttledCheck);
    // Kick off one validation right after mount so an already-deleted
    // user gets kicked on first paint instead of waiting 30 s.
    const firstCheck = setTimeout(validate, 1_000);

    return () => {
      sub.subscription.unsubscribe();
      clearInterval(interval);
      clearTimeout(firstCheck);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("click", throttledCheck);
      document.removeEventListener("keydown", throttledCheck);
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
