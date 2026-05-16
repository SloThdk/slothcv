-- 0020 — restore the strict-provider-separation trigger dropped in 0019.
--
-- 0019 was based on a misread of Philip's request. He said the rule
-- ("magic-link account can't continue with Google") was being violated
-- by silent auto-linking, and that was annoying. I read "remove this"
-- as "remove the rule" and dropped the trigger — but the intent was
-- "remove the auto-linking violation, keep the rule." Reverting.
--
-- The rule + behaviour matrix is unchanged from the original 0009:
--
--   ┌────────────────────────────────────────┬──────────────────────────────┐
--   │ Scenario                               │ Outcome                       │
--   ├────────────────────────────────────────┼──────────────────────────────┤
--   │ New user, first identity (any provider)│ INSERT proceeds (allow)       │
--   │ Same provider re-inserts for same user │ INSERT proceeds (idempotent)  │
--   │ New provider added to existing user    │ EXCEPTION → GoTrue rejects    │
--   │   (e.g. Google on top of magic-link)   │   with `identity_already_…`   │
--   └────────────────────────────────────────┴──────────────────────────────┘
--
-- The exception message contains "identity already exists" + the literal
-- short code "account_exists_other_method" so the existing wide-net
-- substring matchers at /auth/callback and /auth/google/finalize route
-- the failure to the friendly toast — no frontend changes required.
--
-- Already-linked dual-identity users (created during the 0019 window or
-- earlier with auto-link enabled) are unaffected — this is an INSERT
-- trigger only. Clean up the leftover identity manually if needed:
--   DELETE FROM auth.identities WHERE user_id = '<uid>' AND provider = '<provider>';

create or replace function public.prevent_provider_mixing()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
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
  'locked to the method that created the account. Re-applied in 0020 after '
  '0019 reverted it on a misread of the original intent.';

drop trigger if exists prevent_provider_mixing_trigger on auth.identities;

create trigger prevent_provider_mixing_trigger
before insert on auth.identities
for each row execute function public.prevent_provider_mixing();
