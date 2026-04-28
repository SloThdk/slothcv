/**
 * Storage-cleanup helpers for resume deletion paths.
 *
 * Why this file exists
 * ====================
 * `resumes` rows hold a JSONB `data` column whose tree may reference
 * uploaded files in Supabase Storage:
 *   - `data.personal.photoUrl` → an `<uid>/cv-<ts>.<ext>` upload from
 *     `uploadResumePhoto()` in `lib/profile.ts`.
 *   - `data.customElements[]` of `kind === "image"` → an
 *     `<uid>/el-<ts>.<ext>` upload from `uploadCustomElementImage()`.
 *
 * Both upload paths land in the `avatars` bucket (single bucket, three
 * filename prefixes: `avatar-` / `cv-` / `el-`). When a `resumes` row is
 * deleted, Postgres throws away the JSONB but Storage has no FK
 * relationship to `resumes`, so the underlying blob lingers as an
 * orphan.
 *
 * The `before delete on auth.users` trigger in migration 0015/0016
 * catches the WHOLE-account scenario (entire `<uid>/` folder is purged
 * when the user is deleted). What it does NOT catch is the much more
 * common per-CV deletion: a user with 10 CVs deletes one of them. That
 * row's photos become orphans.
 *
 * This module computes "which storage paths can I safely delete after
 * this row is gone" and gets called from `deleteResume()` and
 * `deleteAllResumes()` in `lib/resumes.ts`.
 *
 * Cross-reference safety
 * ----------------------
 * `duplicateResume()` clones `data` wholesale, so two CVs can reference
 * the same `photoUrl`. We MUST NOT delete a file that another row still
 * references — the caller does a "still referenced by other rows" pass
 * and intersects against the candidate set before calling
 * `storage.remove()`.
 *
 * Filename-prefix filter
 * ----------------------
 * The `avatars` bucket is shared across CV-photos (`cv-`),
 * custom-element images (`el-`), and the user's account avatar
 * (`avatar-`). Account avatars are owned by `profiles.avatar_url` and
 * are managed by `lib/profile.ts` (`removeAvatar()`), NOT by any
 * `resumes` row. We deliberately filter out `avatar-*` paths so a CV
 * delete never accidentally nukes the user's profile picture.
 */

const PUBLIC_AVATARS_PATH_PREFIX = "/storage/v1/object/public/avatars/";

/**
 * Walk a `ResumeData` blob and return the storage object keys (the
 * portion of the path AFTER `avatars/`) that this resume references.
 *
 * Filters applied, in order:
 *   1. Value must be a string parseable as a URL.
 *   2. URL host + protocol must match `supabaseUrl` exactly. External
 *      URLs (a user pasted from elsewhere into the URL field) are
 *      ignored — we don't manage those.
 *   3. Pathname must start with `/storage/v1/object/public/avatars/`.
 *      (Public bucket; signed-URL paths would need a different prefix
 *      and are not used by this app.)
 *   4. Path within the bucket must start with `<userId>/` so we never
 *      attempt to delete another user's file (defense in depth — the
 *      Storage RLS policy from migration 0003 also blocks it).
 *   5. Filename must start with `cv-` or `el-`. `avatar-*` is skipped
 *      (that's owned by the profile, not by any single CV).
 *
 * Anything that fails any of these is silently ignored; callers receive
 * only the safely-deletable paths. The function is total — passing
 * malformed `data` (legacy rows, manual edits) returns an empty array
 * rather than throwing.
 *
 * @param data        Raw value of the `resumes.data` column. Typed as
 *                    `unknown` because legacy rows or schema-failed
 *                    rows may not match `ResumeData`.
 * @param userId      `auth.uid()` of the row's owner — used as the
 *                    folder prefix filter.
 * @param supabaseUrl Project URL, e.g.
 *                    `https://putgpmxijypjsrwbupyk.supabase.co`. The
 *                    caller usually reads this from
 *                    `process.env.NEXT_PUBLIC_SUPABASE_URL`. Pass an
 *                    empty string to disable cleanup gracefully (used
 *                    in test / SSR contexts where env is missing).
 * @returns Array of bucket-relative paths suitable for
 *          `supabase.storage.from("avatars").remove(paths)`. Order
 *          preserves traversal order; deduplication is the caller's
 *          responsibility (use a `Set` if needed).
 */
export function collectResumeStoragePaths(
  data: unknown,
  userId: string,
  supabaseUrl: string,
): string[] {
  if (!supabaseUrl || !userId) return [];

  // Parse the project URL once so we can compare host/protocol cheaply
  // for every candidate value.
  let baseHost: string;
  let baseProtocol: string;
  try {
    const u = new URL(supabaseUrl);
    baseHost = u.host;
    baseProtocol = u.protocol;
  } catch {
    return [];
  }

  const out: string[] = [];

  const consider = (raw: unknown) => {
    if (typeof raw !== "string") return;
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      return;
    }
    // Same project — never an external URL pasted via the URL field.
    if (parsed.host !== baseHost || parsed.protocol !== baseProtocol) return;
    // Public-bucket avatars path only. Query string + hash on the URL
    // are ignored implicitly because we look at `pathname`.
    if (!parsed.pathname.startsWith(PUBLIC_AVATARS_PATH_PREFIX)) return;
    const bucketRelative = parsed.pathname.slice(PUBLIC_AVATARS_PATH_PREFIX.length);
    // Caller's own folder only.
    if (!bucketRelative.startsWith(`${userId}/`)) return;
    const filename = bucketRelative.slice(userId.length + 1);
    // Filter to CV-photos + custom-element images. Account avatars
    // (`avatar-…`) are managed by `removeAvatar()` in lib/profile.ts.
    if (!filename.startsWith("cv-") && !filename.startsWith("el-")) return;
    out.push(bucketRelative);
  };

  // Defensive optional chaining throughout — a row that failed Zod
  // validation may have any shape.
  const d = data as
    | {
        personal?: { photoUrl?: unknown };
        customElements?: ReadonlyArray<{ kind?: unknown; url?: unknown }>;
      }
    | null
    | undefined;
  if (!d) return out;

  consider(d.personal?.photoUrl);

  if (Array.isArray(d.customElements)) {
    for (const el of d.customElements) {
      if (el && (el as { kind?: unknown }).kind === "image") {
        consider((el as { url?: unknown }).url);
      }
    }
  }

  return out;
}
