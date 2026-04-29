/**
 * Resume CRUD helpers — thin wrappers over the Supabase client used by the
 * dashboard list and editor.
 *
 * Each call relies on RLS for ownership enforcement; we still pass the
 * `user_id` on insert because RLS' `with check` predicate needs it to match
 * `auth.uid()`. Reads/updates/deletes don't need a `.eq("user_id", uid)`
 * filter — RLS scopes them implicitly — but adding one would be defense in
 * depth if RLS is ever loosened.
 */

import { createClient } from "./supabase/client";
import { collectResumeStoragePaths } from "./cv-storage-cleanup";
import { defaultResumeData, newId } from "./resume-defaults";
import { parseResumeData } from "./schemas/resume";
import { sampleResumeData } from "@/templates/sample-data";
import type { ResumeData, Section, TemplateId } from "@/types/resume";

export interface ResumeRow {
  id: string;
  title: string;
  updated_at: string;
  /** Master CV this is a variant of, or null if this IS a master. */
  parent_id: string | null;
  /** Human-readable label for the variant, e.g. "PM at Vercel". Null on
   *  masters. The full UI label is `${title} — ${variant_label}` when both
   *  are present. */
  variant_label: string | null;
}

/**
 * Hard cap on CVs per user. MUST stay in sync with the trigger function in
 * `supabase/migrations/00000000000002_cv_count_limit.sql`. The DB is the
 * source of truth; this constant is only used for client-side UX (showing
 * "X / 10" counters and disabling the New CV button before the round-trip).
 */
export const MAX_CVS_PER_USER = 10;

/**
 * Sentinel error class for the cap rejection. Lets the dashboard pattern-
 * match without parsing strings: `if (e instanceof CvLimitReachedError) …`.
 */
export class CvLimitReachedError extends Error {
  constructor(public readonly limit: number = MAX_CVS_PER_USER) {
    super(`You can have at most ${limit} CVs per account.`);
    this.name = "CvLimitReachedError";
  }
}

/** Inspect a Supabase error and return a typed CvLimitReachedError if it
 *  matches the trigger's `cv_limit_reached:` prefix; otherwise null. */
function detectLimitError(message: string | undefined | null): CvLimitReachedError | null {
  if (!message) return null;
  if (message.toLowerCase().includes("cv_limit_reached")) {
    return new CvLimitReachedError();
  }
  return null;
}

export interface ResumeFull extends ResumeRow {
  data: unknown;
  created_at: string;
}

/**
 * Like `getResume`, but parses + migrates `data` into a guaranteed valid
 * `ResumeData` (falls back to `defaultResumeData()` if the stored blob is
 * missing or fails Zod validation).
 */
export async function getResumeParsed(
  id: string,
): Promise<{ row: ResumeFull; data: ResumeData } | null> {
  const row = await getResume(id);
  if (!row) return null;
  const parsed = parseResumeData(row.data) ?? defaultResumeData();
  return { row, data: parsed };
}

export async function listResumes(): Promise<ResumeRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("id, title, updated_at, parent_id, variant_label")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ResumeRow[];
}

/** Group a flat list into masters (no parent) + their variants. The caller
 *  can render this as "MASTER → indented children". Variants whose parent
 *  has been deleted (parent_id points at a row we no longer see) are
 *  surfaced as standalone masters so they don't disappear from the UI. */
export interface ResumeGroup {
  master: ResumeRow;
  variants: ResumeRow[];
}
export function groupResumesByMaster(rows: ResumeRow[]): ResumeGroup[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const groups = new Map<string, ResumeGroup>();
  // Pass 1: all masters (and orphaned variants that lost their parent).
  for (const r of rows) {
    if (!r.parent_id || !byId.has(r.parent_id)) {
      groups.set(r.id, { master: r, variants: [] });
    }
  }
  // Pass 2: real variants → push under their master.
  for (const r of rows) {
    if (r.parent_id && byId.has(r.parent_id)) {
      const g = groups.get(r.parent_id);
      if (g) g.variants.push(r);
    }
  }
  // Stable order: most-recently-touched master first, variants
  // newest-first within each group (matches the input ordering).
  return Array.from(groups.values()).sort(
    (a, b) =>
      new Date(b.master.updated_at).getTime() -
      new Date(a.master.updated_at).getTime(),
  );
}

export async function getResume(id: string): Promise<ResumeFull | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("id, title, data, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as ResumeFull | null;
}

/**
 * Create a fresh CV row, seeded with the **same sample content shown in the
 * gallery thumbnail** for the chosen template. This means picking "Aurora"
 * from the landing gives the user a CV that looks instantly populated and
 * polished — they edit Philip's content over with their own, instead of
 * staring at empty section placeholders.
 *
 * If no template is passed (the dashboard's "+ New CV" button), we still
 * seed with Berlin's sample content as a sensible polished default so the
 * editor never opens on a wireframe. The user can switch templates from the
 * Templates tab at any time without losing content.
 */
