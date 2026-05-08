# Security Policy

> **SlothCV is a free, open-source CV builder.** This file documents the
> security posture, the threat model, and the responsible-disclosure
> process. Read it before deploying SlothCV or filing any security report.

---

## Audit status

| Component                                 | Status                                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| **Supabase (auth + Postgres + storage)**  | ✅ Audited upstream by Supabase + the underlying Postgres / GoTrue / Storage |
| **Browser print engine (PDF rendering)**  | ✅ Native to every supported browser; no third-party PDF code in the bundle  |
| **Application code** (`src/`)             | ❌ Not yet independently audited                                             |
| **Postgres RLS policies + auth triggers** | ⚠️ Internally reviewed; automated cross-user isolation test lands in v0.5    |

The application code has not been independently audited. The data-isolation
primitives the build leans on — Supabase RLS, the
`prevent_provider_mixing` trigger on `auth.identities`, and the
account-delete cascade on `auth.users` — ARE checked into this repo
and are reviewable by anyone reading it. The automated cross-user
isolation test that backs them up in CI is on the v0.5 roadmap; until
then, isolation is verified by manual exercise + by reading the policy
SQL.

---

## Trust assumptions

SlothCV makes three architecture-level guarantees:

1. **Provider separation is enforced by a Postgres trigger, not by a
   frontend check.** The `prevent_provider_mixing` trigger on
   `auth.identities` (migration 0009) blocks an account from silently
   auto-linking to a second OAuth provider. Migration 0012 also revokes
   `EXECUTE` on the trigger function from `anon` / `authenticated` /
   `public` so a compromised application server cannot disable it.

2. **Row-level security on every CRUD policy.** Every `resumes`
   `SELECT`, `INSERT`, `UPDATE`, `DELETE` policy is gated by
   `auth.uid() = user_id` — see migration 0001. Storage object policies
   in migration 0003 enforce per-user folder isolation
   (`(storage.foldername(name))[1] = auth.uid()::text`). v0.5 adds an
   automated cross-user isolation test in CI that exercises these
   policies on every push; v0.1 verifies them by reading the SQL.

3. **PDF rendering happens client-side via the browser's native print
   engine.** No third-party PDF library runs at runtime, no server
   ever sees the rendered PDF. The only thing the server stores is
   the structured CV JSON (in `resumes.data`, gated by RLS) and,
   optionally, the user's avatar photo in Supabase Storage (per-user
   folder write isolation; public read because the URL is the access
   secret for shared CVs).

---

## Reporting a vulnerability

**Please disclose responsibly.** Do not file a public GitHub issue for
security issues; use one of the private channels below.

Two routes — both reach the same maintainer inbox:

1. **Email** the maintainer directly at **<philipsloth1@gmail.com>**, OR
2. **Use the contact form** at <https://philipsloth.com/contact> — pick
   the "security" topic and the form routes the message to the same
   inbox.

Please include:

- A description of the vulnerability
- Reproducible steps or proof-of-concept
- Impact assessment (what an attacker can achieve)
- Your name / handle for credit (optional)

### What to expect

| Stage                  | Timeline                                                  |
| ---------------------- | --------------------------------------------------------- |
| Acknowledgement        | Within 72 hours                                           |
| Initial assessment     | Within 7 days                                             |
| Fix or mitigation plan | Within 30 days for high/critical, best-effort otherwise   |
| Public disclosure      | Coordinated with you, default 90 days from initial report |
| Credit                 | After fix lands, with your consent                        |

### Scope

In scope:

- This repository's code (anything under `src/`, `supabase/migrations/`,
  `scripts/`, `functions/`, `public/`)
- The deployed service at <https://slothcv.pages.dev>

Out of scope for the **security** disclosure channel (different routes apply):

- Bugs in upstream dependencies (`@supabase/supabase-js`, `next`,
  `@dnd-kit/core`, etc.) — report those to the upstream project,
  not this repo.
- Denial-of-service attacks against the infrastructure (already
  rate-limited at the Cloudflare edge and by Supabase Auth).
- Social engineering attempts against the maintainer.
- **Abuse of the public service** (illegal CV content, harassment,
  spam) — these go through the same maintainer email
  (<philipsloth1@gmail.com>) or the contact form, but are triaged on a
  different track from security reports.

---

## Security-relevant code policy

PRs that touch any of the following are held to a higher review bar:

- `supabase/migrations/` — RLS policies, triggers, the
  `auth.identities` trigger
- `src/lib/supabase/` — auth helpers, session handling
- `src/app/auth/` — auth callback, login, signup flows
- `src/lib/cv-storage-cleanup.ts` — storage GC (delete-by-prefix logic)

Hard rules:

1. **No `service_role` key in client code.** The service-role key
   bypasses RLS; it must never be inlined into a `NEXT_PUBLIC_*` env
   var or otherwise shipped to the browser.
2. **RLS-touching migrations require a paired test.** Any change that
   modifies a policy on `resumes`, `auth.identities`, or any `storage.*`
   table must include or update a cross-user isolation test.
3. **Constant-time comparisons for any secret comparison.** Use
   `crypto.timingSafeEqual` (Node) — never `==` or `===` on tokens.
4. **No new external dependencies on the auth / data path** without a
   maintainer review of the dependency's own license, audit history, and
   maintenance velocity.

---

## Vulnerability disclosure history

No vulnerabilities have been disclosed publicly to date. When the first
one is, a CVE will be filed and a write-up published under
`docs/advisories/`.
