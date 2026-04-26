# slothcv auth changes — review report

Scope: `/signup` flow, `/login` strict mode, `/auth/callback` error mapping, `auth-errors.ts`, magic-link template, migration 0005.
Reviewer: cold pass, no writer-bias.

`npm run typecheck` and `npm run lint` were run. The typecheck error and the 8 lint errors all live in `src/templates/`, `src/components/editor/`, `src/app/editor/page.tsx`, and `src/lib/theme/` — **none in the auth diff**. The auth code is type-clean.

---

## Critical (security / data loss / blocks ship)

### C1. `getUser()`-then-`exchangeCodeForSession()` lets user B sign in as user A on shared browser
**File:** `src/app/auth/callback/page.tsx:73-81`

```ts
const { data: { user: existing } } = await supabase.auth.getUser();
if (existing) {
  setMessage("Already signed in. Redirecting…");
  router.replace(safeNext);
  return;        // <-- code never consumed, user A's session kept
}
```

Scenario: Alice is signed in on a shared laptop. Bob requests a magic link to *his* email, opens it on the same browser. The callback sees `existing=Alice`, skips the exchange, and redirects to `/dashboard`. Bob now thinks he's signed in but is silently using Alice's session. Any CV he creates / avatar he uploads / account he deletes is on Alice's account.

This is both a correctness bug and an account-takeover-by-confusion vector (or an insider-attack vector — Alice deliberately stays signed in, hands the laptop to a "sign up real quick" friend, and pockets their session activity).

**Fix:** when `existing` is non-null AND a `code` is present, sign Alice out first, then exchange. Or refuse with an explicit "you're already signed in as alice@x — sign out to use this link" page rather than auto-redirecting. The current "skip the exchange because there's a session" branch should only apply when there's no `?code=` (a stale callback re-load).

### C2. `decodeURIComponent()` on raw search-param string can throw and break the toast pipeline
**File:** `src/app/login/LoginForm.tsx:55` and `src/app/signup/SignupForm.tsx:105`

```ts
const raw = decodeURIComponent(queryError);
```

`useSearchParams().get()` already URI-decodes. This second `decodeURIComponent` is unnecessary AND dangerous: a URL like `/login?error=%` (single percent — easy to land on if someone mangles the URL) makes `decodeURIComponent("%")` throw `URIError: URI malformed` inside the `useEffect`. The toast never fires; the user sees a blank /login with no idea what failed.

Worse, the same input goes through `callbackErrorTranslationKey(raw)` which now sees a partially-corrupted code.

**Fix:** drop `decodeURIComponent` entirely (`useSearchParams` already decoded). Wrap the lookup in a defensive try/catch if you want belt-and-suspenders, but the real fix is to not double-decode.

### C3. Substring-based error matching ignores Supabase's typed `error.code`
**File:** `src/lib/auth-errors.ts:43-77` and `src/app/auth/callback/page.tsx:100-117`

`@supabase/auth-js` since 2.4x exposes `AuthError.code: ErrorCode` — a closed enum that includes `signup_disabled`, `user_not_found`, `over_email_send_rate_limit`, `email_address_invalid`, `bad_code_verifier`, `otp_expired`, `otp_disabled`, `email_exists`, `identity_already_exists`, etc. (verified against `node_modules/@supabase/auth-js/src/lib/error-codes.ts` lines 6-90 in this repo). Substring-matching the human-readable message is what the SDK explicitly tells you NOT to do — they call out that the message strings are unstable.

Concrete failure cases this introduces:

