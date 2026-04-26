/**
 * Language context — same shape as the philipsloth-portfolio LanguageContext
 * so the patterns transfer 1:1. Defaults to English; auto-detects Danish
 * from `navigator.language` on first load if the user hasn't picked one.
 *
 * Usage:
 *   const { lang, setLang, toggle, t } = useLanguage();
 *   <p>{t("hero.body")}</p>
 *
 * Storage key is namespaced (`slothcv.lang`) so it doesn't collide with the
 * portfolio's preference if both run on the same domain in the future.
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
import { TRANSLATIONS, type Lang, type TranslationKey } from "./translations";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  /** Get the translation for a key. Falls back to English then to the key
   *  itself so a missing entry never renders blank. Supports `{name}` style
   *  interpolation when an `args` object is passed. */
  t: (key: TranslationKey, args?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "slothcv.lang";

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "da") return stored;
  } catch {
    // localStorage may be unavailable (private mode, sandboxed iframe).
  }
  if (typeof navigator !== "undefined") {
    const nav = navigator.language?.toLowerCase() ?? "";
    if (nav.startsWith("da")) return "da";
  }
  return "en";
}

function interpolate(
  template: string,
  args: Record<string, string | number> | undefined,
): string {
  if (!args) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    name in args ? String(args[name]) : `{${name}}`,
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from storage / navigator on first client render. Doing this in
  // an effect (rather than the initial useState) keeps SSR rendering stable
  // — server always emits English and the client swaps after hydration.
  useEffect(() => {
    setLangState(detectInitialLang());
    setHydrated(true);
  }, []);

  // Persist to localStorage + reflect on <html lang="…">.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage failures.
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang, hydrated]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const toggle = useCallback(
    () => setLangState((l) => (l === "en" ? "da" : "en")),
    [],
  );

  const t = useCallback(
    (key: TranslationKey, args?: Record<string, string | number>) => {
      const entry = TRANSLATIONS[key];
      if (!entry) return String(key);
      const raw = entry[lang] ?? entry.en ?? String(key);
      return interpolate(raw, args);
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLang, toggle, t }),
    [lang, setLang, toggle, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Allow use outside the provider (e.g. SSR prebuild) — return EN
    // defaults so nothing crashes.
    return {
      lang: "en",
      setLang: () => {},
      toggle: () => {},
      t: (key, args) =>
        interpolate(
          TRANSLATIONS[key]?.en ?? String(key),
          args,
        ),
    };
  }
  return ctx;
}
