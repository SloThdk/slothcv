/**
 * Profile + avatar helpers — thin wrappers over Supabase tables and Storage.
 *
 * The `profiles` table is auto-populated by an `on auth.users` trigger
 * (see migration 0003), so reads should always find a row for an
 * authenticated user. Reads / updates are RLS-scoped to `auth.uid() = id`.
 *
 * Avatars live in the public `avatars` bucket under `<user_id>/<random>.<ext>`.
 * Storage RLS scopes write/delete to the user_id-prefixed folder.
 */

import { createClient } from "./supabase/client";
import type { TranslationKey } from "./i18n/translations";
import { TranslatableError } from "./translatable-error";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  updated_at: string;
}

// ─── Upload validation ─────────────────────────────────────────────
//
// Hard MIME allowlist. Earlier code used `file.type.startsWith("image/")`
// which accepts ANY image MIME including `image/svg+xml`. SVG is XML
// and can carry inline `<script>` / `<foreignObject>` / event handlers —
// any viewer of a shared CV link who opens the photo URL on
// `*.supabase.co` runs the script in supabase.co's origin. Real
// stored-XSS surface against shared-CV viewers; closed by the
// 2026-05-08 abuse-hardening pass.
//
// Allowlist matches `mimeToExt` below. Anything else — including SVG,
// HEIC, BMP, TIFF, ICO — is rejected at the boundary regardless of
// what the browser File.type claims.
const ALLOWED_IMAGE_MIMES = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
]);

/**
 * Magic-byte signature check. Browsers set `File.type` from the file
 * extension, so a renamed `evil.exe -> cv.png` walks past the MIME
 * allowlist unchallenged. This sniff verifies the file's actual first
 * bytes match its declared MIME — the format itself, not the filename.
 *
 * Signature reference (offsets are bytes from start unless noted):
 *   PNG     89 50 4E 47 0D 0A 1A 0A             (8 bytes)
 *   JPEG    FF D8 FF                            (3 bytes; any 4th)
 *   GIF     GIF87a / GIF89a                     (6 bytes)
 *   WebP    RIFF + WEBP at offset 8             (12 bytes)
 *   AVIF    ftyp box at offset 4 + AVIF/AVIS/   (12+ bytes)
 *           MIF1/MIAF/MSF1 brand at offset 8
 *
 * Returns true if the bytes look consistent with the declared MIME,
 * false otherwise (caller surfaces a TranslatableError).
 */
function sniffImageMagicBytes(bytes: Uint8Array, mime: string): boolean {
  // Tiny files can't carry a meaningful image signature. The smallest
  // legitimate header we check is 8 bytes (PNG); reject anything below
  // 12 bytes outright since it can't be any of the formats below.
  if (bytes.length < 12) return false;

  const startsWith = (sig: number[]): boolean =>
    sig.every((v, i) => bytes[i] === v);

  switch (mime) {
    case "image/png":
      return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    case "image/jpeg":
      return startsWith([0xff, 0xd8, 0xff]);

    case "image/gif":
      // GIF87a or GIF89a — bytes 0..3 = "GIF8", byte 4 = '7' or '9',
      // byte 5 = 'a'.
      return (
        startsWith([0x47, 0x49, 0x46, 0x38]) &&
        (bytes[4] === 0x37 || bytes[4] === 0x39) &&
        bytes[5] === 0x61
      );

    case "image/webp":
      // RIFF....WEBP — signature split across offsets 0..3 and 8..11.
      return (
        startsWith([0x52, 0x49, 0x46, 0x46]) &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      );

    case "image/avif": {
      // ISO BMFF: bytes 0..3 = box size (big-endian), bytes 4..7 =
      // 'ftyp', bytes 8..11 = major brand. AVIF can use any of these
      // brands per the AV1 Image File Format spec — accept all of them
      // because some encoders default to 'mif1' or 'miaf' even for
      // single-image AVIFs.
      const isFtyp =
        bytes[4] === 0x66 && // 'f'
        bytes[5] === 0x74 && // 't'
        bytes[6] === 0x79 && // 'y'
        bytes[7] === 0x70; //   'p'
      if (!isFtyp) return false;
      const brand = String.fromCharCode(
        bytes[8] ?? 0,
        bytes[9] ?? 0,
        bytes[10] ?? 0,
        bytes[11] ?? 0,
      );
      return (
        brand === "avif" ||
        brand === "avis" ||
        brand === "mif1" ||
        brand === "miaf" ||
        brand === "msf1"
      );
    }

    default:
      // Unknown MIME — fail closed. This branch is unreachable while
      // the caller filters against ALLOWED_IMAGE_MIMES first; defence
      // in depth in case the function is ever called from elsewhere.
      return false;
  }
}

