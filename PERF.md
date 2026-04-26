# Performance Budget

> Single source of truth for slothcv's Lighthouse budgets, the bundle
> shape we expect to ship, and how to interpret regressions caught by
> `npm run perf-gate`.

## Budgets

| Route       | Path          | Performance | Accessibility | Best Practices | SEO  |
|-------------|---------------|------------:|--------------:|---------------:|-----:|
| Landing     | `/`           |        ≥ 95 |          ≥ 95 |           ≥ 90 | ≥ 90 |
| Dashboard   | `/dashboard/` |        ≥ 95 |          ≥ 95 |           ≥ 90 | ≥ 90 |
| Editor      | `/editor/`    |        ≥ 85 |          ≥ 95 |           ≥ 90 | ≥ 90 |

The gate (`scripts/perf_gate.py`) enforces these in BOTH desktop and
mobile profiles. Editor is held to 85 because the route mounts a
Zustand store, drag-and-drop pipeline, font picker, color presets, and
the live A4 preview — even after splitting it has more JS than a static
landing page.

If a budget breaks in CI, the gate prints `[BREACH] route/profile:
axis got<want` for every drop AND exits 1.

## Bundle shape (target)

| Asset class                     | Initial  | Lazy / on-demand                        |
|---------------------------------|----------|-----------------------------------------|
| Framework + react-dom           | ~140 KB  | —                                       |
| Editor shell                    | ~280 KB  | —                                       |
| Active template only            | ~5-15 KB | other 43 templates load when picked     |
| `@react-pdf/renderer` (~480 KB) | —        | loads on first **Export PDF** click     |
| Font WOFF2 — 6 preloaded        | ~180 KB  | other 24 fonts load when picked         |

No HTML on the deployed site references the 1.44 MB `react-pdf` chunk
synchronously — `pdf-export.tsx` always reaches it through `await
import("@react-pdf/renderer")` so the cost is paid only by users who
click Export.

After the lazy-renderer rework (2026-04-27):
- 59% of the JS chunk dir (≈2.7 MB / 4.6 MB) is now lazy — it lives in
  the `out/_next/static/chunks/` folder but is not script-tagged from
  any HTML.
- The two ~394 KB chunks and two ~314 KB chunks that previously held
  every template's compiled JSX are gone — replaced by 44 small
  per-template chunks pulled in on demand.

## Routes vs the renderer

- **Landing** — mounts `<TemplatePreview>` × 44 in the gallery, each of
  which lazy-loads exactly one template's chunk. The chunk pulls in
  any fonts the template references via `var(--font-…)`. CSS-defined
  font variables on `<html>` resolve immediately; the WOFF2 stream is
  what gates LCP.
- **Dashboard** — no renderer at all. The page lists user CVs as plain
  cards. Should be the lightest route.
- **Editor** — mounts the renderer once for the active CV. Switching
  template via the Templates tab triggers a chunk load for the new
  template; the fallback `<TemplateLoading>` (a blank white sheet) sits
  in front for ≤200 ms in production.

## Running the gate

```bash
# Audit the production deployment (default)
npm run perf-gate

# Snapshot the result into PERF_BASELINE.json
npm run perf-gate:baseline

# Audit a Cloudflare Pages preview deploy
python scripts/perf_gate.py --url https://slothcv-preview.pages.dev

# Local dev — only the landing
python scripts/perf_gate.py --base http://localhost:3000 --route landing

# Quicker single-profile run (skip mobile)
python scripts/perf_gate.py --profile desktop
```

Exit codes:
- `0` — every route met every budget on both profiles
- `1` — at least one BREACH OR Lighthouse failed
- `2` — bad CLI usage / missing `npx`

## Static-export limitations (Cloudflare Pages)

`output: "export"` in `next.config.ts` means each page is HTML pre-rendered
at build time. There is **no** per-route runtime code-splitting at the
HTTP boundary — every route gets a similar set of `<script>` tags up
front, which is why landing+dashboard+editor all reference roughly the
same shell chunks. What we CAN split:

- **`next/dynamic`** chunks load on demand from JS — works fine.
  This is how every template + react-pdf gets deferred.
- **Routes that import a heavy file ONLY through dynamic()** — fine.
- **Routes that statically import a heavy file** — that file ends up
  bundled into the shared shell chunk and ships everywhere. Watch for
  this: a single `import { foo } from "@/lib/some-heavy-thing"` on
  `app/page.tsx` will balloon every page's initial bundle, not just
  landing's.

The fix when this happens: rewrite the import as `await
import("@/lib/some-heavy-thing")` inside an effect or event handler,
or split the offending module so the heavy bit is its own file the
caller pulls in on demand.

## How to interpret a regression

1. **Performance dropped ≥ 5 pts on every route** — usually a
   heavy global dep landed in the shell (look for new
   `@something-large` imports in `src/lib/` or `src/components/`).
   `npx next build --analyze` (or just `du -sh
   out/_next/static/chunks/*.js | sort -rn | head`) tells you which
   chunk grew.
2. **Performance dropped on editor only** — editor-specific dep
   regressed. Most likely candidate: a new editor tab statically
   importing react-pdf or another formerly-lazy module. Check
   `src/components/editor/*` git history.
3. **A11y dropped** — shipped a new component without proper ARIA /
   alt text / semantic HTML. Run `axe` against the live site to find
   the specific issues; the Lighthouse JSON report the gate generates
   includes them under `categories.accessibility.auditRefs`.
4. **SEO dropped** — usually a missing `<title>` or `meta description`
   on a new route, or a `<a>` without an `href`. Check `src/app/<route>/page.tsx`.
5. **Best Practices dropped** — likely a new external script (analytics,
   embedded widget) without `loading="lazy"`, `defer`, or proper CSP.

## Adding a new template

1. Add the entry to `src/templates/registry.ts`.
2. Create `src/templates/<id>.tsx` exporting `<Name>Template`.
3. Add the lazy-load entry to `src/templates/renderer.tsx`'s `TEMPLATES`
   map.
4. Run `npm run typecheck && npm run build` and confirm:
   - The new template lands in its own chunk under
     `out/_next/static/chunks/`.
   - No HTML in `out/` references that chunk via `<script src>`.

If step 4's second check fails, the template was accidentally pulled
into the shell — check that the registry isn't pulling in the template
component (only the metadata).
