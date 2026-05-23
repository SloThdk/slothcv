-- ============================================================================
-- slothcv — drop per-user CV cap from 10 → 5 (2026-05-21)
--
-- Why this change:
--   We're tightening the free cap NOW (before launch) instead of later because
--   the cap is reversible UP but not DOWN. If we shipped at 10 and let power
--   users accumulate 7-10 CVs, we could never drop the cap later without
--   orphaning them — they'd be stuck at their current count forever, unable
--   to create new ones until they deleted enough to fit under 5. Setting it
--   at 5 NOW bakes in the standard freemium template (Resume.io / Enhancv /
--   Novoresume all use 1-5 free) before any user accumulates above it.
--
--   Storage-cap math is unchanged at 5,000 saturated users × 5 CVs × ~10 KB
--   ≈ 250 MB, still inside the Supabase free 500 MB DB ceiling.
--
-- What this migration does:
--   Recreates `public.enforce_resume_count_limit()` with `cv_limit := 5`.
--   The function name + the `cv_limit_reached:` error prefix are unchanged
--   so the client-side handler (`lib/resumes.ts → detectLimitError`) keeps
--   working identically.
--
--   Existing users with > 5 CVs are GRANDFATHERED: the trigger fires only on
--   INSERT, so a user already at 7 CVs keeps all 7 — they just can't create
--   a new one until they delete some. No data loss; the cap is enforced
--   going forward only.
--
--   Client-side constant `MAX_CVS_PER_USER` in `lib/resumes.ts` is updated
--   to 5 in the same commit so the "X / 5" counter + the "+ New CV"
--   disabled-state match the server.
-- ============================================================================

create or replace function public.enforce_resume_count_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cv_count int;
  cv_limit constant int := 5;
begin
  -- Count rows already owned by the user the new row claims to belong to.
  -- We trust NEW.user_id here because the RLS `with check` policy on the
  -- table already enforces `auth.uid() = user_id` for INSERTs from the
  -- regular API path. Even if the service role bypasses that check, the
  -- count is still per-user-id, so the cap remains enforced per identity.
  select count(*) into cv_count
    from public.resumes
   where user_id = new.user_id;

  if cv_count >= cv_limit then
    -- The `cv_limit_reached:` prefix is part of the contract — clients
    -- pattern-match on it. Don't change without coordinating with
    -- `lib/resumes.ts`.
    raise exception 'cv_limit_reached: maximum % CVs per account', cv_limit
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- Trigger binding is unchanged from migration 0002; `create or replace`
-- on the function above is sufficient since the trigger references the
-- function by name and picks up the new body automatically.
