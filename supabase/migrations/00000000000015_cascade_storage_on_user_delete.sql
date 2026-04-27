-- 0015 — purge user's storage objects when their auth.users row is deleted
--
-- THE GAP THIS CLOSES:
--   FK ON DELETE CASCADE handles:
--     auth.identities, auth.sessions, auth.mfa_factors, auth.one_time_tokens,
--     auth.oauth_*, auth.webauthn_*, public.profiles, public.resumes
--   That's everything in Postgres tied to a user.
--
--   But storage.objects (the metadata for avatar files at avatars/<uid>/<filename>)
--   has no FK to auth.users — it can't, because Supabase Storage owns that
--   table. So if you delete a user via Studio (Authentication → Users → Delete),
--   their avatar metadata + S3 file linger.
--
--   The in-app /account → "Delete account" flow purges storage explicitly
--   from the client BEFORE calling delete_account() RPC, so it's clean for
--   that path. This trigger covers the OTHER paths: Studio dashboard,
--   admin API, raw SQL.
--
-- HOW IT WORKS:
--   BEFORE DELETE on auth.users → SECURITY DEFINER function deletes every
--   storage.objects row whose `name` starts with <uid>/ across all buckets.
--   Supabase Storage's S3 reconciler drops the actual blob asynchronously
--   when its metadata row is removed.
--
-- WHY BEFORE (not AFTER):
--   AFTER DELETE has limited access to OLD/NEW context for cascading FK
--   triggers. BEFORE DELETE fires before the FK cascade chain unwinds and
--   reliably has OLD.id available. Doing the storage cleanup before the
--   user row is gone also means if the trigger fails, the whole delete
--   transaction rolls back — atomic semantics.
--
-- WHY SECURITY DEFINER:
--   storage.objects has RLS that blocks unprivileged DELETE. Running this
--   trigger function as the supabase_admin/owner role (via DEFINER)
--   bypasses RLS for this specific cleanup operation. The function only
--   ever deletes rows under the deleted user's UUID prefix, so there's
--   no privilege-escalation surface.

create or replace function public.purge_user_storage_on_delete()
returns trigger
language plpgsql
security definer
set search_path = storage, public, pg_temp
as $$
begin
  delete from storage.objects
  where name like (old.id::text || '/%');
  return old;
end;
$$;

revoke execute on function public.purge_user_storage_on_delete() from public, anon, authenticated;

drop trigger if exists purge_user_storage on auth.users;
create trigger purge_user_storage
  before delete on auth.users
  for each row
  execute function public.purge_user_storage_on_delete();

comment on function public.purge_user_storage_on_delete() is
  'Trigger function fired BEFORE DELETE on auth.users. Removes every '
  'storage.objects row owned by the user being deleted (any bucket, '
  'rows whose name starts with <uid>/). Closes the storage-cleanup gap '
  'that the FK ON DELETE CASCADE chain doesn''t cover. SECURITY DEFINER '
  'because storage.objects RLS blocks unprivileged deletes; scoped '
  'strictly to the deleted user''s UUID prefix for safety.';
