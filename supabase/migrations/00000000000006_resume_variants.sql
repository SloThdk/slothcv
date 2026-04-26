-- ============================================================================
-- slothcv — Resume variants (master → child relationship)
--
-- Adds a self-referential parent_id + a human-readable variant_label so users
-- can have ONE master CV and many tailored variants ("PM at Vercel", "IC at
-- Anthropic"). The data flywheel: when we ship the application tracker
-- later, we'll join `resumes ↔ applications` to learn which variant got the
-- callback.
--
-- Design choices:
--   - parent_id is nullable: rows without it are "master" CVs (the default
--     for any new CV). Rows WITH it are variants of that master.
--   - on delete set null on parent_id: deleting a master leaves the variant
--     standing on its own (orphan), which is friendlier than cascade-deleting
--     the user's curated variants. They can still re-link or delete manually.
--   - variant_label is text, free-form, no length cap beyond the title's
--     existing constraint at the app layer.
--   - No new RLS policies needed: the existing user_id-scoped policies cover
--     parent_id transitively (you can only see your own rows; if a row's
--     parent_id points to a row you can't see, the parent is just hidden in
--     the UI — not a security issue, just a UX edge case to handle in code).
-- ============================================================================

alter table public.resumes
  add column if not exists parent_id uuid
    references public.resumes(id) on delete set null,
  add column if not exists variant_label text;

-- Useful for the dashboard's "group variants under master" rendering.
create index if not exists resumes_parent_idx
  on public.resumes (parent_id)
  where parent_id is not null;