/**
 * Validate that `file` is one of our allowed image types AND that its
 * actual bytes match the claimed MIME. Throws a TranslatableError on
 * any failure so the caller can surface a localised message.
 *
 * Sliced to the first 64 bytes for the sniff — every signature we
 * check fits in 12 bytes; reading more is wasted work on a 5 MB image.
 */
async function validateImageUpload(
  file: File,
  notImageError: TranslationKey,
  signatureMismatchError: TranslationKey = "errors.imageSignatureMismatch",
): Promise<void> {
  if (!ALLOWED_IMAGE_MIMES.has(file.type)) {
    throw new TranslatableError(notImageError);
  }
  // Read the first 64 bytes only — every magic-byte signature we
  // check fits in 12 bytes. Reading the whole 5 MB image just to look
  // at the first 12 bytes wastes bandwidth on slow connections.
  const headBuf = await file.slice(0, 64).arrayBuffer();
  const head = new Uint8Array(headBuf);
  if (!sniffImageMagicBytes(head, file.type)) {
    throw new TranslatableError(signatureMismatchError);
  }
}

/** Fetch the current user's profile row. Returns null if not signed in. */
export async function getMyProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, updated_at")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as Profile | null;
}

/** Update display_name and/or avatar_url on the caller's profile row. */
export async function updateMyProfile(
  patch: Partial<Pick<Profile, "display_name" | "avatar_url">>,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new TranslatableError("errors.notSignedIn");
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);
  if (error) throw new Error(error.message);
}

/**
 * Upload a photo to be embedded inside a CV (NOT the user's profile avatar).
 *
 * Goes into the same `avatars/<user_id>/` folder so RLS policies still apply,
 * but the filename is `cv-<timestamp>.<ext>` and we DO NOT update the
 * profiles table — the URL is meant to be written into a single CV's
 * `personal.photoUrl` field via the editor store.
 *
 * Returns the public URL.
 */
export async function uploadResumePhoto(file: File): Promise<string> {
  // Hard MIME allowlist + magic-byte sniff. SVG (XML/JS-capable) is
  // explicitly excluded. See validateImageUpload for the full
  // rationale.
  await validateImageUpload(file, "errors.photoMustBeImage");
  const MAX_BYTES = 2 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    throw new TranslatableError("errors.photoTooLarge");
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new TranslatableError("errors.notSignedIn");

  const ext = mimeToExt(file.type);
  const path = `${user.id}/cv-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: true,
      contentType: file.type,
    });
  if (upErr) throw new Error(upErr.message);

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  return pub.publicUrl;
}

/**
 * Upload an avatar image and update the profile row to point at it.
 *
 * Path layout: `<user_id>/avatar-<timestamp>.<ext>`. The timestamp prefix
 * cache-busts the public CDN — uploading a new avatar invalidates the old
 * URL automatically without us having to send a `Cache-Control` header.
 *
 * Validation:
 *   - File must be an image (we filter <input> with `accept="image/*"`,
 *     but re-check the MIME type here as defense in depth).
 *   - Size capped at 2 MB — avatars don't need more than that and a cap
 *     keeps a malicious user from blowing up the Storage quota.
 */
export async function uploadAvatar(file: File): Promise<string> {
  // Hard MIME allowlist + magic-byte sniff. SVG (XML/JS-capable) is
  // explicitly excluded.
  await validateImageUpload(file, "errors.avatarMustBeImage");
  const MAX_BYTES = 2 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    throw new TranslatableError("errors.avatarTooLarge");
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new TranslatableError("errors.notSignedIn");

  // Sniff the extension from the MIME type — never trust the original
  // filename which could carry .php / .html etc.
  const ext = mimeToExt(file.type);
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: true,
      contentType: file.type,
    });
  if (upErr) throw new Error(upErr.message);

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  await updateMyProfile({ avatar_url: pub.publicUrl });
  return pub.publicUrl;
}

/**
 * Upload a free-form image used as a custom element (toolshelf Image
 * primitive). Goes into the same `avatars/<user_id>/` folder as profile
 * + resume photos so the existing storage RLS policies still apply, but
 * with a different filename prefix so we can distinguish them later.
 *
 * The 5 MB cap is more permissive than the 2 MB avatar cap because users
 * may want to drop in a logo, screenshot, or hero image — bigger by
 * nature. Still bounded so a malicious payload can't blow up the quota.
 *
 * Returns the public URL. The caller writes it into
 * `customElement.url` via `updateCustomElement`.
 */
export async function uploadCustomElementImage(file: File): Promise<string> {
  // Hard MIME allowlist + magic-byte sniff. SVG (XML/JS-capable) is
  // explicitly excluded.
  await validateImageUpload(file, "errors.imageMustBeImage");
  const MAX_BYTES = 5 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    throw new TranslatableError("errors.imageTooLarge");
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new TranslatableError("errors.notSignedIn");

  const ext = mimeToExt(file.type);
  // `el-` prefix so we can tell custom-element images apart from avatar /
  // cv photos in the same folder. Timestamp keeps filenames unique.
  const path = `${user.id}/el-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: true,
      contentType: file.type,
    });
  if (upErr) throw new Error(upErr.message);

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  return pub.publicUrl;
}