- `m.includes("invalid")` in callback line 112 catches `invalid_credentials`, `invalid_grant`, `validation_failed`, the literal "invalid request: …" PKCE message, and even `email_address_invalid`. All become `link_used`. So a user who clicks a perfectly valid link from the wrong browser ends up reading "That sign-in link has already been used" — false. (Mitigated only because the prior `verifier`/`pkce` branch wins for the PKCE-specific message; everything else still misroutes.)
- `m.includes("signups not allowed")` is a 1.x-era phrasing. Newer GoTrue builds increasingly return generic copy plus the typed `signup_disabled` code; future Supabase upgrades silently break the probe pattern in `SignupForm` (the `kind === "user_not_found"` fall-through never fires → users never get past the probe).
- `m.includes("expired")` catches `flow_state_expired`, `session_expired`, `mfa_challenge_expired`. Mostly inert today, latent footgun.

**Fix:** classify on `error.code` first, fall through to substring matching only when `error.code` is undefined (older self-hosted GoTrue). One switch on `code` covers `user_not_found`, `signup_disabled`, `otp_disabled`, `over_email_send_rate_limit`, `over_request_rate_limit`, `email_address_invalid`, `bad_code_verifier`, `otp_expired`, `email_exists`, `identity_already_exists` cleanly. The substring matcher stays as fallback.

---

## Important (will hit users in normal use)

### I1. SignupForm probe burns the user's email rate-limit budget
**File:** `src/app/signup/SignupForm.tsx:144-194`

Every signup submission makes TWO `signInWithOtp` calls against the same email: probe + real. Supabase's default `over_email_send_rate_limit` is 4/hour per address. So the user effectively has 2 signup attempts per hour before the second call gets `over_email_send_rate_limit`d and the user sees a "rate limited" toast even though they only "tried" twice from their perspective. They had no idea the form was making 2 calls per submit.

There's a worse case: if the probe call gets the rate-limit error (lines 160-164), the form aborts immediately. So a user already at the cap (e.g. they did 4 logins this hour, then visit /signup) can't even attempt to sign up — the probe fails first, and they get a generic "too many attempts" error that doesn't explain they're hitting an *email-send* limit specifically.

**Fix options (pick one):**
- Issue the real signup-with-data call FIRST, then on the specific `email_exists` / `identity_already_exists` codes (these are real Supabase codes!) show the existing-account UI without ever needing a probe. This is the supported, non-probe path and uses 1 email-send per attempt.
- Keep the probe but cache the result for 5 minutes per (email, browser) so retries don't double-bill the budget.

### I2. `existingAccount=true` UI lies about what just happened
**File:** `src/app/signup/SignupForm.tsx:243-266` + i18n keys `signup.existingAccountTitle`, `signup.existingAccountBody`

The copy says "An account already exists … We also sent a magic link to your inbox — you can use that to sign in." But the magic link the probe sent has `emailRedirectTo` pointing at `/auth/callback?next=/dashboard`. When the user clicks it, the PKCE verifier was stored under THIS form's `signInWithOtp` call. If they click it from a different device (Gmail mobile app webview, work laptop), they hit `bad_code_verifier` → "Open the sign-in link in the same browser you started in." Confusing because the user did NOT initiate a sign-in here, they tried to sign UP.

The "use that to sign in" promise is a 50/50 — honored only if the same browser opens the link.

**Fix:** either (a) drop the "we also sent a magic link" line and tell them to go to /login, (b) probe with `emailRedirectTo` left null (no link sent — but Supabase still might) so the UI doesn't promise something it can't deliver reliably, or (c) explicitly call `supabase.auth.signOut()` then surface a single CTA "Send a fresh sign-in link" on /login.

### I3. Toast re-fires on language switch when `?error=...` is in URL
**File:** `src/app/login/LoginForm.tsx:53-58` and `src/app/signup/SignupForm.tsx:103-108`

```ts
useEffect(() => {
  if (!error) return;
  ...
  toast.error(t(key));
}, [error, t]);
```

`t` is recreated by `LanguageContext` every time `lang` changes. So a user who lands on `/login?error=link_expired` and clicks the EN/DA toggle gets a duplicate toast in the new language. Annoying, not dangerous.

**Fix:** strip the `error` query param from the URL after handling it (`router.replace("/login")`), or move the toast into a ref-guarded once-per-mount pattern.

