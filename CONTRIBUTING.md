# Contributing to SlothCV

Thanks for considering a contribution. SlothCV is primarily a personal
portfolio project, so the process is lightweight, but a few rules are
non-negotiable. This file documents them so a contributor can land a
PR without back-and-forth on style or process.

---

## Quick start

```bash
# Fork + clone
git clone https://github.com/<your-username>/slothcv.git
cd slothcv

# Install dependencies (bun is the canonical package manager — see
# start_local_server.bat. npm-installed lockfiles are gitignored.)
bun install

# Copy the env template and fill in your own Supabase project
cp .env.example .env.local

# Bring up dev (Next.js on http://localhost:3000)
bun run dev
```

Running against your own Supabase project requires:

1. Create a free Supabase project at <https://supabase.com>.
2. Apply the migrations under `supabase/migrations/` (via the Supabase
   CLI: `supabase db push`).
3. Copy the project's URL + anon key into `.env.local`.

The `scripts/provision_supabase.py` helper provisions a project from
the Supabase Management API end-to-end if you have a Supabase Personal
Access Token (`sbp_*`) — see the script's docstring for usage.

---

## Before opening a PR

- [ ] **Discuss large changes in an issue first.** Significant work
      thrown away because the design isn't a fit is bad for everyone.
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes (12 pre-existing
      `react-hooks/set-state-in-effect` warnings in editor components are
      tracked separately; new warnings outside that set are PR blockers)
- [ ] `bun run build` passes (the deploy gate uses the same build step)
- [ ] `gitleaks detect --no-git --redact` is clean
- [ ] Commits follow [Conventional Commits](https://www.conventionalcommits.org)
      (e.g. `feat(editor): add drag-to-reorder for hobby section`)

> **A note on testing.** The v0.1 build does not yet ship an automated
> test suite. The v0.5 milestone introduces a cross-user RLS isolation
> test (the one referenced under "Auth + RLS + storage rules" below)
> plus per-component unit tests for the editor's auto-save +
> debouncer. Until then, PRs that touch the auth / RLS / storage path
> need a manual exercise note in the description: which scenarios you
> ran locally, which user pairs you tested, what you observed.

---

## Auth + RLS + storage code: special rules

PRs that touch any of these areas are held to a higher review bar:

- `supabase/migrations/` — RLS policies, the `prevent_provider_mixing`
  trigger, the `email_status` RPC
- `src/lib/supabase/` — auth helpers, session handling, client / server
  Supabase wrappers
- `src/app/auth/` — auth callback, login, signup flows
- `src/lib/cv-storage-cleanup.ts` — storage delete-by-prefix logic

Hard rules:

1. **The `service_role` key never reaches the browser.** It bypasses
   RLS by design and is server-only. PRs that put it behind a
   `NEXT_PUBLIC_*` env var will be closed during maintainer review.
2. **RLS-changing migrations require a maintainer review with a
   manual cross-user exercise note.** Any migration that modifies a
   policy on `resumes`, `auth.identities`, or any `storage.*` table
   needs the PR description to spell out what cross-user scenarios
   the contributor exercised locally (e.g. "user A creates CV X;
   user B opens X's UUID directly via the supabase-js client → 0
   rows returned"). The v0.5 automated cross-user isolation test
   replaces this manual note when it lands; until then, the manual
   exercise is the gate.
3. **No new external dependencies on the auth or data path** without a
   maintainer review of the dependency's license, audit history, and
   maintenance velocity. Supabase is the approved entry; PDF rendering
   uses the browser's native print engine with no third-party PDF
   library at runtime. New additions need justification.

---

## Code style

- **TypeScript:** ESLint via `bun run lint`. Prettier is not yet wired
  in as a project script; if you want auto-formatting locally, run
  `bunx prettier --write .` against your changed files. The v0.5
  milestone wires Prettier into a pre-commit hook + a `bun run format`
  script.
- **SQL migrations:** lowercase keywords, snake_case identifiers, one
  statement per migration block, an explanatory comment block at the
  top of every file documenting the trade-offs.
- **Python scripts:** PEP 8, type hints where they aid readability, no
  `print` for debugging — use `logging` so script callers can filter.

---

## Filing issues

| Type                   | Use                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bug                    | Issue template `bug` (when enabled)                                                                                                                                             |
| Feature request        | Issue template `feature` (when enabled)                                                                                                                                         |
| Security vulnerability | **DO NOT** file an issue. Email <philipsloth1@gmail.com> or use the form at <https://philipsloth.com/contact> — see [`SECURITY.md`](SECURITY.md) for the disclosure SLA + scope |
| Question               | GitHub Discussions (when enabled)                                                                                                                                               |

When filing a bug, please include:

- SlothCV version (commit SHA or tag)
- Browser + OS
- Steps to reproduce
- Expected vs actual behaviour
- Browser console + Network tab logs if relevant

---

## Code of conduct

This project follows the [Contributor Covenant 2.1](CODE_OF_CONDUCT.md).
Be kind. Disagreements about technical decisions are fine. Disagreements
about people aren't.

---

## License

By submitting a PR, you agree that your contribution is licensed under
the [MIT License](LICENSE) of this repository. There's no CLA —
submission = agreement.

---

## Recognition

Anyone whose PR is merged, or whose vulnerability report leads to a fix,
gets listed in `CONTRIBUTORS.md` (with consent). For security reports,
the standard "Reported by \_\_\_" credit appears in the release notes for
the fix.
