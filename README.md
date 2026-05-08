# SlothCV

> **A free, no-watermark CV builder. EU-hosted, row-level-security on every row, vector PDF rendered by your browser's print engine — and the full source is open so anyone can audit that claim.**

**Live: <https://slothcv.pages.dev>**

[![Live](https://img.shields.io/badge/live-slothcv.pages.dev-success)](https://slothcv.pages.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/SloThdk/slothcv/actions/workflows/deploy.yml/badge.svg)](https://github.com/SloThdk/slothcv/actions/workflows/deploy.yml)
[![Templates: 64](https://img.shields.io/badge/templates-64-success)](src/templates/)
[![EU-hosted](https://img.shields.io/badge/region-EU--only-blue)](#why-eu-hosted)
[![Status: v0.1.0](https://img.shields.io/badge/status-v0.1.0-orange)](#roadmap)

> [!NOTE]
> **v0.1.0 — read this before signing up with a real email.**
>
> Two things are deliberately deferred from v0.1 and matter for any visitor
> evaluating whether to use this build live:
>
> 1. **The application code has not been independently audited.** Supabase
>    Auth (GoTrue) and the Postgres row-level-security engine are
>    battle-tested upstream — GoTrue has run in Supabase production since
>    2020, Postgres RLS shipped in 9.5 (2016) — but the SlothCV glue (the
>    editor's auto-save flow, the Cloudflare Pages Function that runs the
>    DIY Google OAuth handshake, the storage-cleanup cascades) has only
>    been internally reviewed. External app-pen-test is a hard gate for
>    **v1.0**.
> 2. **There is no automated cross-user isolation test in CI yet.** RLS is
>    enforced by Postgres on every CRUD policy (`auth.uid() = user_id`), and
>    the gateway connects through PostgREST so the policies actually fire under
>    user traffic — but a Playwright spec that signs in as user A, signs in as
>    user B, and verifies B cannot read A's CV via every code path lands in
>    **v0.5**. Until then, the RLS claim is verified by manual audits and the
>    migration-level review trail, not continuously.
>
> Use this build for portfolio review and personal CV creation. Treat
> tavshedspligt-class material with the same caveat any v0.1 deserves until v1.0
> ships. Full posture in [`SECURITY.md`](SECURITY.md).

---

## Production deployment

The reference instance lives at **<https://slothcv.pages.dev>**, served from
Cloudflare Pages' edge network with the data plane pinned to an EU-region
Supabase project. Every push to `master` rebuilds and redeploys via
`.github/workflows/deploy.yml`:

| Verification           | Where                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| TLS (HTTPS / HTTP/3)   | [`https://slothcv.pages.dev`](https://slothcv.pages.dev)                                       |
| Workflow status        | [Actions](https://github.com/SloThdk/slothcv/actions) — Deploy badge above                     |
| Strict CSP + headers   | DevTools → Network → response includes `Content-Security-Policy`, HSTS, COOP, X-Frame-Options  |
| robots.txt for authed  | [`public/robots.txt`](public/robots.txt) — `/auth/`, `/dashboard`, `/editor`, `/new` disallowed |
| CF Pages headers file  | [`public/_headers`](public/_headers) — caching + security policy in one place                  |
| RLS policies           | [`supabase/migrations/00000000000001_init.sql`](supabase/migrations/00000000000001_init.sql)   |
| Provider-mixing block  | [`supabase/migrations/00000000000009_strict_provider_separation.sql`](supabase/migrations/)    |
| 10-CV cap trigger      | [`supabase/migrations/00000000000002_cv_count_limit.sql`](supabase/migrations/)                |
| Storage-cleanup cascade | [`supabase/migrations/00000000000015_cascade_storage_on_user_delete.sql`](supabase/migrations/) |

End-to-end smoke test (run from your laptop):

```bash
# 1. Marketing surface returns 200
curl -fsS https://slothcv.pages.dev | grep -o "<title>.*</title>"

# 2. CF Pages Function (Google OAuth init) is wired
curl -sI -X GET "https://slothcv.pages.dev/auth/google/init?next=/dashboard" \
  | head -1   # → HTTP/2 302

# 3. Open-redirect mitigation rejects protocol-relative `next`
curl -sI -X GET "https://slothcv.pages.dev/auth/google/init?next=//evil.com" \
  | grep -i ^location  # → location starts with /, never //evil.com
```

---

## What is SlothCV

Most CV builders gate the export behind a watermark, a paywall, or a 7-day
trial that auto-converts to a subscription. SlothCV doesn't.

You sign up via magic-link or "Continue with Google", pick one of 64 templates
targeted at the Danish + EU job market (advokat, revisor, sygeplejerske,
postdoc, mekaniker, tømrer, plus the genre defaults — developer, designer,
editor, staff engineer, creative director), edit a CV inline, and export it
as a vector PDF rendered by your browser's own print engine — selectable
text, embedded fonts, ATS-readable, no rasterisation, no server round-trip.

That's the whole product. Everything else (drag-to-reorder sections, design
presets, custom elements, multi-page support, Danish + English UI) is built
on top.

---

## Why this exists

| Existing service | Issue |
| --- | --- |
| Canva CV builder | Free tier exports rasterised PNG-in-PDF; selectable-text PDFs require the paid plan; US-cloud (Schrems II for EU users) |
| Resume.io / Zety / NovoResume | Free editor, paywall on download. The "pay to download what you just made" pattern is the entire business model |
| LinkedIn "Save as PDF" | Selectable text but locked to LinkedIn's two layouts and your LinkedIn profile shape — no design control, no Danish-CV norms |
| CVMaker | Free + watermarked downloads on the free tier; watermark removal is the upsell |
| Microsoft Word templates | Real layout control, but every recipient sees a different rendering depending on their Word version + installed fonts |

There is no **EU-hosted, free, watermark-free, vector-PDF, Danish-job-market-
focused CV builder with selectable-text export** in the market the way SlothCV
ships it. SlothCV aims at that gap, with a focus on the Danish freelance +
SMB hiring market where applicants are cost-sensitive and recruiters use ATS
parsers that need real text, not images.

---

## Trust model

The system makes four guarantees, each enforced at the architecture level —
not by marketing copy:

1. **Cross-user data isolation is enforced by the database, not the app
   server.** Every user-data table has `ENABLE ROW LEVEL SECURITY` set in
   migration 0001 with a policy of `auth.uid() = user_id` per CRUD action.
   The application server connects to Postgres via PostgREST as the
   `authenticator` role and switches to `authenticated` per request based on
   the JWT — meaning the policies actually fire under user traffic, not just
   exist as DDL. A bug in the application code can leak a row to the wrong
   user only if the bug rewrites the WHERE clause in a way that already
   matches the policy; PostgREST query construction makes that path narrow.

2. **Account-takeover via OAuth-provider auto-linking is blocked by a
   Postgres trigger on `auth.identities` (migration 0009).** The historical
   Supabase dashboard toggle "Allow same email at multiple identities" was
   removed in 2026, and the Before-User-Created hook does not fire on
   auto-link (because no new `auth.users` row is created). The trigger sits
   below the auth API and rejects any second-identity insert against an
   existing user_id. Migration 0012 also revokes `EXECUTE` on the trigger
   function from `anon` / `authenticated` / `public` so a compromised app
   server cannot disable it.

3. **The PDF rendering path never leaves the browser.** SlothCV uses
   `window.print()` with an injected `@page` rule and a body-rooted print
   container; the live editor's DOM is cloned, font-loading is awaited, and
   the OS print dialog is what produces the PDF. The server has no PDF
   pipeline at runtime — no headless Chrome, no `@react-pdf/renderer`, no
   `html2canvas` rasteriser. This means the server never sees the rendered
   CV content, and the resulting PDF has selectable text + embedded fonts
   (ATS systems can parse it). The earlier `@react-pdf/renderer` and
   `html2canvas-pro` paths were removed because both produced subpixel font
   drift on the CV layout — rationale captured in
   [`src/lib/pdf-export.tsx`](src/lib/pdf-export.tsx).

4. **Account deletion cascades to every byte of user data in a single
   transaction.** The `delete_account()` RPC drops every `resumes` row,
   every `profiles` row, every `auth.users` row, and the BEFORE DELETE
   trigger on `auth.users` (migration 0015) purges every `storage.objects`
   row whose key starts with the deleted user's UUID prefix — covering not
   just the in-app delete flow but also the Studio dashboard, admin API,
   and raw SQL paths. Migration 0016 makes the storage cleanup
   `EXCEPTION WHEN OTHERS THEN`-protected so a transient Storage outage
   doesn't strand a half-deleted user in an undeletable state.

For the threat model and explicit non-goals, see [`SECURITY.md`](SECURITY.md).

---

## Architecture

```
                       ┌──────────────────────────┐
                       │   Cloudflare Pages       │
                       │   (static export of      │
                       │    Next.js 16 + React 19)│
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
       │   │   - public.profiles (RLS)                │   │
       │   │   - auth.identities + provider-mixing    │   │
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

Three services: the Cloudflare Pages static export (HTML + bundled JS), the
sibling Pages Function for the OAuth handshake (compiles to a separate
Worker, served at `/auth/google/*`), and Supabase as the data plane. There
is no SSR runtime; there are no server-side route handlers in the Next
bundle. Every page is HTML + bundled JS pre-rendered at build time.

---

## Quick start

> **Most visitors should use the live service at <https://slothcv.pages.dev>** — that's where to actually build a CV. Sign in with a magic-link or "Continue with Google", pick a template, edit, export the PDF. The steps below are for developers who want to fork, self-host, or inspect the build locally.

### Try the live deployment

Open **<https://slothcv.pages.dev>**. Magic-link or Google sign-in, pick from ~60 templates, edit with live preview, export a vector PDF in your browser.

### Run it locally (for contribution / fork / self-host)

**Prerequisites**

- Bun 1.x. `bun.lock` is committed; `package-lock.json` and `pnpm-lock.yaml` are gitignored, so don't `npm install` against this repo — it would generate the wrong lockfile.
- Your own Supabase project (free tier is enough). Local dev needs `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` from [Project Settings → API](https://supabase.com/dashboard/project/_/settings/api).
- (Optional, only if you wire up Google OAuth) a Google Cloud OAuth Client ID + Client Secret with `https://localhost:3000/auth/google/callback` in the authorised redirect list. Magic-link works without this — Google sign-in returns a config error until the credentials are set.

**Bring it up**

```bash
# Copy the env template, fill in YOUR Supabase project's URL + anon key.
# The service-role key is server-only — used by the Python helpers
# under scripts/, never bundled into the browser.
cp .env.example .env.local

bun install
bun run dev          # dev server on http://localhost:3000
```

The page renders, magic-link auth works against your Supabase project, the editor + ~60 templates + PDF export all run client-side.

### Provision a fresh Supabase project from scratch

The Python helper does the full setup end-to-end via the Supabase Management API — creates the project, applies all 16 migrations, syncs the branded auth-mailer templates, configures Resend SMTP if a `RESEND_API_KEY` is provided.

```bash
# Get a personal access token (sbp_*) from
# https://supabase.com/dashboard/account/tokens
SUPABASE_PAT=sbp_xxx python scripts/provision_supabase.py
```

Or apply migrations to a project you already created via the Supabase CLI:

```bash
supabase db push --db-url "postgresql://postgres:<PW>@db.<REF>.supabase.co:5432/postgres"
```

### Quality gates

```bash
bun run typecheck
bun run lint
bun run build
```

`typecheck` and `build` are clean on every push to `master` and gate the
deploy. `lint` currently has 12 outstanding `react-hooks/set-state-in-effect`
warnings in pre-existing editor components — those are tracked in the
issue list and not yet fixed; they're advisory in React 19, not runtime
bugs.

---

## Stack & rationale

This section is written for the lead engineers and architects reviewing the
repo. Every box on the diagram is a specific technology chosen over a real
alternative — the reasoning is here so reviewers don't have to reverse-engineer
it. Nothing on this list is decorative.

### Frontend

#### Next.js 16 · React 19 · TypeScript · Tailwind v4

- **Role:** the entire user-facing surface (`/`, `/login`, `/signup`,
  `/dashboard`, `/editor`, `/account`, `/privacy`, `/terms`, plus the
  ~60-template gallery on the landing page). Compiled with `output:
  "export"` to static HTML + bundled JS, served from Cloudflare Pages'
  edge network.
- **Why this stack:** the editor is a 566-line client component that mounts
  a Zustand store, drag-and-drop pipeline, font picker, design presets, and
  the live A4 preview — all of it stateful from the moment the user hits
  `/editor?id=...`. There is no SSR data dependency anywhere in the editor
  surface. Static export removes the SSR runtime billing entirely
  (Cloudflare Pages serves the bundle for free at portfolio scale), and
  every page is HTML pre-rendered so the marketing surface and the auth
  pages have zero TTFB beyond the edge cache.
- **Alternatives rejected:** Next.js with full SSR / ISR (pays for compute
  the build doesn't need); Remix or SvelteKit (would need to re-implement
  the @dnd-kit / framer-motion ecosystem the editor depends on); a Vite +
  React SPA (would lose the pre-rendered marketing surface and the
  automatic per-route code-splitting Next 16 ships).

#### @dnd-kit/core · @dnd-kit/sortable · @dnd-kit/utilities

- **Role:** the editor's section reorder + custom-element placement. Used
  inside `src/components/editor/section-list.tsx` and the layers panel.
- **Why this stack:** modern, accessible-by-default drag-and-drop with first-
  class touch + keyboard support. The kit is unopinionated about the drag
  preview, which matters because each of the 64 templates renders sections
  differently and the drag overlay has to match the active template's
  styling.
- **Alternatives rejected:** `react-dnd` (older, splits HTML5 + touch
  backends — touch support requires the second backend and a coordinated
  provider tree); `react-beautiful-dnd` (Atlassian deprecated the project in
  2024 in favour of Pragmatic-DnD, and the Pragmatic API isn't React-first
  in the way the editor's hover-ring + selection-overlay layer expects).

#### Zustand · React Context

- **Role:** Zustand holds the in-flight CV state (`src/lib/store/editor.ts`
  — selection, design tokens, custom-element layout, undo/redo cursor).
  React Context holds language (`LanguageContext.tsx`), theme, and the
  Supabase auth session.
- **Why this stack:** the editor state is one tree (the active CV), not many
  atoms. Zustand's flat-store model fits that shape and survives across
  template switches without re-mounting. The auth session and language
  preference are genuinely cross-cutting and read in dozens of places; React
  Context is the right shape for them and avoids dragging Zustand into
  components that just need a session check.
- **Alternatives rejected:** Redux (over-engineered for one store; the
  developer-tools win doesn't outweigh the boilerplate); Jotai (would split
  the editor state into atoms that have to be coordinated for undo/redo);
  React Query for the auth session (good for server state but the auth
  session is event-driven, not query-driven).

#### framer-motion · react-colorful · lucide-react · sonner

- **Role:** framer-motion drives the page transitions, the spring-physics
  feel of the section drag, and the design-tab inspector animations.
  react-colorful is the colour picker in the design tab. lucide-react is
  the icon set across the entire UI. sonner is the toast layer.
- **Why this stack:** each library is the smallest competent option in its
  category. framer-motion is the only React animation library with a real
  spring-physics engine and gesture support that composes with @dnd-kit.
  react-colorful has zero dependencies and is ~3 KB gzipped vs. react-color's
  ~20 KB. lucide-react ships tree-shakeable per-icon imports so the editor
  pulls in ~40 icons at ~30 KB total instead of a 600-icon megabundle.
  sonner is the modern minimal-API toast library (positions, swipe-to-
  dismiss, accessibility); react-toastify is older and pulls in a heavier
  CSS surface.
- **Alternatives rejected:** react-spring (good engine, but the API surface
  is older and the React 18+ concurrent-rendering story is rougher); CSS
  transitions (no spring physics, no gesture composition); `@iconify/react`
  (lazy-loads icons over the network at first paint, which costs LCP for no
  bundle-size win at 64 templates' worth of icons).

### Auth

#### Supabase Auth (GoTrue) — magic-link path

- **Role:** the magic-link flow. User types email → GoTrue sends a one-time
  link → the link's redirect lands at `/auth/callback` with a one-time code
  → `supabase.auth.exchangeCodeForSession()` returns a session.
- **Why this stack:** Supabase Auth ships with the Postgres project, ties
  directly into RLS via `auth.uid()`, and the email templates are committed
  to the repo (`scripts/sync_email_templates.py` keeps them in sync with
  the live project's branded `magic_link.html` / `confirmation.html` /
  `recovery.html`). Building this flow against a self-hosted Postgres would
  mean re-implementing the `auth.users` table, the JWT signing, the email
  pipeline, and the SMTP relay against Resend.
- **Alternatives rejected:** NextAuth.js / Auth.js (would need a database
  adapter that doesn't conflict with Supabase's `auth` schema, and the JWT
  shape would diverge from the one RLS expects); Clerk (US-jurisdiction
  vendor — defeats the EU-only data path); rolling magic-link from scratch
  (every step is a real auth-bug surface).

#### Cloudflare Pages Function — DIY Google OAuth handshake

- **Role:** the three files in `functions/auth/google/{init,callback,
  finalize-data}.ts` implement the Google OAuth flow as a sibling Worker
  to the static export. `/auth/google/init` mints the OAuth security
  parameters (state, nonce, PKCE code_verifier + challenge) into httpOnly
  cookies and 302-redirects to Google's authorization endpoint;
  `/auth/google/callback` verifies the state cookie matches the query
  parameter, exchanges the authorization code for an ID token, hands the
  ID token + nonce to the browser via secure cookies; the browser calls
  `supabase.auth.signInWithIdToken({ nonce })` which Supabase verifies
  independently (defense in depth).
- **Why this stack:** Supabase's hosted OAuth uses an authorization-code
  flow that requires SSR cookie session storage. SlothCV ships
  `output: "export"` static — there are no server-side route handlers in
  the Next bundle. Adding ONE Cloudflare Pages Function is surgical: no
  migration to OpenNext / SSR / Edge runtime, no deploy-pipeline rewrite.
  The static export keeps shipping verbatim and the OAuth handshake gets
  the server-side surface it needs.
- **Alternatives rejected:** migrate the entire site to SSR (forces
  Cloudflare Pages → Workers + OpenNext or Vercel, both add hosting cost);
  use Supabase's hosted OAuth flow (requires server-side cookie storage
  which a static export cannot provide); skip Google sign-in entirely
  (loses ~40% of expected sign-up conversion based on Danish-market
  benchmarks).

### Data layer

#### Supabase Postgres 16 + Row-Level Security

- **Role:** the source of truth for every user, every CV, every profile.
  `public.resumes` and `public.profiles` are the user-data tables; both
  ship `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in migration 0001 with
  policies of `auth.uid() = user_id` per CRUD action.
- **Why this stack:** RLS makes cross-user isolation a database invariant
  rather than an application check. A bug in the editor that constructs a
  malformed query cannot leak a row across users because the policy fires
  on every read. Self-hosting Postgres would mean re-implementing the
  `auth` schema integration, the JWT-to-`auth.uid()` mapping that PostgREST
  does for free, the Storage buckets with their own per-folder RLS, and
  the SMTP-via-Resend pipeline for auth emails. Supabase free tier covers
  all of this with one signup.
- **Alternatives rejected:** Neon (no Auth, no Storage, no Resend SMTP
  integration — would need three more vendors); PlanetScale (MySQL — no RLS,
  no clean trigger story for the cap + provider-separation invariants);
  Aiven (overkill for a v0.1 portfolio project); managed Postgres + Lucia
  Auth + custom Storage (weeks of ops work for the same outcome).

#### Postgres triggers as enforcement points

- **10-CV per-user cap (migration 0002):** SECURITY DEFINER trigger on
  `INSERT INTO public.resumes` raises `check_violation` (SQLSTATE 23514) when
  the caller's row count >= 10. Cost-control rail for the Free-tier 500 MB
  database — bounds worst-case database growth at
  `registered_users × 10 × ~10 KB` (~5,000 fully-saturated users before the
  project pauses).
- **Strict provider separation (migration 0009):** trigger on
  `auth.identities` rejects any second-identity insert against an existing
  `user_id`. Closes the third direction of provider-mixing (`existing-magic-
  link email used via "Continue with Google"`) that the frontend RPC checks
  in migrations 0007/0008/0010 cannot catch (no email is typed when the user
  clicks the Google button). Migration 0012 then revokes `EXECUTE` on the
  trigger function from `anon` / `authenticated` / `public` so a compromised
  app server cannot disable it.
- **Storage cleanup on account delete (migrations 0015/0016):** BEFORE
  DELETE trigger on `auth.users` purges every `storage.objects` row whose
  name starts with the deleted user's UUID prefix, with `EXCEPTION WHEN
  OTHERS` protection so a transient Storage outage doesn't strand the
  delete in a half-applied state. Covers the Studio dashboard, admin API,
  and raw-SQL paths beyond the in-app account-delete flow.

#### Supabase Storage — `avatars` bucket

- **Role:** holds avatar images, CV photos, and custom-element images.
  Public read (the URL is the access secret for shared CVs); per-user-folder
  write so user A cannot upload to user B's folder.
- **Why this stack:** the Storage policies are the right shape for the use
  case — a CV photo is meant to be viewable by the URL holder (recipient of
  a share), and per-folder write isolation is the standard Supabase pattern.
  Image upload validation lives at the application layer
  (`src/lib/profile.ts`): hard MIME allowlist (PNG / JPEG / WebP / GIF /
  AVIF — SVG explicitly excluded), magic-byte sniff on the first 64 bytes,
  random filename outside the user's chosen path. SVG is rejected because
  XML containers can carry inline `<script>` / `<foreignObject>` / event
  handlers and a malicious SVG to a CV photo would give stored-XSS in the
  `*.supabase.co` storage origin against any viewer.
- **Alternatives rejected:** Cloudflare R2 (no per-user RLS — would need
  a Worker in front of every request to enforce the same policies); a
  self-hosted MinIO (operational overhead for a single-VM setup that
  Supabase already runs).

### Editor mechanics

#### Vector PDF export — `window.print()` + `@page` rule

- **Role:** the export pipeline. `src/lib/pdf-export.tsx` (304 lines)
  clones the live `[data-pdf-page-content="true"]` div into a body-rooted
  print container, injects an inline `<style>` with `@page { size: <chosen>
  mm }`, sets `document.title` to the user's filename (becomes the default
  filename in the system print dialog), awaits `document.fonts.ready`, and
  calls `window.print()`.
- **Why this stack:** the browser's print engine is the same code path that
  renders the editor on screen. There is no separate measurement, no
  separate CSS support gap. The resulting PDF has selectable text (so ATS
  systems can parse it), embedded fonts (renders the same on every viewer),
  and is small (vector text vs. rasterised PNG). The entire export pipeline
  ships zero JS at runtime — the browser already has the print engine.
- **Alternatives rejected:** `@react-pdf/renderer` (originally tried, removed
  on 2026-05-08 — every line had subpixel font drift because the renderer
  uses its own font-metrics layer that disagrees with the browser's by
  ~0-2 subpixels per glyph; deleted 1718 lines of orphan template code +
  three deps); `html2canvas-pro` (rasterises to PNG — loses ATS-readability
  + balloons file size); a server-side headless-Chrome renderer (would
  expose CV content to the server, defeats the trust model + adds runtime
  cost).

#### 64 templates as flat React components

- **Role:** every template is a single `src/templates/<id>.tsx` React
  component that renders the CV as DOM. The PDF export reuses the live
  template via `window.print()`; there is no parallel react-pdf renderer
  per template.
- **Why this stack:** single source of truth for layout. A change to a
  template's typography is one file edit, not two; the live editor's
  preview and the exported PDF are always identical because they're the
  same code path.
- **Templates are Danish-job-market-targeted:** advokat, revisor,
  sygeplejerske, postdoc, mekaniker, tømrer (Danish-CV norms), plus the
  genre defaults (developer, designer, editor, staff engineer, creative
  director, product manager, founder). Names are shown in Danish or
  English depending on the active UI language.

### i18n

#### Custom translation context — `src/lib/i18n/translations.ts`

- **Role:** Danish + English UI. 376 string keys covering every form label,
  placeholder, toast, error message, design-tab control, and template
  blurb. The active language lives in React Context and is persisted to
  `localStorage`.
- **Why this stack:** the build doesn't need plural rules, gendered
  variants, or runtime language switching across 30 locales — it ships in
  two languages and that's the steady state. A 200-line custom translation
  table beats dragging in `next-intl` / `react-intl` for the same outcome
  with more bundle weight.
- **Alternatives rejected:** `next-intl` (good for many-locale builds; over-
  engineered for two locales); `react-intl` (heavier API surface); machine
  translation at build time (loses the Danish-market-specific terminology
  that recruiters expect — `tavshedspligt`, `referencer`, `kompetencer`).

### Hosting

#### Cloudflare Pages (static) + EU-region Supabase

- **Role:** every page is HTML + bundled JS pre-rendered at build time,
  served from CF Pages' edge network. The `functions/` directory ships as
  a separate Worker for the `/auth/google/*` paths.
- **Why this stack:** for a v0.1 free CV builder, hosting cost dominates
  feasibility. CF Pages is free at portfolio scale; EU-region Supabase Free
  covers the data plane at zero cost up to 500 MB. The migration path off
  CF Pages is straightforward — `output: "export"` works on Vercel,
  Netlify, S3 + CloudFront, or self-hosted nginx without any code change.
- **Alternatives rejected:** Vercel (paid SSR runtime is the default tier;
  the static-only alternative loses the integrated preview deploys CF Pages
  also offers); AWS Amplify (US jurisdiction); a self-hosted VM (operational
  overhead disproportionate to a v0.1 portfolio project).

### CI/CD

#### GitHub Actions — `deploy.yml` (Bun + Wrangler)

- **Role:** every push to `master` runs `bun install --frozen-lockfile` →
  `bun run typecheck` → `bun run build` → `wrangler pages deploy` against
  `slothcv.pages.dev`.
- **Why this stack:** GitHub Actions is co-located with the source. The
  `oven-sh/setup-bun@v2` action picks up `bun.lock` directly; the build
  is reproducible because the lockfile is frozen. Wrangler does the deploy
  in one step — no separate publish pipeline.
- **Alternatives rejected:** `actions/setup-node@v4 cache: npm` (would fail
  because `package-lock.json` is gitignored — the project is bun-canonical);
  manual deploys (defeats the auto-deploy-on-push contract); GitLab CI
  (would mean mirroring the repo).

### Summary table

The full machine-readable list. Use this when scanning the repo; read the
prose above when you want to know why each line is there.

- **Frontend** — Next.js 16 (App Router, `output: "export"`) · React 19 ·
  TypeScript 5 · Tailwind v4 · Radix-style component layer
- **State** — Zustand (in-flight CV) · React Context (language / theme /
  auth session)
- **Drag-and-drop** — `@dnd-kit/core` + `@dnd-kit/sortable` +
  `@dnd-kit/utilities`
- **Animation** — `framer-motion` (page transitions, drag physics, design-
  tab inspector)
- **UI primitives** — `lucide-react` (icons) · `react-colorful` (colour
  picker) · `sonner` (toasts) · `class-variance-authority` + `clsx` +
  `tailwind-merge`
- **Forms + validation** — `zod` 4
- **PDF** — `window.print()` + injected `@page` rule (no third-party PDF
  lib at runtime)
- **Auth** — Supabase Auth (GoTrue) for magic-link · Cloudflare Pages
  Function for the DIY Google OAuth handshake (PKCE + state + nonce)
- **Database** — Supabase Postgres 16 (EU region) with RLS on every user-
  data table · 16 migrations · trigger-enforced 10-CV cap and provider
  separation
- **Storage** — Supabase Storage `avatars` bucket (per-user-folder write
  isolation; public read because the URL is the access secret for shared
  CVs)
- **Image-upload validation** — hard MIME allowlist + magic-byte sniff;
  SVG explicitly excluded; sanitised via `isomorphic-dompurify` where DOM
  injection is unavoidable
- **Anti-abuse** — `@marsidev/react-turnstile` on signup / login (Cloudflare
  Turnstile, Supabase-mode token validation)
- **i18n** — custom translation context · 376 keys · Danish + English
- **Hosting** — Cloudflare Pages (static, edge-cached) · `output: "export"`
- **Email** — Supabase auth-mailer with branded `magic_link.html` /
  `confirmation.html` / `recovery.html` (synced via
  `scripts/sync_email_templates.py`)
- **CI/CD** — GitHub Actions (`deploy.yml`) · Bun (`oven-sh/setup-bun@v2`)
  · Wrangler deploy on every push to `master`

---

## Roadmap

| Version    | Status  | Highlights |
| ---------- | ------- | ---------- |
| **v0.1.0** | live    | Editor + dashboard + 64 templates + auth + vector PDF + per-user RLS + provider-mixing trigger + account-delete cascade |
| **v0.5.0** | next    | Automated cross-user isolation test in CI · in-app abuse-report flow · `session_revocations` real-time channel · gitleaks scan in CI |
| **v1.0.0** | planned | External app-pen-test report · published audit history · custom domain `cv.philipsloth.com` · per-CV public share links with HMAC tokens |

Detailed scope per release: see `SECURITY.md` for security-relevant
milestones; see this README's release-status table above for feature scope.

---

## Why EU-hosted

SlothCV's data plane runs exclusively in EU regions — the reference
deployment uses an EU-region Supabase project, and Cloudflare Pages serves
the static bundle from the edge nearest the visitor (the only data path
that crosses regions is the user's own browser to Supabase EU). For users
subject to GDPR, Danish Bogføringsloven, or any sector-specific
confidentiality regime (`tavshedspligt`, attorney-client privilege, medical
confidentiality), this matters: data does not transit US-jurisdiction
infrastructure where Schrems II compliance is contested.

This is checked into the configuration, not a marketing claim. Supabase's
project region is set at provision time; the `scripts/provision_supabase.py`
helper hard-codes `eu-central-1`. There is no US-hosted data plane in the
architecture.

---

## Security

- See [`SECURITY.md`](SECURITY.md) for the full threat model, disclosure
  policy, and audit history.
- **Report vulnerabilities** to the maintainer at <philipsloth1@gmail.com>,
  or via the contact form at <https://philipsloth.com/contact>. Both routes
  reach the same inbox. PGP key fingerprint will be published in
  `.well-known/security.txt` before v0.1 goes wide. Disclosure SLA in
  `SECURITY.md`.
- All migration changes go through CODEOWNERS-required review. PRs that
  touch `supabase/migrations/`, `functions/auth/`, or `src/lib/profile.ts`
  (the upload validator) are closed during maintainer review unless the
  description references the threat-model section being modified. See
  [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Verifying the claims

Don't trust marketing copy. Read the source:

```bash
# 1. RLS is enabled on every user-data table — every migration that
#    creates one ships with ENABLE ROW LEVEL SECURITY in the same file:
grep -rn "ENABLE ROW LEVEL SECURITY\|auth.uid() = user_id" supabase/migrations/

# 2. The 10-CV cap and provider-mixing block are Postgres triggers, not
#    application checks:
grep -rn "CREATE TRIGGER\|cv_limit_reached\|prevent_provider_mixing" supabase/migrations/

# 3. Trigger functions are revoked from anon / authenticated / public so
#    a compromised app server cannot disable them:
grep -rn "REVOKE EXECUTE" supabase/migrations/

# 4. PDF rendering is client-side via window.print() — no server endpoint
#    receives or processes the rendered CV:
grep -rn "window.print\|@page" src/lib/pdf-export.tsx

# 5. Image uploads use hard MIME allowlist + magic-byte sniff (not just
#    the client-supplied file.type):
grep -rn "ALLOWED_IMAGE_MIMES\|sniffImageMagicBytes" src/lib/profile.ts

# 6. Account delete cascades to Storage objects via a BEFORE DELETE trigger:
grep -rn "purge_user_storage_on_delete\|BEFORE DELETE" supabase/migrations/

# 7. The Google OAuth flow uses PKCE + state + nonce + httpOnly cookies:
grep -rn "code_verifier\|code_challenge\|nonce" functions/auth/google/

# 8. Open-redirect mitigation rejects protocol-relative `next` parameter:
grep -rn 'startsWith("/")\|startsWith("//")' functions/auth/google/init.ts
```

For the v0.5+ features (cross-user isolation test in CI, in-app abuse-report
flow, gitleaks scan in CI), see the roadmap table — none are required for the
v0.1 promise to hold, but each tightens the claim from "verified manually" to
"verified mechanically on every push".

---

## License

MIT — see [`LICENSE`](LICENSE). Use it, fork it, run your own. The trust
guarantees come from the architecture (open code + RLS + triggers + audit),
not from the licence — so the friendliest available licence wins.

---

## Author

Built by **Philip Sloth** in Denmark.
Portfolio: <https://philipsloth.com>
Other open code: [SlothBox](https://github.com/SloThdk/slothbox) (an
end-to-end-encrypted file-transfer service with court-admissible delivery
receipts — same trust-as-architecture discipline applied to a different
problem).