### I4. "Sent" view has no escape hatch — if the email was typo'd, user is stuck
**File:** `src/app/login/LoginForm.tsx:134-137` and `src/app/signup/SignupForm.tsx:267-270`

```tsx
{sent ? (
  <div ...>
    {t("login.linkSentTo")} <strong>{email}</strong>. {t("login.linkSentBody")}
  </div>
) : ( ... )}
```

Once `sent=true`, there's no button to "go back / change email / resend." The user must reload the page. If they typed `philpisloth@gmail.com` (typo), they'll wait for an email that never arrives (or arrives at someone else's inbox — see C1's cousin), then have to figure out reload.

**Fix:** show the email AND a "wrong email? Try again" button that resets `sent`, `email`, `firstName`, `lastName` back to inputs. Also add a "Resend" button that re-sends after a 60-second cooldown.

### I5. Google sign-in path on /signup discards the typed first/last name
**File:** `src/app/signup/SignupForm.tsx:214-226` (`handleGoogle`)

The user types "Philip" / "Sloth" → clicks "Continue with Google". Their typed names are silently discarded; the resulting profile uses Google's `full_name`. If Google's name is "P. Sloth" (initial only) and they wanted "Philip Sloth", they'll need to fix it on the account page later. Minor but a real UX smell — at minimum show a hint, ideally pre-fill from typed name into Google `login_hint` parameter.

**Fix:** disable the Google button until firstName/lastName are blank OR are the same as Google's response — or pass `login_hint=email` so Google pre-selects the right account. Cheapest fix: add a "Using Google overrides the name above" hint near the button.

### I6. Probe can race-create a user via Supabase's `+alias` quirk
**File:** `src/app/signup/SignupForm.tsx:144-194`

There's a documented Supabase bug ([supabase#39254](https://github.com/supabase/supabase/issues/39254)) where `signInWithOtp({email: "phil+test@gmail.com", shouldCreateUser: false})` STILL creates a new user if the base form (`phil@gmail.com`) doesn't exist. So the "probe" can create an account behind the user's back (without name metadata, since the probe call doesn't pass `data`). The form then proceeds to step 2 thinking it's a fresh signup, sends another magic link, and the trigger has already fired without `full_name` → display_name = email-local-part.

**Fix:** the most defensible mitigation is the same as I1 — drop the probe, call signup-with-data first, branch on `email_exists` / `identity_already_exists` codes. That bug is in the probe path; the no-probe path is unaffected.

### I7. The probe pattern is a confirmed user-enumeration vector — disclose, don't bury
**File:** `src/app/signup/SignupForm.tsx:18-36` (doc) — and the actual probe at line 144

The doc says "The link goes to their own verified email — no privacy leak." That's the *email-sending* leak. The bigger leak is the **API response itself**: an attacker scripting `POST /auth/v1/otp` with `create_user=false` can enumerate which emails are registered (Supabase issue [#1547](https://github.com/supabase/auth/issues/1547), [#1955](https://github.com/supabase/auth/issues/1955), [#30752](https://github.com/supabase/supabase/issues/30752)). On a public, link-shareable signup page with no Turnstile in front of it, a bot can dump the entire user list of slothcv given enough requests.

This isn't unique to this PR — but the PR is the first time the workspace's CLAUDE.md "security-first / Turnstile on every public state-changing endpoint" rule is being violated by a flow that goes live.

**Fix:** either (a) accept the leak explicitly in the doc comment (call it what it is — "this leaks account existence to anyone who can hit /signup; we accept it because a Turnstile gate is on the roadmap") and put Turnstile on /signup before launch, (b) drop the probe per I1/I6 and let `email_exists` carry the same UX without the bulk-enumeration vector, OR (c) put a Turnstile challenge on the form so scripted enumeration costs the attacker a fresh CAPTCHA per email.

