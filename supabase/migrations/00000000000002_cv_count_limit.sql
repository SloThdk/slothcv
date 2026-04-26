-- ============================================================================
-- slothcv — per-user CV count cap (cost-control rail)
--
-- Why this exists:
--   slothcv runs on the Supabase Free tier with no payment method on file. We
--   can't be billed (the project pauses at limits instead of charging), but a
--   single user creating thousands of CVs would still chew through the 500 MB
--   DB quota and pause the service for everyone. This trigger enforces a hard
--   cap on rows-per-user so the worst-case database growth is bounded by
--     (registered_users × CV_LIMIT × ~10 KB)
--   With CV_LIMIT = 10 and a 500 MB free DB, that's ~5,000 fully-saturated
--   users before anything paused.
--
-- Why a trigger, not a CHECK:
--   - CHECK constraints can't reference other rows in the same table.
--   - Application-level checks can be bypassed by anyone who acquires the
--     anon key (which is, by definition, public). This trigger sits below
--     the API layer — even a malicious client posting raw SQL via the
--     service role key would have to explicitly disable the trigger.
--
-- Behaviour:
--   - On INSERT, count the caller's existing rows. If >= the limit, raise
--     a `check_violation` (SQLSTATE 23514) with code prefix `cv_limit_reached:`
--     so the client can pattern-match it and show a friendly message.
--   - SECURITY DEFINER so the trigger runs as the function owner (`postgres`)
--     and can read every row regardless of RLS — necessary for the count.
--   - The cap is hard-coded as a CONSTANT inside the function body. To bump
--     it later: write a follow-up migration (do NOT edit this one in place;
--     migrations are append-only).
-- ============================================================================

create or replace function public.enforce_resume_count_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cv_count int;
  cv_limit constant int := 10;
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
    -- The `cv_limit_reached:` prefix is part of the contract — clients pattern-
    -- match on it. Don't change without coordinating with `lib/resumes.ts`.
    raise exception 'cv_limit_reached: maximum % CVs per account', cv_limit
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists resumes_enforce_count_limit on public.resumes;
create trigger resumes_enforce_count_limit
  before insert on public.resumes
  for each row
  execute function public.enforce_resume_count_limit();

-- Sanity index — speeds the count(*) above for users with many rows.
-- Already covered by `resumes_user_updated_idx` from the init migration,
-- but documented here so future-you knows the trigger relies on it.
-- (No new index needed.)
