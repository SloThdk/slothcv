/**
 * PersonalForm — edit the always-on Personal Info block.
 *
 * Photo: file upload to Supabase Storage only (`avatars/<uid>/cv-<ts>.<ext>`).
 * The "paste URL" power-user fallback was removed — exposing two paths
 * (file picker + URL) split user attention and led to remote URLs that
 * could break offline / lose CORS / 404 over time. The Upload button
 * is the single canonical path; for the rare hosted-image case the
 * user can paste-into-Files in their OS file picker.
 */

"use client";

import { useRef, useState } from "react";
import { ImageOff, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useEditorStore } from "@/lib/store/editor";
import { defaultPersonalLink, newId } from "@/lib/resume-defaults";
import { uploadResumePhoto } from "@/lib/profile";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UrlInput } from "@/components/ui/url-input";
import { NO_PHOTO_TEMPLATES } from "@/lib/design-labels";

export function PersonalForm() {
  const personal = useEditorStore((s) => s.data.personal);
  const setPersonal = useEditorStore((s) => s.setPersonal);
  // Pull the active template too — text-only templates skip rendering
  // the uploaded photo, so we surface a hint when the user is on one.
  // Without this, uploading a photo on Helsinki / Cambridge / etc. just
  // silently does nothing in the preview.
  const activeTemplate = useEditorStore((s) => s.data.meta.template);
  const photoEnabled = useEditorStore((s) => s.data.design.photo.enabled);
  const setDesign = useEditorStore((s) => s.setDesign);
  const templateSkipsPhoto = NO_PHOTO_TEMPLATES.has(activeTemplate);

  /** Auto-enable photo on a photo-capable template when the user supplies
   *  one. The factory defaults turn `photo.enabled` off on most templates;
   *  uploading a photo while disabled silently does nothing in the
   *  preview. Treat the upload as the user's intent — flip enabled on if
   *  the template can actually render it. NO_PHOTO_TEMPLATES is left
   *  alone (the warning UI below covers that case). */
  function maybeAutoEnablePhoto() {
    if (!templateSkipsPhoto && !photoEnabled) {
      const current = useEditorStore.getState().data.design.photo;
      setDesign({ photo: { ...current, enabled: true } });
    }
  }
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onPickFile(file: File) {
    // Instant preview: create a local object URL so the photo appears
    // immediately in every preview surface while the upload to Supabase
    // is still in flight. The two-write pattern (local URL → Supabase URL)
    // avoids the awkward 1–2s gap where the user sees nothing change.
    //
    // Important: we MUST revoke the blob URL after we replace it (or on
    // error) so the browser can free the memory holding the file bytes.
    const localUrl = URL.createObjectURL(file);
    setPersonal({ photoUrl: localUrl });
    maybeAutoEnablePhoto();
    setUploading(true);
    try {
      const url = await uploadResumePhoto(file);
      // Swap to the persistent URL. React diffs the <img src> attribute
      // and the browser only refetches if it differs, so the visual swap
      // from local-blob → uploaded URL is seamless.
      setPersonal({ photoUrl: url });
      URL.revokeObjectURL(localUrl);
      toast.success(t("personal.toastUploaded"));
    } catch (e) {
      // Roll back to whatever the photo was before the picker fired.
      // We don't restore previous URL because we already overwrote it —
      // simplest is to clear and let the user re-upload. Covers the
      // 99% case (normal upload flow); a "preserve previous" path would
      // need an extra ref to remember the prior URL.
      URL.revokeObjectURL(localUrl);
      setPersonal({ photoUrl: undefined });
      toast.error(e instanceof Error ? e.message : t("personal.toastUploadFailed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onClearPhoto() {
    setPersonal({ photoUrl: undefined });
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="p-name">{t("personal.fullName")}</Label>
        <Input
          id="p-name"
          value={personal.fullName}
          onChange={(e) => setPersonal({ fullName: e.target.value })}
          placeholder={t("personal.fullNamePlaceholder")}
        />
      </div>
      <div>
        <Label htmlFor="p-headline">{t("personal.headline")}</Label>
        <Input
          id="p-headline"
          value={personal.headline}
          onChange={(e) => setPersonal({ headline: e.target.value })}
          placeholder={t("personal.headlinePlaceholder")}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="p-email">{t("personal.email")}</Label>
          <Input
            id="p-email"
            type="email"
            value={personal.email}
            onChange={(e) => setPersonal({ email: e.target.value })}
            placeholder={t("personal.emailPlaceholder")}
          />
        </div>
        <div>
          <Label htmlFor="p-phone">{t("personal.phone")}</Label>
          <Input
            id="p-phone"
            value={personal.phone}
            onChange={(e) => setPersonal({ phone: e.target.value })}
            placeholder={t("personal.phonePlaceholder")}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="p-loc">{t("personal.location")}</Label>
        <Input
          id="p-loc"
          value={personal.location}
          onChange={(e) => setPersonal({ location: e.target.value })}
          placeholder={t("personal.locationPlaceholder")}
        />
      </div>
      <div>
        <Label>{t("personal.photo")}</Label>
        <div className="flex items-center gap-3">
          {personal.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={personal.photoUrl}
              alt={t("personal.photo")}
              className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-border"
              referrerPolicy="no-referrer"
            />
          ) : (
            // Empty-state avatar — icon ONLY (no text). Earlier versions had
            // a translated text label that would overflow the 56px circle
            // at long locales (Danish "Intet foto"). Now: pure icon, with
            // title + aria-label carrying the description for tooltips and
            // screen readers respectively. inline-flex with grid centering
            // guarantees the icon stays in the geometric center regardless
            // of any inherited line-height oddities.
            <div
              role="img"
              title={t("personal.noPhoto")}
              aria-label={t("personal.noPhoto")}
              className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-hover text-subtle ring-1 ring-border"
            >
              <ImageOff className="h-5 w-5" aria-hidden="true" />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4" />
              {uploading
                ? t("personal.uploading")
                : personal.photoUrl
                  ? t("personal.replacePhoto")
                  : t("personal.uploadPhoto")}
            </Button>
            {personal.photoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClearPhoto}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
                {t("personal.removePhoto")}
              </Button>
            )}
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-subtle">{t("personal.photoHint")}</p>
        {/* Capability warning — the active template won't render the
            photo. Show only when the template is in the no-photo set
            (intentionally text-only / classical layouts). The user can
            still upload — the photo persists for when they swap to a
            template that does render it — but they should know it
            won't appear right now. */}
        {(templateSkipsPhoto || !photoEnabled) && personal.photoUrl && (
          <div className="mt-2 rounded-md border border-amber-300/60 bg-amber-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            {templateSkipsPhoto
              ? "Heads up: this template doesn't display photos. Switch to a template with a photo slot (Berlin, Aurora, Capitol, Marina, …) to see your image."
              : "Photo is currently turned OFF in Design → Personal. Toggle it back on to show your image."}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onPickFile(f);
          }}
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label className="!mb-0">{t("personal.links")}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setPersonal({
                links: [...personal.links, { ...defaultPersonalLink(), id: newId() }],
              })
            }
          >
            <Plus className="h-3.5 w-3.5" />
            {t("personal.add")}
          </Button>
        </div>
        <div className="space-y-2">
          {personal.links.map((link, idx) => (
            // Each link row stacks vertically on small screens and rows on
            // wider ones, so a long pasted URL doesn't push the trash icon
            // off-screen. The URL field is a UrlInput (auto-growing,
            // validating textarea) so multi-line URLs stay fully visible.
            <div
              key={link.id}
              className="flex flex-wrap items-start gap-1.5 sm:flex-nowrap"
            >
              <Input
                value={link.label}
                onChange={(e) => {
                  const links = [...personal.links];
                  links[idx] = { ...link, label: e.target.value };
                  setPersonal({ links });
                }}
                placeholder="LinkedIn"
                className="w-full max-w-[120px] shrink-0"
              />
              <UrlInput
                value={link.url}
                onChange={(e) => {
                  const links = [...personal.links];
                  links[idx] = { ...link, url: e.target.value };
                  setPersonal({ links });
                }}
                placeholder="https://linkedin.com/in/…"
                className="flex-1 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("personal.removeLink")}
                onClick={() => {
                  setPersonal({
                    links: personal.links.filter((_, i) => i !== idx),
                  });
                }}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 text-subtle" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
