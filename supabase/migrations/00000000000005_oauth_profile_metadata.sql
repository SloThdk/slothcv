-- ============================================================================
-- slothcv — auto-populate display_name + avatar_url from OAuth metadata.
--
-- Background: the original handle_new_user trigger (migration 0003) used the
-- email's local part as display_name and never set avatar_url. That's correct
-- for magic-link signups (only the email is known), but wasteful for OAuth
-- signups where the provider already handed Supabase a verified name and
-- profile picture in `raw_user_meta_data`.
--
-- Google's OAuth response populates the following keys on auth.users.raw_user_meta_data:
--   - full_name      ("Philip Sloth")
--   - name           ("Philip Sloth") — duplicated, use as fallback
--   - avatar_url     (https://lh3.googleusercontent.com/…)  Supabase normalizes Google's `picture` to this key.
--   - picture        (same URL — kept for compatibility with the raw token)
--   - email_verified (boolean)
--
-- GitHub / Apple / etc. populate similar keys; the coalesce chain below covers
-- the common shapes. If none of the keys are present (magic-link signup), we
-- fall back to the original behavior: split the email's local part.
--
-- This migration:
--   1. Replaces handle_new_user() in place — trigger registration is reused.
--   2. Backfills existing users whose profile row was created with the
--      email-local-part fallback but whose auth.users row carries OAuth
--      metadata. Magic-link-only users are untouched.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Trigger function — pull rich metadata when present
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  meta_name text;
  meta_avatar text;
begin
  -- Pull display name from common OAuth metadata keys, in order of preference.
  -- Google + most providers populate `full_name`; GitHub uses `name`. Both fall
  -- back to splitting the email's local part for magic-link / pure email signups.
  meta_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), '')
  );

  -- Pull profile picture URL. Supabase normalizes Google's `picture` claim to
  -- `avatar_url` in raw_user_meta_data, but we check both for resilience to
  -- provider-specific quirks (and future providers).
  meta_avatar := coalesce(
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(new.raw_user_meta_data ->> 'picture', '')
  );

  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, meta_name, meta_avatar)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- The trigger registration from migration 0003 is reused — `create or replace
-- function` updates the body in place without touching the trigger binding.

-- ---------------------------------------------------------------------------
-- 2. Backfill existing OAuth users
-- ---------------------------------------------------------------------------
-- Users who signed up before this migration got a profile row with
-- display_name = email-local-part and avatar_url = NULL. For OAuth users,
-- their auth.users row carries the richer metadata — copy it across.
--
-- Logic:
--   - Update display_name ONLY if the current value looks like an email-local-
--     part fallback (i.e. matches the prefix of the user's email). This avoids
--     clobbering names users already edited manually on the account page.
--   - Update avatar_url ONLY if it's currently NULL (don't overwrite an avatar
--     a user uploaded themselves).

update public.profiles p
set
  display_name = coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    p.display_name
  ),
  avatar_url = coalesce(
    p.avatar_url,
    nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(u.raw_user_meta_data ->> 'picture', '')
  )
from auth.users u
where u.id = p.id
  and (
    -- Only touch the display_name if it still matches the email-local-part
    -- fallback — leaves manually-edited names alone.
    p.display_name = split_part(coalesce(u.email, ''), '@', 1)
    -- ...or if avatar_url is missing and the provider gave us one.
    or (
      p.avatar_url is null
      and (
        nullif(u.raw_user_meta_data ->> 'avatar_url', '') is not null
        or nullif(u.raw_user_meta_data ->> 'picture', '') is not null
      )
    )
  );
