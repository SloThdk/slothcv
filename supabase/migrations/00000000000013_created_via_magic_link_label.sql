-- 0013 — store created_via as 'magic_link' instead of 'email'
--
-- Why:
--   Supabase internally uses provider='email' on auth.identities for
--   magic-link signups (the actual signInWithOtp / OTP flow). When
--   surfaced via the Table Editor, 'email' is ambiguous — it could
--   read as "they used email/password" to a non-Supabase reader.
--   Slothcv only supports magic-link (we removed password setting in
--   the /account purge), so renaming the stored value to 'magic_link'
--   makes the profiles row unambiguously readable.
--
--   This is a label-only change in the public.profiles surface. The
--   underlying auth.identities.provider column stays 'email' (Supabase
--   convention) and our prevent_provider_mixing trigger still compares
--   provider strings literally there.

update public.profiles
set created_via = 'magic_link'
where created_via = 'email';

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

  insert into public.profiles (id, display_name, avatar_url, created_via)
  values (new.id, meta_name, meta_avatar, meta_provider)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

comment on column public.profiles.created_via is
  'The auth method that created this account: ''magic_link'' (passwordless '
  'OTP / signInWithOtp), ''google'' (Google OAuth), or any future '
  'provider string verbatim from auth.users.raw_app_meta_data->>''provider''. '
  'Set by handle_new_user on auth.users insert. Strict provider separation '
  '(migration 0009) means this never changes after creation — same email '
  'cannot ever be linked to a second method.';
