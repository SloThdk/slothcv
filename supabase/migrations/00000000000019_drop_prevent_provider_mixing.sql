-- 0019 — drop the strict-provider-separation trigger from Phase 2.7 (migration 0009).
--
-- Reverts auth.identities to Supabase's default behaviour: a verified email
-- from a new OAuth provider auto-links onto the existing auth.users row.
-- For SlothCV's threat model (free CV builder, no payment data) the friction
-- of strict separation outweighed its security benefit — magic-link users
-- who later clicked "Continue with Google" were blocked at the callback
-- with a generic error and no recovery path.
--
-- Post-drop behaviour:
--   · Magic-link user clicks "Continue with Google" with the same email →
--     Google identity auto-links, user is signed in as the existing row.
--   · Google user types email at /login → magic-link flow still adds an
--     email identity to the existing row (frontend block in LoginForm
--     stays in place as a soft hint, but the trigger is no longer the
--     hard gate).
--
-- Already-linked users from before this drop are unaffected — the trigger
-- was INSERT-only and never touched existing rows.

drop trigger if exists prevent_provider_mixing_trigger on auth.identities;
drop function if exists public.prevent_provider_mixing();
