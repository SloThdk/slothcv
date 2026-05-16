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

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { createClient } from "./supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getMyProfile, type Profile } from "@/lib/profile";
import { formatBanUntilExact } from "@/lib/ban-format";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /**
   * Latest profile row for the current user. `null` when anonymous or
   * before the first hydration completes. Mutated server-side via
   * `/lib/profile` helpers; consumers should call `refreshProfile()`
   * after any of those mutations so the new state propagates to every
   * subscriber (SiteHeader avatar, /account form, etc.) instead of
   * each subscriber polling on its own.
   */
  profile: Profile | null;
  /** Re-fetch the profile and update the context. Resolves after the
   *  state has been pushed to subscribers. Safe no-op when anonymous. */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  profile: null,
  refreshProfile: async () => {},
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

// formatBanDuration moved to lib/ban-format.ts so LoginForm + SignupForm
// can share it. The kick toast + pre-send toast now use identical phrasing.

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
  // Canonical profile state. Lifted out of SiteHeader + /account so
  // both subscribe to the same value — earlier each component owned
  // its own copy and mutating one didn't tell the other, which left
  // the header showing a stale avatar after "remove photo" on /account
  // until the next focus event refetched independently.
  const [profile, setProfile] = useState<Profile | null>(null);
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
        const until = formatBanUntilExact(extra.bannedUntil, langRef.current);
        if (until) {
          copy =
            langRef.current === "da"
              ? `Din konto er suspenderet indtil ${until}.`
              : `Your account has been suspended until ${until}.`;
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

      // Path 1: Supabase already rejected the JWT — user deleted, JWT
      // tampered, token expired without refresh, etc. These return
      // error / no user from /auth/v1/user.
      if (error || !data.user) {
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
        return;
      }

      // Path 2: Supabase returned 200 but the user is BANNED. This is
      // the silent-ban gotcha — /auth/v1/user does NOT enforce
      // banned_until against an existing valid JWT (the access token
      // continues to validate until it expires naturally, ~1h default).
      // The ban only blocks new sign-ins via /token. So we have to
      // inspect data.user.banned_until ourselves and force-kick when
      // it's a future timestamp. Without this, an admin pressing "Ban"
      // in Supabase Studio leaves the user fully operational on every
      // open tab until their token happens to refresh.
      //
      // The field is sometimes typed as missing on @supabase/supabase-js
      // User but is present on the wire response. Cast to read it.
      const bannedRaw = (data.user as { banned_until?: string | null }).banned_until;
      if (bannedRaw) {
        const banDate = new Date(bannedRaw);
        if (!Number.isNaN(banDate.getTime()) && banDate.getTime() > Date.now()) {
          void kick("user_banned", { bannedUntil: bannedRaw });
          return;
        }
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

  // Profile hydration + refresh. `refreshProfile` is stable across renders
  // so consumers can put it in effect deps without re-firing every tick.
  const refreshProfile = useCallback(async () => {
    if (!userIdRef.current) {
      setProfile(null);
      return;
    }
    try {
      const p = await getMyProfile();
      setProfile(p);
    } catch {
      // Profile is non-critical chrome (avatar / display name); silently
      // leave the previous value so we don't blank the header on a flaky
      // network. The next refresh will recover.
    }
  }, []);

  // Auto-hydrate when user identity changes. Drops profile on sign-out.
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    void refreshProfile();
    // Re-fetch on focus too — covers cross-tab updates (avatar uploaded
    // on /account in tab A should appear in tab B's header on focus).
    function onFocus() {
      void refreshProfile();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user?.id, refreshProfile]);

  return (
    <AuthContext.Provider
      value={{ user, loading, profile, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
