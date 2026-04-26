/**
 * Theme context — light / dark / system mode for the slothcv chrome.
 *
 *   - State is persisted to localStorage under `slothcv.theme`.
 *   - On first load we fall back to `prefers-color-scheme` so dark-system
 *     users get dark by default.
 *   - The active mode is reflected via `data-theme="dark|light"` on
 *     `<html>` so the CSS variables in globals.css resolve correctly,
 *     plus the standard `class="dark"` for any Tailwind v4 dark: utility
 *     we (or shadcn) might want later.
 *
 * IMPORTANT: this controls the *site chrome only* — header, dashboard,
 * editor controls, account page. The CV preview / template colors are
 * always driven by the resume's own design tokens (light backgrounds for
 * most templates, dark for Aurora). We don't want a user's CV to look
 * different in the editor than it will in the exported PDF.
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  /** What the user picked: "light", "dark", or "system" (= follow OS). */
  theme: Theme;
  /** What's actually rendered after resolving "system" to a real choice. */
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "slothcv.theme";

function detectInitial(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system")
      return stored;
  } catch {
    // localStorage may be unavailable; fall through.
  }
  return "system";
}

function resolveTheme(t: Theme): "light" | "dark" {
  if (t !== "system") return t;
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate stored preference + initial resolved state on the client.
  useEffect(() => {
    const initial = detectInitial();
    setThemeState(initial);
    setResolved(resolveTheme(initial));
    setHydrated(true);
  }, []);

  // Apply data-theme + class on <html>. Persist preference. Watch the
  // OS-level preference if the user picked "system".
  useEffect(() => {
    if (!hydrated) return;
    const next = resolveTheme(theme);
    setResolved(next);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures.
    }

    // If user picked "system", also live-update when the OS preference
    // flips (e.g. macOS auto-dark at sundown).
    if (theme !== "system") return;
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    function onChange() {
      const r = resolveTheme("system");
      setResolved(r);
      document.documentElement.setAttribute("data-theme", r);
      document.documentElement.classList.toggle("dark", r === "dark");
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, hydrated]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(
    () =>
      setThemeState((current) => {
        // 2-way toggle: collapse "system" into the inverse of resolved so
        // the switch always feels deterministic.
        const r = resolveTheme(current);
        return r === "dark" ? "light" : "dark";
      }),
    [],
  );

  const value = useMemo(
    () => ({ theme, resolved, setTheme, toggle }),
    [theme, resolved, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe defaults outside the provider (SSR pre-render).
    return {
      theme: "system",
      resolved: "light",
      setTheme: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}
