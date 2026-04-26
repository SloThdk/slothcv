/**
 * Site header — wordmark left, language + theme toggles + auth controls right.
 *
 * Reads everything user-facing through `useLanguage().t(...)` so the i18n
 * toggle in the same row swaps the entire chrome at once. Theme tokens
 * come from CSS variables (defined in globals.css) so dark mode flips with
 * zero-flash via `data-theme="dark"` on `<html>`.
 *
 * Auth state branches:
 *   - loading      → reserve the slot to prevent layout shift
 *   - signed in    → avatar dropdown (Dashboard / Account / Sign out)
 *   - signed out   → "Sign in" button
 */

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/avatar";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { getMyProfile, type Profile } from "@/lib/profile";

export function SiteHeader() {
  const { user, loading, signOut } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hydrate the profile when the user changes (sign-in / sign-out).
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    getMyProfile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        // Header is non-critical — silently fall back to initials.
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Re-fetch when the page regains focus (covers the case where avatar was
  // updated on /account in another tab).
  useEffect(() => {
    function refetch() {
      if (!user) return;
      getMyProfile()
        .then((p) => setProfile(p))
        .catch(() => undefined);
    }
    window.addEventListener("focus", refetch);
    return () => window.removeEventListener("focus", refetch);
  }, [user?.id]);

  // Close the user menu on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <header className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] transition-colors">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-[color:var(--color-text)] transition-colors hover:text-[color:var(--color-accent)]"
        >
          {t("header.brand")}
        </Link>
        <nav className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          {loading ? (
            // Reserve the auth-control slot so the layout doesn't shift.
            <div className="h-9 w-20" aria-hidden />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] py-1 pr-3 pl-1 text-sm font-medium text-[color:var(--color-text)] transition-all duration-150 hover:-translate-y-px hover:bg-[color:var(--color-surface-hover)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2"
              >
                <Avatar
                  src={profile?.avatar_url}
                  name={profile?.display_name ?? user.email}
                  size={28}
                />
                <span className="hidden max-w-[160px] truncate sm:inline">
                  {profile?.display_name?.trim() ||
                    user.email?.split("@")[0] ||
                    t("header.account")}
                </span>
              </button>
              {open && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-lg"
                >
                  <div className="border-b border-[color:var(--color-border)] p-3 text-xs text-[color:var(--color-text-muted)]">
                    {t("header.signedInAs")}
                    <div className="mt-0.5 truncate text-sm font-medium text-[color:var(--color-text)]">
                      {user.email}
                    </div>
                  </div>
                  <MenuItem
                    icon={LayoutDashboard}
                    onClick={() => {
                      setOpen(false);
                      router.push("/dashboard");
                    }}
                  >
                    {t("header.dashboard")}
                  </MenuItem>
                  <MenuItem
                    icon={User}
                    onClick={() => {
                      setOpen(false);
                      router.push("/account");
                    }}
                  >
                    {t("header.account")}
                  </MenuItem>
                  <div className="border-t border-[color:var(--color-border)]" />
                  <MenuItem
                    icon={LogOut}
                    tone="danger"
                    onClick={() => {
                      setOpen(false);
                      void signOut();
                    }}
                  >
                    {t("header.signOut")}
                  </MenuItem>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login">
              <Button size="sm">{t("header.signIn")}</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function MenuItem({
  icon: Icon,
  onClick,
  children,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-100 ${
        tone === "danger"
          ? "text-red-600 hover:bg-red-500/10"
          : "text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-hover)]"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
