-- 0011 — Surface the auth provider on public.profiles for at-a-glance visibility
--
-- Why this exists:
--   Supabase stores the auth method on auth.users.raw_app_meta_data->>'provider'
--   ('email' for magic-link, 'google' for OAuth, etc.) and on auth.identities.provider.
--   Both are in the auth schema — visible via SQL but NOT directly in the
--   public.profiles table that Studio's Table Editor surfaces by default.
--   Philip wants to glance at the profiles list and see who came in via
--   which method.
--
--   With the prevent_provider_mixing trigger (migration 0009), each user
--   has exactly ONE provider for life — strict separation. So a single
--   `created_via` column on profiles fully captures the truth and never
--   needs updating after creation.
--
-- This migration:
--   1. Adds public.profiles.created_via (text, nullable for forward
--      compatibility but practically always set by the trigger below).
--   2. Backfills the column for existing users from
--      auth.users.raw_app_meta_data->>'provider'.
--   3. Replaces handle_new_user() in place to populate the column on
--      every future signup (preserves the existing display_name +
--      avatar_url logic from migration 0005).

alter table public.profiles
  add column if not exists created_via text;

comment on column public.profiles.created_via is
  'The auth provider that created this account: ''email'' (magic link), '
  '''google'' (OAuth), or other provider strings if more are enabled. '
  'Set by the handle_new_user trigger on auth.users insert. Strict '
  'provider separation (migration 0009) means this never changes after '
  'creation — same email cannot ever be linked to a second provider.';

-- Backfill from existing auth.users records.
update public.profiles p
set created_via = u.raw_app_meta_data ->> 'provider'
from auth.users u
where p.id = u.id
  and (p.created_via is null or p.created_via = '');

-- Replace handle_new_user to set created_via on insert. Reuses the
-- display_name + avatar_url logic from migration 0005 verbatim — only
-- the INSERT line and the new local variable change.
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
  -- Display name: prefer the rich OAuth metadata; fall back to email local part.
  meta_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), '')
  );

  -- Avatar URL: Supabase normalizes Google's `picture` to `avatar_url`
  -- but we check both for resilience to provider quirks.
  meta_avatar := coalesce(
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(new.raw_user_meta_data ->> 'picture', '')
  );

  -- Provider: 'email' for magic-link, 'google' for OAuth, etc.
  -- Stored on raw_app_meta_data, NOT raw_user_meta_data — that's the
  -- canonical source per Supabase's auth model.
  meta_provider := nullif(new.raw_app_meta_data ->> 'provider', '');

  insert into public.profiles (id, display_name, avatar_url, created_via)
  values (new.id, meta_name, meta_avatar, meta_provider)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Trigger registration is unchanged from migration 0003 (still
-- on_auth_user_created on auth.users AFTER INSERT). CREATE OR REPLACE
-- on the function preserves the trigger binding — no need to re-declare.
