-- 0014 — surface user email on public.profiles for at-a-glance admin
--
-- Why:
--   The user's email lives in auth.users.email — Supabase's internal
--   table, visible in Studio but separate from public.profiles. When
--   you open the profiles Table Editor to find a user (display_name,
--   created_via at hand), you have to round-trip to auth.users to
--   look up their email. Annoying for support cases.
--
--   Denormalising email onto profiles makes it a one-stop view:
--   profiles.id / display_name / email / created_via / avatar_url —
--   everything you'd want to see for "who is this user".
--
-- Sync strategy:
--   1. handle_new_user populates email on insert (next signup forward)
--   2. backfill existing rows from auth.users
--   3. AFTER UPDATE trigger on auth.users keeps profiles.email in sync
--      if the user ever changes their email (Supabase auth flow).
--
-- RLS: the existing "users can SELECT their own profile" policy applies
--   identically to the new column. Users only see their own email
--   (which they already know). Cross-user reads remain blocked.

alter table public.profiles
  add column if not exists email text;

comment on column public.profiles.email is
  'The user''s email at signup time, mirrored from auth.users.email. '
  'Kept in sync by handle_new_user (insert) + sync_profile_email_on_update '
  '(update). Not authoritative — auth.users.email is the source of truth, '
  'this column exists for convenient admin viewing in the Table Editor.';

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  meta_name text;
  meta_avatar text;
  meta_provider text;
begin
  meta_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), '')
  );
  meta_avatar := coalesce(
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(new.raw_user_meta_data ->> 'picture', '')
  );
  meta_provider := case
    when nullif(new.raw_app_meta_data ->> 'provider', '') = 'email' then 'magic_link'
    else nullif(new.raw_app_meta_data ->> 'provider', '')
  end;

  insert into public.profiles (id, display_name, avatar_url, created_via, email)
  values (new.id, meta_name, meta_avatar, meta_provider, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.sync_profile_email_on_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if old.email is distinct from new.email then
    update public.profiles
    set email = new.email
    where id = new.id;
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_profile_email_on_update() from public, anon, authenticated;

drop trigger if exists sync_profile_email on auth.users;
create trigger sync_profile_email
  after update on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_profile_email_on_update();