/** Map a small allowlist of image MIME types to file extensions. */
function mimeToExt(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/avif":
      return "avif";
    default:
      // Default to jpg — any other image type the browser accepted but we
      // didn't list explicitly is most likely fine to serve.
      return "jpg";
  }
}

/** Remove the user's avatar from Storage and clear the URL on their profile. */
export async function removeAvatar(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new TranslatableError("errors.notSignedIn");
  // List then delete — Storage doesn't have a "delete by prefix" primitive
  // so we enumerate the folder first.
  const { data: files, error: listErr } = await supabase.storage
    .from("avatars")
    .list(user.id);
  if (listErr) throw new Error(listErr.message);
  if (files && files.length > 0) {
    const paths = files.map((f) => `${user.id}/${f.name}`);
    const { error: delErr } = await supabase.storage
      .from("avatars")
      .remove(paths);
    if (delErr) throw new Error(delErr.message);
  }
  await updateMyProfile({ avatar_url: null });
}

/**
 * Update the signed-in user's password. Supabase's `updateUser({ password })`
 * accepts the new password and re-issues the session — no current-password
 * confirmation is required because the user is already holding a valid JWT
 * (their session token IS the proof of identity).
 *
 * If you want to add "enter your current password to confirm", that's a UX
 * choice handled at the form layer, not the API.
 */
export async function changePassword(newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new TranslatableError("errors.passwordTooShort");
  }
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

/**
 * Permanently delete the signed-in user's account. Calls the
 * `delete_account` RPC (SECURITY DEFINER) which:
 *   1. Best-effort removes anything in the avatars/<uid>/ folder.
 *   2. Deletes the row from auth.users — cascades to profiles + resumes.
 *
 * Client-side we ALSO purge the avatar folder before calling — defense in
 * depth, and removes the storage rows even if the RPC fails for any reason.
 */
export async function deleteMyAccount(): Promise<void> {
  const supabase = createClient();
  // Try to clear avatar files first — failure here is non-fatal because
  // the RPC will retry.
  try {
    await removeAvatar();
  } catch {
    // Ignore — the RPC handles this too.
  }
  const { error } = await supabase.rpc("delete_account");
  if (error) throw new Error(error.message);
  // After deletion the JWT is no longer valid; sign out to clear the
  // local session storage so the next page load doesn't see a stale user.
  await supabase.auth.signOut();
}

/**
 * Compute the initials for a display name fallback (e.g. "AL" for
 * "Alex Lindgren", "P" for "philipsloth1"). Used by the avatar fallback
 * when the user hasn't uploaded a photo yet.
 */
export function initialsFor(displayName: string | null | undefined): string {
  const s = (displayName ?? "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}
