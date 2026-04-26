-- 0007 — public.email_exists RPC for client-side existence checks
--
-- Why this exists:
--   The /signup and /login flows previously used a "probe" pattern:
--   call signInWithOtp({email, shouldCreateUser:false}) and branch on
--   whether it succeeds (existing user) or errors with user_not_found
--   (new user). That pattern has two failure modes:
--     1. For OAuth-only users (Google sign-up, no email/password
--        identity), Supabase returns user_not_found even though the
--        auth.users row exists — so /signup wrongly proceeded to send
--        a magic link to an already-registered email.
--     2. The probe ALWAYS sends a magic link as a side effect when
--        the user exists. That mail-bomb of "you have an account, here
--        is a sign-in link" surprises users and confuses them about
--        whether their /signup attempt succeeded or not.
--
--   This RPC checks auth.users directly with SECURITY DEFINER so the
--   anon role can call it without seeing the rest of the table. It
--   returns boolean only — no email, name, identity, or any other
--   user data leaks.
--
-- Enumeration risk:
--   Anyone can probe whether an email is registered. Mitigations:
--     1. Cloudflare Turnstile gates every form submit on /signup and
--        /login (managed mode — auto-passes for low-risk users).
--     2. Supabase rate-limits by IP at the project level.
--     3. The RPC is wrapped in a search_path-pinned SECURITY DEFINER
--        function; the anon role can ONLY see the boolean return,
--        never the underlying table.
--   Net: small enumeration vector accepted in exchange for predictable
--   /signup blocking and zero unintended magic-link sends.

create or replace function public.email_exists(check_email text)
returns boolean
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  if check_email is null or length(trim(check_email)) = 0 then
    return false;
  end if;
  return exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(check_email))
  );
end;
$$;

comment on function public.email_exists(text) is
  'Returns true if the email is registered in auth.users. Used by /signup '
  'to block duplicate signups and by /login to surface "no account" before '
  'sending an OTP. Public RPC — small enumeration vector accepted (gated '
  'by Turnstile + Supabase rate limits). Safe: returns boolean only, never '
  'leaks user data.';

revoke all on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to anon, authenticated;
