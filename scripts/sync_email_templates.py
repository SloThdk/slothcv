#!/usr/bin/env python3
"""
Sync slothcv's Supabase auth-mailer templates from disk.

Why this exists
---------------
Supabase ships default mailer templates that are unbranded and look like
spam ("Confirm Your Signup", bare blue link). When a user signs up via
signInWithOtp(shouldCreateUser:true) Supabase fires the **confirmation**
template — NOT the magic_link template — so a project that only
configured magic_link gets a bare-default confirmation email on every
new signup. This script avoids that drift by pushing every
`supabase/templates/*.html` file at the repo root into the corresponding
`mailer_templates_*_content` field on the project's auth config.

Templates managed (filename → mailer key)
  magic_link.html       → mailer_templates_magic_link_content
  confirmation.html     → mailer_templates_confirmation_content
  recovery.html         → mailer_templates_recovery_content
  email_change.html     → mailer_templates_email_change_content
  invite.html           → mailer_templates_invite_content
  reauthentication.html → mailer_templates_reauthentication_content

Subjects come from MAILER_SUBJECTS below — only the keys present in the
dict are pushed, so unset keys keep whatever Supabase already has.

Inputs (env)
  SUPABASE_PAT         personal access token, sbp_*
                       https://supabase.com/dashboard/account/tokens
  SUPABASE_PROJECT_REF defaults to slothcv ref from .env.local-style
                       lookups; CLI override wins.

Run
  SUPABASE_PAT=sbp_xxx python scripts/sync_email_templates.py
  SUPABASE_PAT=sbp_xxx python scripts/sync_email_templates.py --dry-run
  SUPABASE_PAT=sbp_xxx python scripts/sync_email_templates.py --only confirmation

Idempotent: re-running with the same files is a no-op as far as user
impact (Supabase just stores whatever you PATCH).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

# Windows console defaults to cp1252 which crashes on em-dash, arrows,
# or any non-Latin-1 char. Reconfigure stdout/stderr so log output is
# readable. (Wire-format is unaffected — json.dumps already escapes.)
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8")
        except Exception:  # noqa: BLE001
            pass

API = "https://api.supabase.com/v1"
DEFAULT_PROJECT_REF = "putgpmxijypjsrwbupyk"  # slothcv prod
PROJECT_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = PROJECT_DIR / "supabase" / "templates"

# Filename stem → Supabase auth-config key suffix.
# Add new files here when you create new branded templates.
TEMPLATE_FILES: dict[str, str] = {
    "magic_link": "magic_link",
    "confirmation": "confirmation",
    "recovery": "recovery",
    "email_change": "email_change",
    "invite": "invite",
    "reauthentication": "reauthentication",
}

# Subject lines. Only keys listed here get pushed — to leave a subject
# untouched, comment its line out. Supabase substitutes {{ .SiteURL }} /
# {{ .Email }} etc. inside subjects too.
MAILER_SUBJECTS: dict[str, str] = {
    "magic_link": "Your SlothCV sign-in link",
    "confirmation": "Welcome to SlothCV — confirm your email",
    # Recovery / invite / email_change / reauthentication aren't part of
    # slothcv's active flows. Leaving them out preserves Supabase defaults.
}


def _req(method: str, path: str, token: str, body: dict | None = None) -> dict:
    """Stdlib wrapper around the Supabase management API. Mirrors the
    helper in scripts/provision_supabase.py so behavior is consistent
    across both scripts (timeout, headers, error formatting)."""
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{API}{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            # Cloudflare in front of api.supabase.com 403s default
            # urllib UAs; matching a real browser keeps things calm.
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/147.0.0.0 Safari/537.36"
            ),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            text = resp.read().decode("utf-8")
            return json.loads(text) if text else {}
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {e.code} {method} {path}: {body_text}")


def _load_template(stem: str) -> str | None:
    """Read supabase/templates/<stem>.html and return its contents, or
    None if the file doesn't exist. Missing files are skipped silently
    so partial template sets are fine."""
    path = TEMPLATES_DIR / f"{stem}.html"
    if not path.exists():
        return None
    return path.read_text(encoding="utf-8")


def _build_patch(only: set[str] | None) -> tuple[dict, list[str]]:
    """Build the PATCH body. `only` filters to specific stems if given.
    Returns (body, summary_lines)."""
    body: dict[str, str] = {}
    summary: list[str] = []

    for stem, key_suffix in TEMPLATE_FILES.items():
        if only is not None and stem not in only:
            continue
        html = _load_template(stem)
        if html is None:
            summary.append(f"  - {stem:20s} SKIP (no file)")
            continue
        body[f"mailer_templates_{key_suffix}_content"] = html
        summary.append(f"  - {stem:20s} push template ({len(html):,} bytes)")

    for stem, subject in MAILER_SUBJECTS.items():
        if only is not None and stem not in only:
            continue
        body[f"mailer_subjects_{stem}"] = subject
        summary.append(f"  - {stem:20s} push subject -> {subject!r}")

    return body, summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--project-ref",
        default=os.environ.get("SUPABASE_PROJECT_REF", DEFAULT_PROJECT_REF),
        help="Supabase project ref (default: slothcv prod)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be pushed but don't call the API.",
    )
    parser.add_argument(
        "--only",
        default=None,
        help="Comma-separated subset to sync (e.g. 'confirmation,magic_link').",
    )
    args = parser.parse_args()

    pat = os.environ.get("SUPABASE_PAT")
    if not pat and not args.dry_run:
        print(
            "ERROR: SUPABASE_PAT not set. Generate one at\n"
            "  https://supabase.com/dashboard/account/tokens\n"
            "then re-run:\n"
            "  SUPABASE_PAT=sbp_xxx python scripts/sync_email_templates.py",
            file=sys.stderr,
        )
        return 2

    only: set[str] | None = None
    if args.only:
        only = {s.strip() for s in args.only.split(",") if s.strip()}
        unknown = only - set(TEMPLATE_FILES.keys())
        if unknown:
            print(
                f"ERROR: --only contains unknown stems: {sorted(unknown)}\n"
                f"Allowed: {sorted(TEMPLATE_FILES.keys())}",
                file=sys.stderr,
            )
            return 2

    body, summary = _build_patch(only)

    print(f"Project ref:    {args.project_ref}")
    print(f"Templates dir:  {TEMPLATES_DIR}")
    print(f"Will push {len(body)} field(s):")
    for line in summary:
        print(line)

    if not body:
        print("\nNothing to push. Exiting.")
        return 0

    if args.dry_run:
        print("\n[dry-run] Skipping PATCH.")
        return 0

    print(f"\nPATCH /v1/projects/{args.project_ref}/config/auth ...")
    _req("PATCH", f"/projects/{args.project_ref}/config/auth", pat, body)

    # Read-back to confirm a representative field actually landed. We
    # don't compare full HTML (Supabase may normalize whitespace); just
    # check presence + first 80 chars match.
    print("\nVerifying ...")
    current = _req("GET", f"/projects/{args.project_ref}/config/auth", pat)
    ok = True
    for field, expected in body.items():
        got = current.get(field) or ""
        head_expected = expected[:80].strip()
        head_got = got[:80].strip()
        if head_got == head_expected:
            print(f"  OK   {field}")
        else:
            ok = False
            print(f"  FAIL {field} -- got first 80 chars: {head_got!r}")

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
