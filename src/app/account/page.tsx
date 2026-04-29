/**
 * /account — user account management page.
 *
 * Sections (top to bottom):
 *   1. Profile  — avatar (upload/remove), display name, email (read-only).
 *   2. Sign out — sign out of the current session.
 *   3. Danger zone — permanently delete account (double-confirm, cascades
 *                  to profile + every CV via FK ON DELETE CASCADE; storage
 *                  is purged client-side then again server-side by the RPC).
 *
 * Why no password section: SlothCV enforces strict provider separation
 * (every account has exactly one auth method — magic-link OR Google).
 * Letting magic-link users add a password as a "backup" silently gives
 * the same email two ways in, which violates the rule. If a user loses
 * inbox access we'd rather they recover via support than via a password
 * they didn't really opt into. See LESSONS.md → SUPABASE MAGIC-LINK +
 * OAUTH for the full rationale. The `changePassword` helper in
 * src/lib/profile.ts is left in place (not exported by anything) in
 * case Supabase admin flows ever need it.
 *
 * AuthGate gates the whole page, so anonymous visitors are bounced to /login.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Upload, X } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  deleteMyAccount,
  getMyProfile,
  removeAvatar,
  updateMyProfile,
  uploadAvatar,
  type Profile,
} from "@/lib/profile";

function AccountInner() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state — local copies so we can show "saving…" indicators without
  // round-tripping through the server.
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydrate from profile row.
  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then((p) => {
        if (cancelled) return;
        setLoadError(null);
        setProfile(p);
        setDisplayName(p?.display_name ?? "");
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setLoadError(e instanceof Error ? e.message : "Failed to load profile.");
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function commitDisplayName() {
    if (!profile) return;
    const trimmed = displayName.trim().slice(0, 80);
    if (trimmed === (profile.display_name ?? "")) return;
    setSavingName(true);
    try {
      await updateMyProfile({ display_name: trimmed || null });
      setProfile({ ...profile, display_name: trimmed || null });
      toast.success(t("account.toastNameSaved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("account.toastSaveFailed"));
    } finally {
      setSavingName(false);
    }
  }

  async function onPickAvatar(file: File) {
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file);
      setProfile((p) => (p ? { ...p, avatar_url: url } : p));
      toast.success(t("account.toastAvatarSaved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("account.toastUploadFailed"));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onRemoveAvatar() {
    if (!profile?.avatar_url) return;
    setUploadingAvatar(true);
    try {
      await removeAvatar();
      setProfile((p) => (p ? { ...p, avatar_url: null } : p));
      toast.success(t("account.toastAvatarRemoved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("account.toastRemoveFailed"));
    } finally {
      setUploadingAvatar(false);
    }
  }


  async function onDeleteAccount() {
    if (deleteConfirm !== "DELETE") {
      toast.error(t("account.toastDeleteConfirmRequired"));
      return;
    }
    setDeleting(true);
    try {
      await deleteMyAccount();
      toast.success(t("account.toastAccountDeleted"));
      router.replace("/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("account.toastDeleteFailed"));
      setDeleting(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-red-600">{loadError}</p>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-subtle">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("account.back")}
      </button>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">
        {t("account.title")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t("account.subtitle")}</p>

      {/* ---------- Profile ---------- */}
      <Section title={t("account.section.profile")}>
        <div className="flex items-center gap-4">
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name ?? user?.email}
            size={72}
          />
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                <Upload className="h-4 w-4" />
                {uploadingAvatar
                  ? t("personal.uploading")
                  : t("personal.uploadPhoto")}
              </Button>
              {profile.avatar_url && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onRemoveAvatar}
                  disabled={uploadingAvatar}
                >
                  <X className="h-4 w-4" />
                  {t("personal.removePhoto")}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted">{t("personal.photoHint")}</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPickAvatar(f);
            }}
          />
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="display_name">{t("account.displayName")}</Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={commitDisplayName}
              maxLength={80}
              disabled={savingName}
              placeholder={t("account.displayNamePlaceholder")}
            />
          </div>
          <div>
            <Label htmlFor="email">{t("personal.email")}</Label>
            <Input
              id="email"
              value={user?.email ?? ""}
              disabled
              readOnly
              className="text-muted"
            />
            <p className="mt-1 text-xs text-subtle">
              {t("account.emailReadonly")}
            </p>
          </div>
        </div>
      </Section>

      {/* Password section removed: SlothCV enforces strict provider
          separation. See top-of-file docstring for the rationale. */}

      {/* ---------- Sign out ---------- */}
      <Section title={t("account.section.session")}>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void signOut();
          }}
        >
          {t("account.signOut")}
        </Button>
      </Section>

      {/* ---------- Danger zone ---------- */}
      <Section title={t("account.section.danger")} tone="danger">
        <p className="text-sm text-red-900/90">{t("account.dangerBody")}</p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="confirm">
            {t("account.deleteConfirmLabel")}{" "}
            <span className="font-mono font-semibold">DELETE</span>{" "}
            {t("account.deleteConfirmTo")}
          </Label>
          <Input
            id="confirm"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            autoComplete="off"
            placeholder="DELETE"
          />
          <Button
            type="button"
            variant="destructive"
            onClick={onDeleteAccount}
            disabled={deleting || deleteConfirm !== "DELETE"}
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? t("account.deleting") : t("account.deleteButton")}
          </Button>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <section
      className={`mt-8 rounded-xl border p-5 ${
        tone === "danger"
          ? "border-red-200 bg-red-50"
          : "border-border bg-surface"
      }`}
    >
      <h2
        className={`text-base font-semibold ${
          tone === "danger" ? "text-red-900" : "text-fg"
        }`}
      >
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function AccountPage() {
  return (
    <AuthGate>
      <AccountInner />
    </AuthGate>
  );
}