export async function createResume(template?: TemplateId): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  // Choose a template to seed from. Default = berlin (the most generic
  // populated layout) when no explicit template was picked.
  const tpl: TemplateId = template ?? "berlin";

  // Take the gallery's sample data and clone every id so two CVs never
  // share section/item ids — important for safe duplication later and for
  // dnd-kit's stable-key invariant in the section list.
  const seed = withFreshIds(sampleResumeData(tpl));

  const { data, error } = await supabase
    .from("resumes")
    .insert({ user_id: user.id, title: "Untitled CV", data: seed })
    .select("id")
    .single();
  if (error || !data) {
    // The trigger raises a `cv_limit_reached:` error when the account is at
    // the cap. Surface it as a typed exception so the dashboard can render a
    // friendly upgrade-or-delete message instead of a raw Postgres string.
    const limitErr = detectLimitError(error?.message);
    if (limitErr) throw limitErr;
    throw new Error(error?.message ?? "Could not create CV.");
  }
  return data.id;
}

/**
 * Walk a ResumeData and regenerate every nanoid-shaped id so the resulting
 * structure is safe to insert as a NEW row. Sample data is hard-coded and
 * shared by all users — without this, two users picking the same template
 * would share section ids, which is harmless on its own but breaks the
 * "duplicate / version-history" path later when we try to use ids as keys
 * across rows.
 */
function withFreshIds(data: ResumeData): ResumeData {
  return {
    ...data,
    personal: {
      ...data.personal,
      links: data.personal.links.map((l) => ({ ...l, id: newId() })),
    },
    sections: data.sections.map(freshSection),
  };
}

function freshSection(s: Section): Section {
  const baseId = newId();
  // Explicit per-type clones — TypeScript's discriminated-union narrowing
  // collapses adjacent cases, which then loses item-type fidelity. Repeating
  // the case keeps each return value typed correctly without an `as` cast.
  switch (s.type) {
    case "summary":
      return { ...s, id: baseId };
    case "experience":
      return {
        ...s,
        id: baseId,
        items: s.items.map((it) => ({
          ...it,
          id: newId(),
          bullets: it.bullets.map((b) => ({ ...b, id: newId() })),
        })),
      };
    case "volunteer":
      return {
        ...s,
        id: baseId,
        items: s.items.map((it) => ({
          ...it,
          id: newId(),
          bullets: it.bullets.map((b) => ({ ...b, id: newId() })),
        })),
      };
    case "education":
      return {
        ...s,
        id: baseId,
        items: s.items.map((it) => ({
          ...it,
          id: newId(),
          bullets: it.bullets.map((b) => ({ ...b, id: newId() })),
        })),
      };
    case "projects":
      return {
        ...s,
        id: baseId,
        items: s.items.map((it) => ({
          ...it,
          id: newId(),
          bullets: it.bullets.map((b) => ({ ...b, id: newId() })),
        })),
      };
    case "skills":
      return { ...s, id: baseId, items: s.items.map((it) => ({ ...it, id: newId() })) };
    case "languages":
      return { ...s, id: baseId, items: s.items.map((it) => ({ ...it, id: newId() })) };
    case "certifications":
      return { ...s, id: baseId, items: s.items.map((it) => ({ ...it, id: newId() })) };
    case "awards":
      return { ...s, id: baseId, items: s.items.map((it) => ({ ...it, id: newId() })) };
    case "publications":
      return { ...s, id: baseId, items: s.items.map((it) => ({ ...it, id: newId() })) };
    case "talks":
      return { ...s, id: baseId, items: s.items.map((it) => ({ ...it, id: newId() })) };
    case "hobbies":
      return { ...s, id: baseId, items: s.items.map((it) => ({ ...it, id: newId() })) };
    case "references":
      return { ...s, id: baseId, items: s.items.map((it) => ({ ...it, id: newId() })) };
    case "custom":
      return {
        ...s,
        id: baseId,
        items: s.items.map((b) => ({ ...b, id: newId() })),
      };
  }
}

