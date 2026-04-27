-- 0016 — make purge_user_storage_on_delete tolerate storage.protect_delete
--
-- THE BUG THIS FIXES:
--   Migration 0015 wired a BEFORE DELETE trigger on auth.users that calls
--   `delete from storage.objects where name like (uid || '/%')`. Newer
--   Supabase Storage installs a constraint trigger
--   `storage.protect_delete` (BEFORE DELETE FOR EACH STATEMENT) on
--   storage.objects that rejects ANY direct DELETE statement with
--   "Direct deletion from storage tables is not allowed" (SQLSTATE 42501)
--   — even when the WHERE matches zero rows, because statement-level
--   triggers fire once per statement regardless of row count.
--
--   Result: every Studio-initiated user delete returned HTTP 500 with
--   error_code=unexpected_failure, even for users with no avatars.
--
-- THE FIX:
--   Wrap the storage delete in EXCEPTION ... WHEN OTHERS so the auth.users
--   delete still succeeds. Trade-off: Studio-initiated deletes will leak
--   storage.objects rows for users who DID have avatars (the in-app
--   /account → "Delete account" RPC still purges storage explicitly via
--   the Storage REST API before calling delete_account, so the in-app
--   path stays clean). For Studio leaks, run the periodic cleanup query
--   in the comment at the bottom of this file.
--
-- WHY NOT JUST DROP THE TRIGGER:
--   Self-hosted Supabase or older versions don't have protect_delete and
--   the original behavior is correct there. Keeping the attempt + swallow
--   is the most portable shape.

create or replace function public.purge_user_storage_on_delete()
returns trigger
language plpgsql
security definer
set search_path = storage, public, pg_temp
as $$
begin
  -- Best-effort. If storage.protect_delete (or any future guard)
  -- rejects the statement, we log and move on so the auth.users
  -- delete still goes through.
  begin
    delete from storage.objects
    where name like (old.id::text || '/%');
  exception
    when others then
      raise notice
        'purge_user_storage_on_delete: storage cleanup skipped for user % (%)',
        old.id, sqlerrm;
  end;
  return old;
end;
$$;

-- Re-grant — `create or replace function` keeps existing privileges, but
-- being explicit guards against drift from manual changes.
revoke execute on function public.purge_user_storage_on_delete()
  from public, anon, authenticated;

comment on function public.purge_user_storage_on_delete() is
  'BEFORE DELETE on auth.users — best-effort cleanup of '
  'storage.objects rows under <uid>/. Wrapped in EXCEPTION so a '
  'storage.protect_delete guard does not 500 the user delete. The '
  'in-app delete_account() RPC purges storage via the REST API '
  'before this trigger fires so the in-app path is clean; this '
  'covers Studio + admin API deletes on best-effort terms.';

-- ---------------------------------------------------------------------------
-- Periodic cleanup query for Studio-leaked storage rows (run manually):
--
--   delete from storage.objects o
--   where bucket_id = 'avatars'
--     and not exists (
--       select 1 from auth.users u
--       where u.id::text = (storage.foldername(o.name))[1]
--     );
--
-- This DELETE will be rejected by storage.protect_delete on managed
-- Supabase too — run it through the Storage REST API instead, e.g. via
-- a worker that lists orphaned UIDs and calls DELETE /object/<bucket>/<path>.
-- ---------------------------------------------------------------------------
