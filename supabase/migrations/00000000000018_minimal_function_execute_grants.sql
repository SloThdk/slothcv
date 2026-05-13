-- Migration 0018: Lock function EXECUTE grants to least-privilege.
--
-- WHY this exists
-- ────────────────
-- Migration 0017 closed the table-level surface. This one closes the function
-- surface. Every user-defined SECURITY DEFINER function in `public` was
-- EXECUTE'able by `anon` AND `authenticated` by default. For functions whose
-- only legitimate caller is the database itself (triggers) or that have no
-- caller at all, that's surface area that does nothing for us and could be
-- abused by anyone with the anon key.
--
-- WHAT this migration does
-- ────────────────────────
-- Per a code-usage audit of every `.rpc()` call in `src/` and `functions/`:
--
-- KEEP — browser-callable functions
--   email_status(text)            anon + auth   — login email-existence probe
--   delete_account()              auth only     — /profile delete button (src/lib/profile.ts)
--
-- REVOKE — no legitimate caller
--   broadcast_user_revocation()   — table exists, function exists, but ZERO
--                                   code paths call it. Documented in
--                                   src/lib/auth-context.tsx as future v0.5
--                                   work. Until a real caller exists, no role
--                                   needs EXECUTE.
--   email_exists(text)            — legacy from migration 0007. Superseded by
--                                   email_status(). No `.rpc("email_exists")`
--                                   calls anywhere — only error-message string
--                                   matching in auth-errors.ts. Safe to revoke.
--
-- TRIGGER FUNCTIONS — never RPC'd
--   enforce_resume_count_limit, handle_new_user, prevent_provider_mixing,
--   purge_user_storage_on_delete, sync_profile_email_on_update, touch_updated_at
--   These already have no anon/authenticated grants (Supabase doesn't auto-grant
--   trigger functions). No-op here; documenting for future maintainers.
--
-- service_role keeps EXECUTE on everything (re-granted explicitly).
--
-- HOW to validate post-deploy
-- ───────────────────────────
-- 1. Login flow: type email on /login -> email_status check fires -> magic-link
--    arrives. Same for /signup.
-- 2. Account deletion: /profile -> Delete Account -> delete_account succeeds.
-- 3. Resume CRUD: create / edit / delete a resume — RLS-only path, no function
--    grants involved.
--
-- ROLLBACK plan
-- ─────────────
-- If something breaks with "permission denied for function":
--     grant execute on function public.<name>(<args>) to anon, authenticated;
-- Re-grants the specific function. Migration is transactional so partial
-- rollback is fine.

begin;

-- ────────────────────────────────────────────────────────────────────────
-- REVOKE — functions with no legitimate caller
-- ────────────────────────────────────────────────────────────────────────

revoke execute on function public.broadcast_user_revocation()   from anon, authenticated;
revoke execute on function public.email_exists(text)            from anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────
-- REVOKE anon — authenticated-only RPCs
-- ────────────────────────────────────────────────────────────────────────

-- delete_account: called from /profile while authenticated (src/lib/profile.ts:398).
-- anon has no legitimate use.
revoke execute on function public.delete_account()              from anon;

-- ────────────────────────────────────────────────────────────────────────
-- KEEP — email_status is the anon login-flow primitive
-- ────────────────────────────────────────────────────────────────────────
-- (no-op block — documenting intent)

-- ────────────────────────────────────────────────────────────────────────
-- Re-grant EXECUTE to service_role on every public function for safety.
-- ────────────────────────────────────────────────────────────────────────

grant execute on function public.broadcast_user_revocation()    to service_role;
grant execute on function public.delete_account()               to service_role;
grant execute on function public.email_exists(text)             to service_role;
grant execute on function public.email_status(text)             to service_role;
grant execute on function public.enforce_resume_count_limit()   to service_role;
grant execute on function public.handle_new_user()              to service_role;
grant execute on function public.prevent_provider_mixing()      to service_role;
grant execute on function public.purge_user_storage_on_delete() to service_role;
grant execute on function public.sync_profile_email_on_update() to service_role;
grant execute on function public.touch_updated_at()             to service_role;

-- ────────────────────────────────────────────────────────────────────────
-- Default privileges for FUTURE functions. Any new function in schema public
-- created by the postgres migration role defaults to service_role-only EXECUTE.
-- anon / authenticated need explicit per-function GRANT.
-- ────────────────────────────────────────────────────────────────────────

alter default privileges in schema public
    revoke execute on functions from anon, authenticated;

alter default privileges in schema public
    grant execute on functions to service_role;

commit;
