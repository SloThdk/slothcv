-- ============================================================================
-- slothcv — fix delete_account() so it doesn't try to delete from storage.objects.
--
-- Migration 0003 had `delete from storage.objects` inside the SECURITY DEFINER
-- function as a "best-effort" cleanup. Supabase guards against this:
--   ERROR: 42501 — Direct deletion from storage tables is not allowed.
--   HINT: Use the Storage API instead.
--
-- The client already purges the user's avatars/<uid>/ folder via the Storage
-- API before calling delete_account (`removeAvatar()` → `delete_account()`).
-- That's the supported path. The RPC only needs to nuke the auth.users row,
-- which cascades through profiles + resumes via the existing FKs.
--
-- This migration replaces the function body in place. The trigger
-- registration is unaffected (no trigger on this function).
-- ============================================================================

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Cascade-deletes profiles + resumes via FK ON DELETE CASCADE.
  -- Avatar files in `avatars/<uid>/` MUST be purged by the client first via
  -- the Storage API — direct deletes from storage.objects are blocked by
  -- Supabase's policies.
  delete from auth.users where id = uid;
end;
$$;

-- Permission grants are idempotent — re-issuing them is a no-op if they
-- were already in place from migration 0003.
revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