### I8. `maxLength` on names is browser-only — full_name can be unbounded over scripted POST
**File:** `src/app/signup/SignupForm.tsx:287, 300`

`maxLength={40}` is HTML attribute enforcement only. A scripted POST can send `full_name` of any size, which Supabase happily writes to `raw_user_meta_data`, the trigger writes to `profiles.display_name` (TEXT, no cap), and the site renders it as `<Avatar name={display_name}>`. Even though React escapes it (no XSS), a 1 MB display_name causes UI breakage and bloats every profile fetch.

**Fix:** add a SQL CHECK constraint on `profiles.display_name` (e.g. `length(coalesce(display_name, '')) <= 80`) and a server-side validate inside `handle_new_user` that truncates `meta_name` to a sane cap. Cheapest version: `meta_name := substring(meta_name from 1 for 80)` in the trigger.

---

## Minor (polish, drift, hypothetical)

### M1. Dead translation key
**File:** `src/lib/i18n/translations.ts:182-185`

`signup.alreadyExistsHint` is defined in EN+DA but never read anywhere in `src/`. Either wire it into the existing-account UI (it's a perfectly good explanatory line) or delete it.

### M2. Duplicate `next`-sanitization logic in three places
**Files:** `src/app/login/LoginForm.tsx:43`, `src/app/signup/SignupForm.tsx:94`, `src/app/auth/callback/page.tsx:34`

```ts
const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
```

The exact same one-liner three times. Move to `auth-errors.ts` (rename the file `auth-helpers.ts`) as `safeNext(raw: string | null): string`. Drift risk: someone fixes `\\evil.com`-style bypasses in one place and not the others.

### M3. `callback` URL builder pattern differs between SignupForm and LoginForm
**Files:** `src/app/login/LoginForm.tsx:62-67` (IIFE) vs `src/app/signup/SignupForm.tsx:112-117` (`useMemo`)

Same logic, two different shapes. The `useMemo` form correctly memoizes on `next`; the IIFE in LoginForm runs every render. Negligible perf cost (URL construction is cheap), but the inconsistency invites a future maintainer to "fix" one and not the other.

### M4. `t()` is in useEffect deps but isn't structurally stable across language changes
**Files:** all three forms

`t` from `useLanguage()` is wrapped in `useCallback` with `[lang]` dep, so it's stable WITHIN a language. Correct. But the toasts being keyed off `t` means I3 happens. Document the intent or stop including `t` in deps for one-shot effects.

### M5. Trigger function body has no length cap on email-local-part fallback
**File:** `supabase/migrations/00000000000005_oauth_profile_metadata.sql:48`

`split_part(coalesce(new.email, ''), '@', 1)` can return a 64-char string (max email local part). With unicode that's potentially many display columns. Cosmetic, low priority. Cap to 40 chars to match the form's intent.

### M6. Email template doesn't use available `Data.full_name` for personalization
**File:** `supabase/templates/magic_link.html:64`

The Go template has `{{ .Data.first_name }}` available (passed via `signInWithOtp` `options.data`). "Hi Philip — sign in to slothcv" reads warmer than "Sign in to slothcv." Optional polish.

### M7. Email template `target="_blank"` without `rel="noopener noreferrer"`
**File:** `supabase/templates/magic_link.html:84`

Standard accessibility/security recommendation. Largely moot here (the destination IS your callback, so no third-party referrer leak), but every email-template linter will flag it.

---

## Identity-collision matrix walkthrough (asked for)

| Scenario | Current behavior | Verdict |
|---|---|---|
| User signed up Google, tries /signup with same email | Probe succeeds (account exists) → existing-account UI fires. Probe ALSO sends a magic link to their inbox — but that link doesn't link to their Google identity, it logs them in via the OTP factor (Supabase auto-links if "Enable manual linking" is off, or refuses if on). UI tells them to use Google. | OK behavior, copy is honest. |
| User signed up magic-link, tries Google OAuth with same email | Goes to `/auth/callback?error_description=...`. Callback maps `"user already" / "identity already"` → `account_exists_other_method` code → /login shows "An account with this email already exists." | OK — but only if Google's error_description literally contains those strings. Confirm with a real test against Supabase Google settings (with manual linking OFF), since this is `errorDescription` substring matching with the same fragility as C3. |
| User signed up Google, then later tries /login magic-link with same email | LoginForm's strict mode (`shouldCreateUser:false`) → succeeds → magic link sent → user clicks → callback exchanges code → signed in. Supabase auto-creates an `email` identity linked to the same user_id (by default). Real outcome depends on the project's "Manual linking" setting which isn't visible from this repo. | Untested in this PR. Spin a test account and verify before declaring done. |
| Two tabs, one mid-signing-in, the other on /signup | Tab A submits, awaits magic link. Tab B types email, submits — probe runs, succeeds (because Tab A may have created the account in the meantime), Tab B shows "account exists." Acceptable. **But**: if Tab A has not completed and Tab B then clicks Tab A's magic link, the PKCE verifier is the one Tab B's probe stored, not Tab A's. → `bad_code_verifier` → "Open the sign-in link in the same browser you started in" toast. | Real footgun. The two-tab signup UX is genuinely broken because every form submission stores a fresh PKCE verifier in the SAME `localStorage` key. |
| User on mobile clicks magic link in Gmail app's webview | The webview is a separate browser instance. PKCE verifier was stored in Safari/Chrome. → `bad_code_verifier` → mapped to `different_browser` → friendly copy fires. | OK — this is the path the writer specifically built `errDifferentBrowser` for. Working as intended. |
| User clicks magic link twice | First click consumes the code, sets session, redirects. Second click hits callback with same `?code=`. `getUser()` returns the new user → C1 path: redirects to safeNext WITHOUT re-exchange. Functional correctness, but C1 is the same code path so the same shared-browser bug bites here. | Same root cause as C1; same fix. |

---

## Approved-as-is (called out so the writer doesn't second-guess)

- **`<strong>{email}</strong>` in JSX**: not an XSS vector. React renders `email` as a text node — it's escaped automatically. Approved.
- **`emailRedirectTo` set per-call from `window.location.origin`**: correct for static-export-on-Cloudflare-Pages with preview URLs. Don't refactor to a build-time env var.
- **`handle_new_user` SECURITY DEFINER trigger**: correctly uses `set search_path = public, auth` (prevents search_path injection), uses `coalesce + nullif`, has `on conflict do nothing`. Solid.
- **RLS policies on `profiles`**: own-row read/write/insert/delete. Correctly defends against malicious clients. The trigger bypasses RLS by being SECURITY DEFINER, which is necessary because the insert happens in the auth.users insert context. Approved.
- **Backfill UPDATE only touches display_names that match email-local-part**: correctly avoids clobbering manually-edited names. Approved.
- **Avatar URL backfill only runs when avatar_url is NULL**: defensive, won't blow away a user-uploaded avatar. Approved.
- **`maxLength` HTML attribute on the inputs**: not enough on its own (see I8) but a fine first line of defense for honest browsers. Keep it.
- **Email template light-mode-only via `<meta name="color-scheme">`**: the right call; dark-mode email is a render-test sinkhole. Approved.
- **`role="presentation"` on layout tables in the email**: correct accessibility hint for tabular layout that isn't actually tabular data. Approved.
- **No CSP / DKIM / SPF discussion in the template**: out of scope — those live on the Supabase project SMTP config, not in the HTML.

---

## VERDICT: REQUEST_CHANGES — C1 (shared-browser session takeover) and C2 (decode crash) need to be fixed before this ships; C3 (substring vs typed codes) is a latent footgun that compounds every Supabase upgrade. The Important pile (especially I1, I6, I7) is the difference between "auth flow that works for honest users" and "auth flow that survives a hostile internet."
