-- ============================================================================
-- slothcv — Phase 2.5 schema: profiles, avatars storage, self-delete RPC.
--
-- This migration adds three things, in dependency order:
--
--   1. `public.profiles` — one row per auth.users entry with display_name +
--      avatar_url. Auto-populated by an `on auth.users` AFTER INSERT trigger
--      so a profile always exists from the moment a user signs up.
--   2. `storage.buckets` entry `avatars` (public read, own-folder write) +
--      four storage RLS policies that scope INSERT/UPDATE/DELETE to the
--      caller's user_id-prefixed folder.
--   3. `public.delete_account()` RPC — SECURITY DEFINER, deletes the calling
--      user from auth.users which cascades to profiles and resumes via the
--      existing FK constraints. The client calls this via supabase.rpc()
--      with the user's JWT; the function checks `auth.uid()` first so it
--      cannot be invoked by anonymous callers.
--
-- Compatibility: this migration is additive — it does not touch the existing
-- `resumes` table or its policies. The cap trigger from migration 0002 stays
-- intact.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles table
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles
  for delete
  using (auth.uid() = id);

-- Auto-create profile rows when a user signs up.
-- SECURITY DEFINER so it can write into public.profiles regardless of the
-- caller's RLS — needed because the trigger runs in the auth.users insert
-- context (Supabase Auth's internal session), not the user's own.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Best-effort default for display_name: the email's local part. Users can
  -- rename later from the account page. Never raise — if profile already
  -- exists (re-run, manual insert, etc.) just leave it.
  insert into public.profiles (id, display_name)
  values (new.id, split_part(coalesce(new.email, ''), '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-bump updated_at on UPDATE (mirrors the resumes table pattern).
drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row
  execute function public.touch_updated_at();

-- Backfill: existing users get a profile row even though the trigger above
-- only fires on new inserts.
insert into public.profiles (id, display_name)
select u.id, split_part(coalesce(u.email, ''), '@', 1)
  from auth.users u
  left join public.profiles p on p.id = u.id
 where p.id is null;

-- ---------------------------------------------------------------------------
-- 2. Avatars storage bucket
-- ---------------------------------------------------------------------------
-- The bucket is `public` so the avatar URL works in <img> without a signed
-- request. Write access is gated by RLS — only the owner can upload to a
-- folder named after their own user_id.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read.
drop policy if exists "Avatar files are publicly readable"
  on storage.objects;
create policy "Avatar files are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Owner-only insert.
-- Path layout: `<user_id>/<filename>`. We compare the first folder segment
-- to the caller's auth.uid() so users can't upload into another user's path.
drop policy if exists "Users can upload to their own avatar folder"
  on storage.objects;
create policy "Users can upload to their own avatar folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own avatar"
  on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar"
  on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 3. Self-service account deletion
-- ---------------------------------------------------------------------------
-- The client calls supabase.rpc('delete_account') with the user's JWT.
-- SECURITY DEFINER is necessary because regular users cannot delete from
-- auth.users — only the postgres role can. We re-check auth.uid() inside
-- the function so a malicious client can't pass a user_id parameter to
-- nuke someone else's account.
--
-- Cascade:
--   auth.users  → public.profiles (FK ON DELETE CASCADE)
--   auth.users  → public.resumes  (FK ON DELETE CASCADE — via the init migration)
--
-- Storage objects in the avatars/<uid>/ folder are NOT cascaded automatically
-- (Storage has no FK to auth.users). The client purges them BEFORE calling
-- this RPC; the SECURITY DEFINER block below also issues a best-effort
-- delete from storage.objects so a manually-invoked deletion still cleans
-- up files even if the client forgets.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Best-effort storage cleanup. We don't fail if the bucket is empty or
  -- if a row is missing — the cascade below is the authoritative wipe.
  delete from storage.objects
   where bucket_id = 'avatars'
     and (storage.foldername(name))[1] = uid::text;

  -- The actual nuke. CASCADE removes the profile row and every resume.
  delete from auth.users where id = uid;
end;
$$;

-- Allow authenticated callers to invoke the function.
revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
