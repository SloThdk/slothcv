-- 0008 — public.email_status RPC: provider-aware existence check
--
-- Why this exists:
--   The 0007 email_exists() RPC returns boolean only. That's enough to
--   block /signup duplicates, but not enough for /login to enforce
--   strict provider separation: a Google-only account should refuse
--   magic-link sign-in with "use the Google button instead", not just
--   silently send a link to whatever email the user typed.
--
--   email_status() returns three booleans:
--     is_registered : email exists in auth.users
--     has_email     : auth.identities has provider='email' for that user
--                     (i.e. they completed at least one magic-link / OTP)
--     has_google    : auth.identities has provider='google'
--
--   Reading the trio: a brand-new visitor is (false,false,false). A user
--   who signed up via Google and never used the magic link is
--   (true,false,true). A user who signed up via magic link and never
--   linked Google is (true,true,false). A user who used both at any
--   point is (true,true,true).
--
-- Why a single function returning a row instead of three separate RPCs:
--   /signup and /login both want all three pieces in one round-trip.
--   Three RPC calls would be three captcha-free Postgres calls, but
--   they'd race and we'd pay three round trips of latency before the
--   user sees the form's verdict.
--
-- Search path is pinned to auth, public so we can reference auth.users
-- and auth.identities directly. SECURITY DEFINER means the function
-- runs as the owner (postgres) regardless of caller, so the anon role
-- can read these rows via the function without having any direct
-- SELECT on auth.* tables.

create or replace function public.email_status(check_email text)
returns table (
  is_registered boolean,
  has_email boolean,
  has_google boolean
)
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  uid uuid;
begin
  if check_email is null or length(trim(check_email)) = 0 then
    return query select false, false, false;
    return;
  end if;

  select u.id into uid
  from auth.users u
  where lower(u.email) = lower(trim(check_email))
  limit 1;

  if uid is null then
    return query select false, false, false;
    return;
  end if;

  return query
  select
    true,
    exists(
      select 1 from auth.identities i
      where i.user_id = uid and i.provider = 'email'
    ),
    exists(
      select 1 from auth.identities i
      where i.user_id = uid and i.provider = 'google'
    );
end;
$$;

comment on function public.email_status(text) is
  'Returns provider-aware account status for an email: is_registered, has_email (magic-link identity), has_google (OAuth identity). Used by /signup to block duplicates with provider-specific copy, and by /login to enforce strict provider separation (refuse magic link for OAuth-only accounts). Public RPC, anon-callable, gated by Turnstile + Supabase rate limits. Returns row of three booleans only — never leaks user data.';

revoke all on function public.email_status(text) from public;
grant execute on function public.email_status(text) to anon, authenticated;