/**
 * Delete a single CV row AND best-effort purge any storage files it
 * was the sole reference to.
 *
 * Cleanup contract:
 *   1. Read the row's `data` first (RLS scopes the SELECT to the
 *      caller). Collect candidate storage paths via
 *      `collectResumeStoragePaths()` — only `cv-*` / `el-*` files
 *      under the caller's `<uid>/` folder are eligible.
 *   2. SELECT every OTHER row of the caller's and walk those for
 *      storage paths too. The intersection (a path referenced by
 *      another row) is REMOVED from the deletion list. This protects
 *      duplicated CVs: `duplicateResume()` clones `data` wholesale,
 *      so two rows can share the same `photoUrl` until one of them is
 *      edited to a different photo.
 *   3. Delete the resumes row. RLS guards ownership.
 *   4. Best-effort `storage.remove()` on the (no-longer-referenced)
 *      paths. Failures are swallowed — orphans are caught later by
 *      the `BEFORE DELETE on auth.users` trigger if the user
 *      eventually deletes their account, and a manual sweep can
 *      handle long-lived stragglers.
 *
 * Step ordering matters: step 4 runs AFTER the row delete so a
 * concurrent SELECT-by-id can never see a `photoUrl` whose file we
 * already removed. RLS + the eq(id) filter make step 3 atomic at the
 * row level; step 4 is best-effort cleanup that the user never sees.
 */
export async function deleteResume(id: string): Promise<void> {
  const supabase = createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // We need user.id to scope storage-path matching to the caller's
  // folder. RLS would protect a wider match, but explicit prefix
  // matching keeps `collectResumeStoragePaths()` honest if the row's
  // data ever holds a foreign URL by mistake.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  // Compute paths to delete — this whole block is best-effort. If the
  // env var is missing or any read fails, we skip cleanup and proceed
  // with the row delete; a failed cleanup must never block the user
  // from deleting their CV.
  let pathsToDelete: string[] = [];
  if (supabaseUrl) {
    const { data: thisRow } = await supabase
      .from("resumes")
      .select("data")
      .eq("id", id)
      .maybeSingle();
    if (thisRow) {
      const candidates = collectResumeStoragePaths(
        thisRow.data,
        user.id,
        supabaseUrl,
      );
      if (candidates.length > 0) {
        // Build the "still referenced by other rows" set. RLS scopes
        // this SELECT to the caller's rows; we additionally filter out
        // the row we're about to delete so it doesn't self-cancel the
        // candidates.
        const { data: others } = await supabase
          .from("resumes")
          .select("data")
          .neq("id", id);
        const stillReferenced = new Set<string>();
        for (const r of others ?? []) {
          for (const p of collectResumeStoragePaths(
            r.data,
            user.id,
            supabaseUrl,
          )) {
            stillReferenced.add(p);
          }
        }
        pathsToDelete = candidates.filter((p) => !stillReferenced.has(p));
      }
    }
  }

  const { error } = await supabase.from("resumes").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (pathsToDelete.length > 0) {
    // Swallow — orphans are recoverable, a failed delete here is not
    // the user's problem. The auth.users-delete trigger picks up
    // strays when the account is eventually closed.
    await supabase.storage
      .from("avatars")
      .remove(pathsToDelete)
      .catch(() => {});
  }
}

/**
 * Hard-delete EVERY CV the caller owns. RLS scopes the DELETE to the
 * caller's rows only — even though the WHERE clause matches "all
 * resumes", Postgres only sees the rows the policy permits.
 *
 * Returns the number of rows deleted so the caller can show a
 * confirmation toast ("Deleted 7 CVs"). The Supabase client returns
 * the deleted rows when `.select()` is appended; we count and return
 * the length.
 *
 * Caller MUST gate this behind a confirm modal — there is NO undo.
 * The dashboard wires this through `useConfirm({ variant: "danger" })`
 * with explicit "this cannot be undone" wording in both EN and DA.
 */
export async function deleteAllResumes(): Promise<number> {
  const supabase = createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  // Capture every storage path referenced by ANY of the user's rows
  // BEFORE the bulk delete fires. After the delete completes, no row
  // remains that could still need these files, so we can purge
  // unconditionally — no per-path cross-reference check (unlike
  // `deleteResume`).
  const allPaths = new Set<string>();
  if (supabaseUrl) {
    const { data: allRows } = await supabase
      .from("resumes")
      .select("data")
      .eq("user_id", user.id);
    for (const r of allRows ?? []) {
      for (const p of collectResumeStoragePaths(
        r.data,
        user.id,
        supabaseUrl,
      )) {
        allPaths.add(p);
      }
    }
  }

  // Filter on user_id (not just .delete() with no eq) as belt-and-braces:
  // RLS already restricts deletes to the caller's rows, but explicit
  // user-id matching makes the intent obvious to anyone reading the
  // SQL log AND survives any future RLS policy change without
  // accidentally deleting more than the caller's own rows.
  const { data, error } = await supabase
    .from("resumes")
    .delete()
    .eq("user_id", user.id)
    .select("id");
  if (error) throw new Error(error.message);

  if (allPaths.size > 0) {
    await supabase.storage
      .from("avatars")
      .remove(Array.from(allPaths))
      .catch(() => {});
  }

  return Array.isArray(data) ? data.length : 0;
}

