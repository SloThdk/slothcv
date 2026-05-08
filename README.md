# SlothCV

Free CV builder. Vector-quality PDF export rendered by your browser's print
engine. EU-hosted Postgres with row-level security on every row, a Postgres
trigger that prevents OAuth-provider mixing on a single account, and no
watermark / signup wall / trial trap of any kind.

**Live: <https://slothcv.pages.dev>**

[![Live](https://img.shields.io/badge/live-slothcv.pages.dev-success)](https://slothcv.pages.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![EU-hosted](https://img.shields.io/badge/region-EU--only-blue)](#data-residency)
[![Status: v0.1.0](https://img.shields.io/badge/status-v0.1.0-orange)](#release-status)

> [!NOTE]
> v0.1.0 ships every feature listed below, but the application code has
> not been independently audited and there is no automated cross-user
> isolation test in CI yet. Treat the build as portfolio-grade until both
> ship — see [`SECURITY.md`](SECURITY.md) for the full posture.

---

## What v0.1 ships

- **Magic-link + Google OAuth sign-in.** Magic-link goes through Supabase
  Auth's GoTrue; Google goes through a hand-rolled Cloudflare Pages
  Function (`functions/auth/google/`) that does PKCE, `state`, `nonce`,
  and an httpOnly-cookie handoff before delegating to
  `supabase.auth.signInWithIdToken({ nonce })` on the browser side.
- **Working CV editor** at `/editor?id=...` — section drag-to-reorder
  via `@dnd-kit/core`, inline text editing, design tab with 16 accent
  presets + 15 fonts + four layouts + three page sizes, custom-elements
  (text / image / divider / spacer), photo upload via Supabase Storage.
  ~566 lines in the page component, ~14 sub-components under
  `src/components/editor/`, Zustand for the in-flight CV state.
- **~60 CV templates** under `src/templates/` — Danish-targeted
  professions (advokat, revisor, sygeplejerske, postdoc, mekaniker,
  tømrer, etc.) plus genre defaults (developer, designer, editor,
  staff engineer, creative director). One-click "Use this template"
  from the dashboard's create flow.
- **Vector PDF export** via the browser's native print engine
  (`window.print()` with an injected `@page` rule and a body-rooted
  print container). Selectable text, embedded fonts, ATS-readable, no
  rasterisation, no server round-trip. The earlier html2canvas-based
  path produced subpixel font drift and was replaced;
  `src/lib/pdf-export.tsx` documents the trade-offs.
- **Dashboard** at `/dashboard` (~623 lines) — list, rename, duplicate,
  delete CVs, plus a 10-CV cap enforced server-side by a Postgres
  trigger so a malicious client can't bypass it via raw API calls.
- **Auto-save** debounced to 1 second, with a `beforeunload` flush so
  the in-flight CV doesn't get lost on accidental tab close.
- **Account self-service** — delete account from `/account` cascades to
  every CV row, every Storage avatar / cv-photo / custom-element image,
  and the auth.users row, in one transaction with no orphans.

## Routes

| Path                    | Auth?  | Purpose                                                       |
| ----------------------- | ------ | ------------------------------------------------------------- |
| `/`                     | public | Landing — hero + template gallery preview                     |
| `/templates`            | public | Browse all ~60 templates                                      |
| `/login`                | public | Magic-link email + "Continue with Google"                     |
| `/signup`               | public | Magic-link signup with provider-mixing guidance               |
| `/auth/callback`        | public | Supabase magic-link / OAuth code exchange (PKCE)              |
| `/auth/google/init`     | public | Cloudflare Function — starts the DIY Google OAuth flow        |
| `/auth/google/callback` | public | Cloudflare Function — exchanges code, validates state + nonce |
| `/dashboard`            | auth   | Per-user CV list — create / rename / duplicate / delete       |
| `/editor?id=...`        | auth   | The actual editor                                             |
| `/account`              | auth   | Profile + account-delete                                      |
| `/privacy`, `/terms`    | public | Legal pages — bilingual EN + DA                               |

Auth-gating on the client is via `<AuthGate>` — purely UX. The
authoritative gate is Postgres row-level security on every CRUD policy
(`auth.uid() = user_id`); the cross-user isolation guarantee holds even
if the gateway is bypassed.

---

## Architecture at a glance

```
                       ┌──────────────────────────┐
                       │   Cloudflare Pages       │
                       │   (static export of      │
                       │    Next.js + React 19)   │
                       └──────────┬───────────────┘
                                  │
                  ┌───────────────┼─────────────────┐
                  │               │                 │
            (browser)       /auth/google/*     direct to
            CV editor       Pages Functions    Supabase via
            + PDF print     (PKCE OAuth)       supabase-js
                  │               │                 │
                  │               └────────┬────────┘
                  ▼                        ▼
       ┌──────────────────────────────────────────────────┐
       │                   Supabase                       │
       │   ┌──────────────────────────────────────────┐   │
       │   │  Postgres 16                             │   │
       │   │   - public.resumes (RLS, auth.uid)       │   │
       │   │   - public.profiles                      │   │
       │   │   - auth.identities  + provider-mixing   │   │
       │   │     trigger (migration 0009)             │   │
       │   │   - 10-CV cap trigger (migration 0002)   │   │
       │   │   - account-delete cascade (0015/0016)   │   │
       │   ├──────────────────────────────────────────┤   │
       │   │  Storage: avatars bucket                 │   │
       │   │   - public READ (designed: URL = key)    │   │
       │   │   - per-user-folder WRITE/UPDATE/DELETE  │   │
       │   ├──────────────────────────────────────────┤   │
       │   │  Auth (GoTrue) — magic-link + Google     │   │
       │   └──────────────────────────────────────────┘   │
       └──────────────────────────────────────────────────┘
                       (EU-hosted Supabase region)
```

Key non-obvious choices:

- **Static export to Cloudflare Pages**, not SSR. Every page is HTML +
  bundled JS, served from the edge. There are zero server-side route
  handlers in the Next bundle. The OAuth handshake's `state` / `nonce`
  / `code_verifier` cookies need a real backend, and CF Pages
  Functions (sibling `functions/` directory, separate Worker) are the
  surgical addition that avoids migrating the whole site to SSR.
- **Provider separation in v0.1.** The `prevent_provider_mixing`
  trigger on `auth.identities` (migration 0009) blocks an account
  from auto-linking a second OAuth provider — the database, not the
  application server, is the enforcement point. Migration 0012 also
  revokes `EXECUTE` on the trigger function from `anon` /
  `authenticated` / `public` so a compromised app server cannot
  disable it.
- **PDF rendering happens entirely in the browser** via the native
  print engine. No server ever sees the rendered PDF or the CV
  content. The `@page` size rule + a body-rooted print container
  give pixel-perfect WYSIWYG with selectable text and embedded fonts;
  see `src/lib/pdf-export.tsx` for the rationale block on why this
  beats `html2canvas` for CV layouts.

---

## Stack

- **Frontend** — Next.js 16 (App Router, `output: "export"`) · React 19
  · TypeScript · Tailwind v4 · slim shadcn-style component layer
- **State** — Zustand for in-flight CV state, React Context for
  language + theme + auth session
- **Drag-and-drop** — `@dnd-kit/core` (the editor's section reorder
  - custom-element placement)
- **PDF** — `window.print()` + injected `@page` rule (no
  third-party PDF lib at runtime)
- **Auth** — Supabase Auth (GoTrue) for magic-link; hand-rolled
  Cloudflare Pages Function for the DIY Google OAuth handshake
- **Database** — Supabase Postgres 16 with row-level security on
  every table that holds user data
- **Storage** — Supabase Storage `avatars` bucket
  (per-user folder write isolation; public read because the URL is
  the access secret for shared CVs)
- **Hosting** — Cloudflare Pages (static), Supabase EU region for
  data
- **Email** — Supabase auth-mailer with branded `magic_link.html` /
  `confirmation.html` / `recovery.html` (sync via
  `scripts/sync_email_templates.py`)
- **CI** — GitHub Actions (`.github/workflows/deploy.yml`) builds
  with Bun and ships the static export through `cloudflare/wrangler-action`

---

## Data residency

The Supabase project is EU-region-only. Cloudflare Pages serves the
static bundle from the edge nearest the visitor; the only data path
that crosses regions is the user's own browser to Supabase EU. There
is no US-hosted data plane in the architecture.

This matters for Danish lawyers, accountants, journalists, and anyone
else whose CVs include `tavshedspligt`-class material that would not
survive a Schrems II audit if it crossed US-jurisdiction infrastructure.

---

## Local dev

```bash
# Bun is the canonical package manager (bun.lock). npm-installed
# lockfiles are gitignored, so don't `npm install` against this repo.
bun install

# Copy the env template and fill in your own Supabase project's URL +
# anon key. The service-role key is server-only — used by the Python
# helpers under scripts/, never bundled into the browser.
cp .env.example .env.local

# Dev server on http://localhost:3000
bun run dev
```

Spinning up your own Supabase project from scratch:

```bash
# Provision a fresh project + apply every migration end-to-end via the
# Supabase Management API. Needs `SUPABASE_PAT` (sbp_*) from
# https://supabase.com/dashboard/account/tokens.
SUPABASE_PAT=sbp_xxx python scripts/provision_supabase.py
```

Or apply the migrations to an existing project via the Supabase CLI:

```bash
supabase db push --db-url "postgresql://postgres:<PW>@db.<REF>.supabase.co:5432/postgres"
```

---

## Quality gates

```bash
bun run typecheck
bun run lint
bun run build
```

`typecheck` and `build` are clean on every push to `master` and gate
the deploy. `lint` currently has 12 outstanding `react-hooks/set-state-in-effect`
warnings in pre-existing editor components — those are tracked in the
issue list and not yet fixed; they're advisory in React 19, not
runtime bugs.

---

## Deploy

GitHub Actions auto-deploys every push to `master` to
<https://slothcv.pages.dev>. Manual deploy:

```bash
NEXT_PUBLIC_SUPABASE_URL=... \
NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
NEXT_PUBLIC_TURNSTILE_SITE_KEY=... \
bun run deploy
```

`NEXT_PUBLIC_*` vars are inlined into the static bundle at build time
— they MUST be set when `bun run build` runs, not at deploy time.
The CI workflow reads them from GitHub Actions secrets; for local
deploy from a workstation, source them from your own `.env.local`.

---

## Release status

v0.1.0 is the first public-flip cut. The core promises (free, no
watermark, EU-only, vector PDF, RLS-enforced isolation, provider-
separation by trigger) are all live. The roadmap below tracks what
v0.5 / v1.0 are expected to add — none of it is required for the v0.1
promise to hold.

| Version    | Status  | Highlights                                                                                                     |
| ---------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| **v0.1.0** | live    | Editor + dashboard + ~60 templates + auth + vector PDF + per-user RLS + provider-mixing trigger                |
| **v0.5.0** | next    | Automated cross-user isolation test in CI · in-app abuse-report flow · `session_revocations` real-time channel |
| **v1.0.0** | planned | External app-pen-test report · published audit history · custom domain `cv.philipsloth.com`                    |

See [`SECURITY.md`](SECURITY.md) for the security policy and
disclosure SLA, [`CONTRIBUTING.md`](CONTRIBUTING.md) for PR process
and the special rules around auth + RLS + storage code.

---

## License

MIT — see [`LICENSE`](LICENSE). Use it, fork it, run your own.

---

## Author

Built by **Philip Sloth** in Denmark.
Portfolio: <https://philipsloth.com>
Other open code: [SlothBox](https://github.com/SloThdk/slothbox) (an
end-to-end-encrypted file-transfer service with court-admissible
delivery receipts — same trust-as-architecture discipline applied to
a different problem).
