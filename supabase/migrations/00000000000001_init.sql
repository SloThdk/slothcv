-- ============================================================================
-- slothcv — Phase 1 schema
--
-- One table: `resumes`. Each row is owned by exactly one auth.users row.
-- The `data` JSONB column carries the editor state — Phase 1 stores an
-- empty object; Phase 2 will fill it with blocks/design tokens.
--
-- Row-Level Security is ON and the four CRUD policies reduce to a single
-- predicate: `auth.uid() = user_id`. Anything else is rejected at the DB
-- layer regardless of how the request is shaped.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.resumes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'Untitled CV',
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Hot path: dashboard lists by user, ordered by updated_at desc.
create index if not exists resumes_user_updated_idx
  on public.resumes (user_id, updated_at desc);

alter table public.resumes enable row level security;

-- SELECT
drop policy if exists "resumes_select_own" on public.resumes;
create policy "resumes_select_own"
  on public.resumes
  for select
  using (auth.uid() = user_id);

-- INSERT — `with check` ensures the inserted row is attributed to the caller.
drop policy if exists "resumes_insert_own" on public.resumes;
create policy "resumes_insert_own"
  on public.resumes
  for insert
  with check (auth.uid() = user_id);

-- UPDATE — both `using` (which existing rows can be touched) and `with check`
-- (what the new row state is allowed to be) reference the caller. Together
-- they prevent both reading-someone-elses-row and re-attributing-on-update.
drop policy if exists "resumes_update_own" on public.resumes;
create policy "resumes_update_own"
  on public.resumes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE
drop policy if exists "resumes_delete_own" on public.resumes;
create policy "resumes_delete_own"
  on public.resumes
  for delete
  using (auth.uid() = user_id);

-- Auto-bump updated_at on UPDATE. Keeps the dashboard's "updated X ago" hint
-- truthful even if a client forgets to set the column itself.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists resumes_touch_updated_at on public.resumes;
create trigger resumes_touch_updated_at
  before update on public.resumes
  for each row
  execute function public.touch_updated_at();
