# slothcv

Free, beautiful CVs. No signup walls, no watermarks. Drag, drop, design. Export to PDF.

A free alternative to elegantcv.app. Built by [Sloth Studio](https://slothstudioco.com).

## Status

**Phase 1 (this build):** auth, persistence, deploy. Editor is a placeholder.
**Phase 2 (next):** drag-and-drop editor, design controls, PDF export, real templates.

## Stack

- Next.js 16 (App Router) + TypeScript + React 19
- Tailwind v4 + a slim shadcn-style component layer (Button / Input / Card)
- Supabase (Postgres + Auth: magic-link + Google OAuth)
- Cloudflare Workers via `@opennextjs/cloudflare` (Pages can't host SSR/Server Actions)
- `lucide-react` for icons, `sonner` for toasts

## Routes

| Path              | Purpose                                                                           |
|-------------------|-----------------------------------------------------------------------------------|
| `/`               | Landing — hero + 3 placeholder template cards                                     |
| `/login`          | Magic-link email + Google OAuth                                                   |
| `/auth/callback`  | OAuth / magic-link redemption (PKCE code exchange)                                |
| `/auth/signout`   | POST-only signout                                                                 |
| `/dashboard`      | Auth-gated CV list (create / rename / duplicate / delete)                         |
| `/editor/[id]`    | Auth-gated editor — Phase 1 placeholder, persistence loop wired                   |

`src/proxy.ts` (the Next 16 replacement for `middleware.ts`) refreshes the
Supabase session cookie on every request and bounces anonymous visitors away
from `/dashboard` and `/editor/*`.

## Security model

- **Row-Level Security ON** for `resumes` (see `supabase/migrations/00000000000001_init.sql`).
- All four CRUD policies reduce to `auth.uid() = user_id`. The DB is the authoritative gate.
- Server Actions filter by `user_id` too — defence in depth, not a substitute for RLS.
- Anon key shipped to client (safe — RLS-gated). Service-role key server-only.
- POST-only signout (CSRF-resistant), 303 redirect on completion.
- Generic external errors, detailed network responses for debugging.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-only, used by migrations / future jobs
```

In production, set the public vars via:

```bash
wrangler secret put NEXT_PUBLIC_SUPABASE_URL
wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
```

(They become Worker env at runtime — OpenNext exposes them to Next as
`process.env.*`.)

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev                   # http://localhost:3000
```

## Quality gates

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm run build       # next build
```

All three must pass before shipping. Enforced by the workspace-wide
`stop-test-gate.py` hook on opted-in projects.

## Deploy

```bash
# One-time: link the project
wrangler deploy --dry-run

# Real deploy (builds via OpenNext + uploads to Workers)
npm run deploy
```

Live at https://slothcv.<account>.workers.dev once the Supabase env vars are
provisioned.

## Database setup

Apply the migration to your Supabase project:

```bash
# via Supabase CLI (recommended)
supabase db push --db-url "postgresql://postgres:<PW>@db.<REF>.supabase.co:5432/postgres"

# or paste supabase/migrations/00000000000001_init.sql into the SQL editor
```

Configure auth providers in the Supabase dashboard:

1. **Email** (magic link) — enabled by default.
2. **Google OAuth** — Authentication → Providers → Google. Add the Pages
   callback URL (`https://slothcv.<account>.workers.dev/auth/callback`).

## Phase 2 punch list

1. Real drag-and-drop editor (canvas + blocks + design panel).
2. PDF export (likely `react-pdf` or server-side Chromium).
3. Real template gallery with one-click "Use this template".
4. Auto-save (debounced) instead of manual Save button.
5. Custom domain `cv.slothstudioco.com` via Cloudflare DNS + Worker route.