export async function duplicateResume(id: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  // Read source first; RLS guarantees we only see our own rows.
  const { data: src, error: readErr } = await supabase
    .from("resumes")
    .select("title, data")
    .eq("id", id)
    .single();
  if (readErr || !src) throw new Error(readErr?.message ?? "CV not found.");

  const { error: insertErr } = await supabase.from("resumes").insert({
    user_id: user.id,
    title: `${src.title} (copy)`,
    data: src.data,
  });
  if (insertErr) {
    // Duplicates also count toward the cap.
    const limitErr = detectLimitError(insertErr.message);
    if (limitErr) throw limitErr;
    throw new Error(insertErr.message);
  }
}

/**
 * Duplicate a master CV into a tailored variant. The new row keeps the
 * master's content but carries a `parent_id` pointer + a `variant_label`
 * the user picks ("PM at Vercel"). Both rows still belong to the same
 * `user_id`; RLS works the same.
 *
 * If `sourceId` is itself already a variant (its `parent_id` is set), we
 * use ITS parent as the new variant's parent. Variants don't nest — every
 * variant points at a top-level master. This prevents "variant of a
 * variant of a variant" sprawl that would make the dashboard a tree.
 *
 * Optional `snapshot` lets the caller supply the data payload directly
 * instead of reading it from the source row. The template-swap toast
 * uses this so it can preserve the PRE-swap state — by the time the
 * user clicks "Save as variant" in the toast, the live row has already
 * auto-saved with the new template, so reading from DB would clone the
 * post-swap state and the user's previous decorated version is gone.
 * Passing the captured snapshot bypasses that race entirely.
 */
export async function duplicateAsVariant(
  sourceId: string,
  variantLabel: string,
  options?: { snapshot?: ResumeData },
): Promise<string> {
  const trimmed = variantLabel.trim().slice(0, 80);
  if (!trimmed) throw new Error("Variant label can't be empty.");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  // Read source first to learn its parent (if any) and (if no snapshot
  // was supplied) to clone its content. Title is always read from DB —
  // the variant_label is the differentiator, so the title field stays
  // identical to the master's, regardless of what the snapshot says.
  const { data: src, error: readErr } = await supabase
    .from("resumes")
    .select("title, data, parent_id")
    .eq("id", sourceId)
    .single();
  if (readErr || !src) throw new Error(readErr?.message ?? "CV not found.");

  // Flatten variant-of-variant: the new variant points at the top-level
  // master, not at a sibling variant. If the source was itself a master
  // (parent_id null), use the source's id as the parent.
  const masterId = src.parent_id ?? sourceId;

  // Prefer the caller-supplied snapshot when present; otherwise the
  // current DB content (legacy callers).
  const dataPayload =
    options?.snapshot !== undefined ? options.snapshot : src.data;

  const { data: ins, error: insertErr } = await supabase
    .from("resumes")
    .insert({
      user_id: user.id,
      title: src.title, // keep the master's title; variant_label is the differentiator
      data: dataPayload,
      parent_id: masterId,
      variant_label: trimmed,
    })
    .select("id")
    .single();
  if (insertErr || !ins) {
    const limitErr = detectLimitError(insertErr?.message);
    if (limitErr) throw limitErr;
    throw new Error(insertErr?.message ?? "Could not create variant.");
  }
  return ins.id;
}

export async function renameResume(id: string, title: string): Promise<void> {
  const trimmed = title.trim().slice(0, 120);
  if (!trimmed) throw new Error("Title can't be empty.");
  const supabase = createClient();
  const { error } = await supabase
    .from("resumes")
    .update({ title: trimmed })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Rename a variant's `variant_label` only — used by the dashboard's
 * "Rename" action when invoked on a variant row. Variants share the
 * master's title (the title column stays whatever the master is named);
 * the differentiator a user sees is the variant_label ("PM at Vercel"
 * etc). Renaming a variant should change THAT, not the shared title —
 * otherwise renaming one variant would either rename every sibling
 * variant + the master (if we wrote the shared title) or silently
 * desync the title between rows. Editing variant_label keeps the data
 * model honest.
 *
 * 80-char cap matches the cap used at variant-creation time
 * (duplicateAsVariant) so renames don't push existing variants past a
 * new ceiling.
 */
export async function renameVariantLabel(
  id: string,
  label: string,
): Promise<void> {
  const trimmed = label.trim().slice(0, 80);
  if (!trimmed) throw new Error("Variant label can't be empty.");
  const supabase = createClient();
  const { error } = await supabase
    .from("resumes")
    .update({ variant_label: trimmed })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveResumeData(id: string, data: unknown): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("resumes")
    .update({ data: data ?? {} })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
