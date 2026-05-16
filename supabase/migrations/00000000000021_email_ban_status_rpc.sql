-- 0021 — public.email_ban_status(text) RPC.
--
-- Why this exists:
--   email_status() returns whether an email is registered and which
--   providers it has. It does NOT report ban state. So a banned user
--   typing their email at /login + clicking "Send link" passes the
--   email_status gate, signInWithOtp gets called, and Supabase
--   either (a) silently sends a magic-link the user can't redeem,
--   (b) returns over_email_send_rate_limit if they retry fast, or
--   (c) at click-time returns a "link_used"/"otp_expired" error if
--   they re-click an already-consumed link. None of those paths
--   surface the canonical "you're suspended for N minutes" toast.
--
--   This RPC is the missing link: callable from anon, reads
--   auth.users.banned_until directly, returns is_banned + the
--   absolute banned_until timestamp. The frontend calls it AFTER
--   email_status; if is_banned, it shows the live-duration toast
--   ("Your account is suspended for the next 47 minutes") and
--   refuses to send a link. Every retry sees the latest state.
--
-- Enumeration risk: marginal. email_status() already leaks "this
-- email is registered" + "with which providers" — adding "+ banned"
-- is a small extension and the threat model (free CV builder, no
-- payment data) accepts it. The ban itself is not a secret; the
-- user receiving the toast IS the banned user.
--
-- Rollback: drop function if exists public.email_ban_status(text);

create or replace function public.email_ban_status(check_email text)
returns table (
  is_banned boolean,
  banned_until timestamptz
)
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  if check_email is null or length(trim(check_email)) = 0 then
    return query select false, null::timestamptz;
    return;
  end if;
  return query
    select
      coalesce(u.banned_until is not null and u.banned_until > now(), false),
      case when u.banned_until is not null and u.banned_until > now()
           then u.banned_until
           else null end
    from auth.users u
    where lower(u.email) = lower(trim(check_email))
    limit 1;
  -- No row → unregistered email. Return non-banned default so the
  -- caller's "no account" path still fires from email_status; this
  -- RPC's job is solely "is the matching account banned?".
  if not found then
    return query select false, null::timestamptz;
  end if;
end;
$$;

comment on function public.email_ban_status(text) is
  'Anon-callable: returns whether the auth.users row matching this email '
  'is currently banned, along with the absolute banned_until timestamp '
  'when banned. Used by /login + /signup to refuse magic-link sends to '
  'banned users and surface the live remaining-time toast instead of '
  'letting the user keep firing dead-end attempts.';

revoke all on function public.email_ban_status(text) from public;
grant execute on function public.email_ban_status(text) to anon, authenticated;
