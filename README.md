# SlothCV

Free, beautiful CVs. No signup walls, no watermarks. Drag, drop, design. Export to PDF.

A free alternative to elegantcv.app — actually free, no trial trap, no watermarks.

## Status

**Phase 1 (this build):** auth, persistence, deploy. Editor is a placeholder.
**Phase 2 (next):** drag-and-drop editor, design controls, PDF export, real templates.

## Stack

- Next.js 16 (App Router, **static export**) + TypeScript + React 19
- Tailwind v4 + a slim shadcn-style component layer (Button / Input / Card)
- Supabase (Postgres + Auth: magic-link + Google OAuth) — fully client-side
- Cloudflare **Pages** (SPA-style, no Worker) — `wrangler pages deploy out`
- `lucide-react` for icons, `sonner` for toasts

## Routes

| Path              | Purpose                                                                           |
|-------------------|-----------------------------------------------------------------------------------|
| `/`               | Landing — hero + 3 placeholder template cards                                     |
| `/login`          | Magic-link email + Google OAuth                                                   |
| `/auth/callback`  | OAuth / magic-link redemption (client-side PKCE exchange)                         |
| `/dashboard`      | Auth-gated CV list (create / rename / duplicate / delete)                         |
| `/editor?id=...`  | Auth-gated editor — Phase 1 placeholder, persistence loop wired                   |

Auth-gating is client-side via `<AuthGate>` (`src/components/auth-gate.tsx`):
on page load it waits for the Supabase session resolution; anonymous visitors
are redirected to `/login?next=...`. RLS on every Supabase call is the
authoritative security gate — `<AuthGate>` is purely UX.

The editor uses `?id=` instead of `[id]` because Next 16 static export
doesn't support dynamic route params without `generateStaticParams`.

## Security model

- **Row-Level Security ON** for `resumes` (see `supabase/migrations/00000000000001_init.sql`).
- All four CRUD policies reduce to `auth.uid() = user_id`. The DB is the authoritative gate.
- Anon key shipped to client (safe — RLS-gated). Service-role key never bundled.
- `next` redirect param is allowlist-checked (`startsWith("/")` and not `//`)
  to avoid open-redirect via `?next=https://evil.com`.
- Title input is hard-capped at 120 chars before persistence.
- Generic external errors, detail in the network response for debugging.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-only, used by migrations / future jobs
```

For Cloudflare Pages, the public vars must be present at **build time**
(static export bakes them into the bundle). Set them in the Pages project's
Build Configuration → Environment Variables, OR pass them inline before
`npm run deploy`. The service-role key is **not used** in Phase 1 — keep it
out of CI; only the migration script reads it.

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
# Build + deploy to Cloudflare Pages
NEXT_PUBLIC_SUPABASE_URL=... \
NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
npm run deploy
```

Live at https://slothcv.pages.dev (auto-assigned by Pages on first deploy).

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
5. Custom domain `cv.philipsloth.com` via Cloudflare DNS + Worker route.
