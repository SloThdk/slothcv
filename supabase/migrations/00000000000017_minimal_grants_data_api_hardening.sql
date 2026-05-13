-- Migration 0017: Minimal-GRANT hardening for the Data API role surface.
--
-- WHY this exists
-- ────────────────
-- Supabase is changing its default behaviour on 30 October 2026: new tables
-- created in `public` will NO longer auto-grant access to the `anon` and
-- `authenticated` roles. The breaking change does not retroactively REVOKE
-- existing grants — every table created before this migration was given the
-- legacy permissive default:
--
--     anon            -> DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
--     authenticated   -> DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
--     service_role    -> DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
--
-- That is wildly broader than what SlothCV code actually exercises. Right now
-- the ONLY layer stopping an `anon` visitor from `DELETE FROM resumes` is the
-- per-table RLS policy. RLS is excellent, but it's a single layer. GRANT-level
-- least-privilege is defense in depth.
--
-- WHAT this migration does
-- ────────────────────────
-- For each of the 3 tables in `public` (profiles, resumes, session_revocations):
--   1. REVOKE ALL from `anon` and `authenticated` to start from a clean slate.
--   2. GRANT back only the minimum each role actually exercises, based on a
--      code-usage audit of every `.from()` and `.rpc()` call.
--   3. Keep `service_role` at full ALL (god-key, RLS bypass — unchanged).
--
-- The audit found:
--   - NO table needs any `anon` grant. Email-existence checks flow through the
--     SECURITY DEFINER `email_status(text)` RPC. Account creation flows through
--     the `handle_new_user` SECURITY DEFINER trigger that fires on auth.users
--     insert. There is no direct table access from an unauthenticated browser.
--   - `authenticated` needs SELECT + UPDATE on `profiles` (own row, RLS-scoped),
--     full CRUD on `resumes` (own rows, RLS-scoped), and SELECT on
--     `session_revocations` (Realtime subscribe to own revocation row).
--   - All admin/sensitive writes (`delete_account`, `broadcast_user_revocation`)
--     go through SECURITY DEFINER RPCs, so neither role needs DELETE on those
--     directly.
--
-- HOW to validate post-deploy
-- ───────────────────────────
-- 1. Signup flow: `/signup` -> email_status RPC (anon) -> magic-link arrives ->
--    click -> /resumes loads with profile pre-populated.
-- 2. Login flow: `/login` -> email_status -> magic-link OR Google OAuth ->
--    /resumes loads.
-- 3. Resume CRUD: create new resume, edit, save, delete — all must work.
-- 4. Profile update: change name/email in /profile and save.
-- 5. Session revocation: sign out from another tab -> active tab should detect
--    the revocation via Realtime within ~2 seconds and redirect to /login.
--
-- ROLLBACK plan
-- ─────────────
-- If something breaks in prod that the audit missed, re-grant ALL on the
-- affected table:
--     grant all on public.<table> to anon, authenticated;
-- This restores legacy permissive default for that one table while we
-- investigate. Better than reverting the whole migration.

begin;

-- ────────────────────────────────────────────────────────────────────────
-- Step 1 — clean slate. Revoke every privilege from anon + authenticated on
-- every public table. service_role keeps its god-key access (re-asserted below).
-- ────────────────────────────────────────────────────────────────────────

revoke all on public.profiles             from anon, authenticated;
revoke all on public.resumes              from anon, authenticated;
revoke all on public.session_revocations  from anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────
-- Step 2 — grant the minimum each role actually needs.
--
-- anon : NOTHING. All anon flows route through SECURITY DEFINER RPCs:
--          email_status(text)    -> already granted EXECUTE to anon (mig 0010)
--          email_exists(text)    -> legacy, EXECUTE granted to anon (mig 0007)
--          handle_new_user()     -> trigger on auth.users, no caller GRANT needed
-- ────────────────────────────────────────────────────────────────────────

-- profiles: user reads own row, updates own row. RLS gates by user_id = auth.uid().
-- INSERT happens via handle_new_user trigger (SECURITY DEFINER, owner-run).
-- DELETE happens via delete_account RPC (SECURITY DEFINER) — granted EXECUTE to
-- authenticated separately. So authenticated only needs SELECT + UPDATE here.
grant select, update on public.profiles to authenticated;

-- resumes: user has full CRUD over their own resumes. RLS gates every row by
-- user_id = auth.uid(). All four privileges are exercised by src/lib/resumes.ts.
grant select, insert, update, delete on public.resumes to authenticated;

-- session_revocations: user subscribes via Realtime to own-row revocations to
-- detect "another tab signed out." Writes happen via broadcast_user_revocation
-- RPC (SECURITY DEFINER). Realtime requires SELECT on the table for the role
-- to receive change notifications, even if RLS hides other users' rows.
grant select on public.session_revocations to authenticated;

-- ────────────────────────────────────────────────────────────────────────
-- Step 3 — service_role keeps full god-key access. Re-granted idempotently
-- so a future migration that accidentally revokes ALL doesn't break workers.
-- ────────────────────────────────────────────────────────────────────────

grant all on public.profiles             to service_role;
grant all on public.resumes              to service_role;
grant all on public.session_revocations  to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- Step 4 — default privileges for FUTURE tables.
--
-- ALTER DEFAULT PRIVILEGES sets the grants applied automatically when a NEW
-- table is created by the migration role. We set sensible defaults so that
-- any forgotten GRANT block in a future migration doesn't accidentally
-- re-expose a fresh table to anon / authenticated.
--
-- Future tables created by postgres in schema public will default to:
--   - service_role: ALL  (workers never lose access by accident)
--   - anon, authenticated: NOTHING  (must be granted explicitly per table)
-- ────────────────────────────────────────────────────────────────────────

alter default privileges in schema public
    grant all on tables to service_role;

alter default privileges in schema public
    revoke all on tables from anon, authenticated;

commit;
