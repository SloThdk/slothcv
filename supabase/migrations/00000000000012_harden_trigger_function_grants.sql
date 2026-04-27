-- 0012 — security hardening: lock down trigger-only functions
--
-- Why this exists:
--   Supabase's security advisor flags every SECURITY DEFINER function
--   in `public` that's callable by `anon` or `authenticated`. Some of
--   ours (email_status, email_exists, delete_account) ARE meant to be
--   public RPCs and stay exposed. But others — handle_new_user,
--   prevent_provider_mixing, enforce_resume_count_limit, touch_updated_at —
--   are TRIGGER-only functions. Postgres doesn't enforce trigger-only
--   semantics at the grant level by default, so any client could call
--   `/rest/v1/rpc/handle_new_user` (which would either error harmlessly
--   or, worse, run with the trigger's elevated privileges in unexpected
--   contexts). Revoking EXECUTE from anon + authenticated keeps these
--   purely callable BY THE TRIGGER (which runs as `supabase_admin`/owner)
--   and removes them from the public REST surface.
--
--   Also fixes touch_updated_at's mutable search_path warning by
--   setting `search_path = public, pg_temp` explicitly — best practice
--   for SECURITY DEFINER funcs to avoid trojan-horse `pg_catalog`
--   shadowing attacks.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_provider_mixing() from public, anon, authenticated;
revoke execute on function public.enforce_resume_count_limit() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

do $$
begin
  alter function public.touch_updated_at() set search_path = public, pg_temp;
exception when undefined_function then
  null;
end $$;
