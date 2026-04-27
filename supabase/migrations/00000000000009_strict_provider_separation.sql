-- 0009 — strict provider separation: reject auto-linking via auth.identities trigger
--
-- Why this exists:
--   Phase 2.6 wired strict provider separation on the FRONTEND via the
--   email_status RPC: /signup and /login both block before sending a magic
--   link if the email belongs to a different-provider account.
--
--   That covers two of the three directions:
--     ✓ existing-Google email typed into /signup magic-link → frontend blocks
--     ✓ existing-Google email typed into /login magic-link → frontend blocks
--     ✗ existing-magic-link email used via "Continue with Google" → AUTO-LINKS
--
--   The third direction is NOT catchable in the frontend — when the user
--   clicks the Google button, no email is typed yet for the RPC to check.
--   Supabase intercepts the OAuth callback, sees the verified email matches
--   an existing user, and SILENTLY inserts a new row in auth.identities
--   linking the Google identity to the existing user. The user is then
--   signed in via the wrong provider.
--
--   Historically Supabase had a project-wide dashboard toggle "Allow same
--   email at multiple identities" controlling this behaviour. As of 2026
--   that toggle no longer exists in the hosted dashboard or the Management
--   API (only "Allow manual linking" remains, which controls the unrelated
--   linkIdentity() API). The Before User Created hook only fires when a NEW
--   auth.users row would be created — auto-link reuses the existing row,
--   so the hook never fires for this flow.
--
--   The remaining lever is a trigger on auth.identities. Supabase docs
--   discourage triggers on the auth schema because column shapes "may
--   change", but the columns this trigger reads (user_id, provider) are
--   the two oldest, most stable columns in the schema — they're how
--   GoTrue itself queries identities. Risk is acceptable; reward (closing
--   the third direction) is large.
--
-- Behaviour after this migration:
--
--   ┌────────────────────────────────────────┬──────────────────────────────┐
--   │ Scenario                               │ Outcome                       │
--   ├────────────────────────────────────────┼──────────────────────────────┤
--   │ New user, first identity (any provider)│ INSERT proceeds (allow)       │
--   │ Same provider re-inserts for same user │ INSERT proceeds (idempotent)  │
--   │ New provider added to existing user    │ EXCEPTION → GoTrue rejects    │
--   │   (e.g. Google on top of magic-link)   │   with `identity_already_… ` │
--   └────────────────────────────────────────┴──────────────────────────────┘
--
--   The exception message contains BOTH "identity already exists" (matches
--   the existing /auth/callback substring check) AND "account_exists_other_
--   method" (the canonical short code we already map to a translation key
--   on the LoginForm side). The substring check at src/app/auth/callback/
--   page.tsx already routes these to /login?error=account_exists_other_method
--   which renders login.errAccountExistsOtherMethod from translations.
--
-- Rollback: `drop trigger prevent_provider_mixing_trigger on auth.identities;
-- drop function public.prevent_provider_mixing();`

create or replace function public.prevent_provider_mixing()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  -- Allow if: this is the first identity for the user (no rows in identities
  -- with this user_id) OR an identity with the same provider already exists
  -- (idempotent re-insert from a re-run OAuth callback / re-sent magic link).
  --
  -- Reject if: the user already has at least one identity with a DIFFERENT
  -- provider. That's the auto-link case slothcv wants to refuse — every email
  -- is locked to the method that created the account.
  if exists (
    select 1 from auth.identities
    where user_id = NEW.user_id
      and provider <> NEW.provider
  ) then
    raise exception
      'identity already exists: this email is registered via another '
      'sign-in method (account_exists_other_method)'
      using errcode = '23505';
  end if;

  return NEW;
end;
$$;

comment on function public.prevent_provider_mixing() is
  'Trigger function for auth.identities BEFORE INSERT. Rejects auto-linking '
  'a new identity provider onto an existing user that has a different '
  'provider already. Implements strict provider separation: every email is '
  'locked to its first-used auth method. See migration 0009 for full context.';

drop trigger if exists prevent_provider_mixing_trigger on auth.identities;

create trigger prevent_provider_mixing_trigger
before insert on auth.identities
for each row execute function public.prevent_provider_mixing();
