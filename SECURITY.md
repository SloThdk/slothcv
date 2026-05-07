# Security Policy

> **SlothCV is a free, open-source CV builder.** This file documents the
> security posture, the threat model, and the responsible-disclosure
> process. Read it before deploying SlothCV or filing any security report.

---

## Audit status

| Component                                 | Status                                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| **Supabase (auth + Postgres + storage)**  | ✅ Audited upstream by Supabase + the underlying Postgres / GoTrue / Storage |
| **@react-pdf/renderer (PDF generation)**  | ✅ Mature, widely deployed; pinned to a recent stable                        |
| **Application code** (`src/`)             | ❌ Not yet independently audited                                             |
| **Postgres RLS policies + auth triggers** | ⚠️ Internally reviewed; cross-user isolation test in CI                      |

The application code has not been independently audited. The cryptographic
and data-isolation primitives the build leans on — Supabase RLS, the
`prevent_provider_mixing` trigger on `auth.identities`, the cross-user
isolation CI test — ARE checked into this repo and are reviewable by
anyone reading it.

---

## Trust assumptions

SlothCV makes three architecture-level guarantees:

1. **Provider separation is enforced by a Postgres trigger, not by a
   frontend check.** The `prevent_provider_mixing` trigger on
   `auth.identities` blocks an account from silently auto-linking to a
   second OAuth provider. This is a database-layer enforcement that a
   compromised application server cannot bypass.

2. **Row-level security is verified by CI on every push.** The
   cross-user isolation test (`scripts/cross_user_rls_test.sh` or
   equivalent) runs as part of the CI suite — a regression that would
   let user A read user B's CV rows fails the build.

3. **The PDF rendering happens client-side via @react-pdf/renderer.** No
   server ever sees the rendered PDF. The only thing the server stores
   is the structured CV JSON (which lives in `resumes.data`, gated by
   RLS) and, optionally, the user's avatar photo in Supabase Storage
   (gated by per-user storage policies).

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

- Bugs in upstream dependencies (`@supabase/supabase-js`,
  `@react-pdf/renderer`, `next`, etc.) — report those to the upstream
  project, not this repo.
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
