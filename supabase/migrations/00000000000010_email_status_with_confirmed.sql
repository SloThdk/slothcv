-- 0010 — extend email_status to expose email_confirmed_at as is_confirmed
--
-- Why this exists:
--   The 0008 RPC returns {is_registered, has_email, has_google}. SignupForm
--   uses `is_registered` to decide whether to block a re-submit with the
--   "account already exists" banner.
--
--   But signInWithOtp creates an auth.users row IMMEDIATELY when the magic
--   link is sent — before the user clicks it. The user's mental model is
--   "I haven't created an account yet, I haven't clicked anything." Our
--   /signup form would say `is_registered: true, has_email: true` and
--   render the "exists, sign in instead" banner. That's wrong UX:
--   the user is mid-signup, didn't confirm, and the right behaviour is
--   to resend the magic link.
--
--   Adding `is_confirmed` (= `email_confirmed_at IS NOT NULL`) lets the
--   frontend distinguish:
--     - is_registered:false                            → new email, send link
--     - is_registered:true, is_confirmed:false         → pending signup,
--                                                        resend link silently
--     - is_registered:true, is_confirmed:true,
--                          has_email:true              → confirmed magic-link
--                                                        account, BLOCK
--                                                        with "use /login"
--     - is_registered:true, is_confirmed:true,
--                          has_email:false,
--                          has_google:true             → confirmed Google
--                                                        account, BLOCK with
--                                                        "use Continue with
--                                                        Google"
--
--   Google OAuth users are confirmed immediately (Google's email is already
--   verified), so for them is_confirmed:true is the natural state.
--
-- Same SECURITY DEFINER + search_path pattern as 0008. Replaces the function
-- in place; existing grants stay (CREATE OR REPLACE preserves them) but we
-- re-grant defensively at the bottom in case the function signature ever
-- changes the function's identity.

-- Postgres rejects CREATE OR REPLACE when the function's RETURNS TABLE
-- shape changes (OUT parameter list differs). 0008's email_status returns
-- 3 booleans; this migration extends it to 4. We must DROP first.
-- Existing GRANTs are dropped along with the function and re-issued at
-- the bottom.
drop function if exists public.email_status(text);

create or replace function public.email_status(check_email text)
returns table (
  is_registered boolean,
  is_confirmed boolean,
  has_email boolean,
  has_google boolean
)
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  uid uuid;
  confirmed_at timestamptz;
begin
  if check_email is null or length(trim(check_email)) = 0 then
    return query select false, false, false, false;
    return;
  end if;

  select u.id, u.email_confirmed_at
  into uid, confirmed_at
  from auth.users u
  where lower(u.email) = lower(trim(check_email))
  limit 1;

  if uid is null then
    return query select false, false, false, false;
    return;
  end if;

  return query
  select
    true,
    confirmed_at is not null,
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
  'Returns provider-aware account status for an email: is_registered, is_confirmed (email_confirmed_at NOT NULL — false during the magic-link-sent-but-not-clicked window), has_email (magic-link identity exists), has_google (OAuth identity exists). Used by /signup to distinguish "real existing account" (block) from "pending signup waiting on magic link" (resend silently), and by /login to enforce strict provider separation. Public RPC, anon-callable, gated by Turnstile + Supabase rate limits. Returns row of four booleans only — never leaks user data.';

revoke all on function public.email_status(text) from public;
grant execute on function public.email_status(text) to anon, authenticated;
