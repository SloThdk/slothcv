#!/usr/bin/env python3
"""
Provision the slothcv Supabase project end-to-end via the Management API.

Inputs:
  SUPABASE_PAT   personal access token from https://supabase.com/dashboard/account/tokens
  ORG_ID         (optional) Supabase org id; auto-detected if exactly one is owned.
  REGION         (optional) defaults to eu-central-1 (Frankfurt).
  DB_PASSWORD    (optional) if not set, a 32-char random one is generated and saved.

Side effects (in order):
  1. Creates the project named "slothcv".
  2. Polls until status == ACTIVE_HEALTHY.
  3. Fetches anon + service-role keys.
  4. Writes everything to ~/.claude-secrets/slothcv.env (chmod 600 best-effort).
  5. Writes .env.local in the project root.
  6. Applies supabase/migrations/00000000000001_init.sql via the SQL endpoint.
  7. Prints a one-block summary so the operator can confirm.

This is a one-shot bootstrap. Re-running it after the project exists will
detect that and skip creation.
"""

from __future__ import annotations

import json
import os
import secrets
import string
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

API = "https://api.supabase.com/v1"
PROJECT_NAME = "slothcv"
DEFAULT_REGION = "eu-central-1"
SECRETS_PATH = Path.home() / ".claude-secrets" / "slothcv.env"
PROJECT_DIR = Path(__file__).resolve().parent.parent
ENV_LOCAL = PROJECT_DIR / ".env.local"
MIGRATION = PROJECT_DIR / "supabase" / "migrations" / "00000000000001_init.sql"


def _req(method: str, path: str, token: str, body: dict | None = None) -> dict:
    """Tiny stdlib wrapper around urllib for the Supabase management API."""
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{API}{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            text = resp.read().decode("utf-8")
            return json.loads(text) if text else {}
    except urllib.error.HTTPError as e:
        # Surface the response body — Supabase's error messages are useful.
        body_text = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {e.code} {method} {path}: {body_text}")


def _gen_password(length: int = 32) -> str:
    """Generate a high-entropy DB password — letters + digits only so it's
    safe to use in connection strings without escaping."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def main() -> int:
    pat = os.environ.get("SUPABASE_PAT")
    if not pat:
        print(
            "ERROR: SUPABASE_PAT not set. Get one from\n"
            "  https://supabase.com/dashboard/account/tokens\n"
            "Then re-run:\n"
            "  SUPABASE_PAT=sbp_xxx python scripts/provision_supabase.py",
            file=sys.stderr,
        )
        return 2

    region = os.environ.get("REGION", DEFAULT_REGION)
    db_password = os.environ.get("DB_PASSWORD") or _gen_password()

    # 1. Resolve org. If multiple are owned and ORG_ID isn't set, fail loudly.
    orgs = _req("GET", "/organizations", pat)
    if not orgs:
        raise SystemExit("No organizations on this account.")
    explicit = os.environ.get("ORG_ID")
    if explicit:
        org = next((o for o in orgs if o["id"] == explicit), None)
        if not org:
            raise SystemExit(f"ORG_ID {explicit} not found in account.")
    elif len(orgs) == 1:
        org = orgs[0]
    else:
        names = ", ".join(f"{o['name']}={o['id']}" for o in orgs)
        raise SystemExit(
            f"Multiple orgs on this account: {names}. Re-run with ORG_ID=<id>."
        )
    print(f"using org: {org['name']} ({org['id']})")

    # 2. Check whether the project already exists (idempotent).
    projects = _req("GET", "/projects", pat)
    existing = next(
        (p for p in projects if p["name"] == PROJECT_NAME and p["organization_id"] == org["id"]),
        None,
    )

    if existing:
        print(f"project '{PROJECT_NAME}' already exists ({existing['id']}); reusing.")
        ref = existing["id"]
    else:
        print(f"creating project '{PROJECT_NAME}' in {region}...")
        created = _req(
            "POST",
            "/projects",
            pat,
            {
                "name": PROJECT_NAME,
                "organization_id": org["id"],
                "region": region,
                "db_pass": db_password,
                "plan": "free",
            },
        )
        ref = created["id"]
        print(f"created: {ref}")

    # 3. Poll until ACTIVE_HEALTHY (provisioning takes 30-90s).
    print("waiting for project to be healthy...")
    for attempt in range(90):  # ~9 minutes worst case
        proj = _req("GET", f"/projects/{ref}", pat)
        status = proj.get("status")
        print(f"  status={status}")
        if status == "ACTIVE_HEALTHY":
            break
        time.sleep(6)
    else:
        raise SystemExit(f"project {ref} never reached ACTIVE_HEALTHY")

    # 4. Fetch API keys.
    keys = _req("GET", f"/projects/{ref}/api-keys", pat)
    anon_key = next((k["api_key"] for k in keys if k["name"] == "anon"), None)
    service_key = next((k["api_key"] for k in keys if k["name"] == "service_role"), None)
    if not anon_key or not service_key:
        raise SystemExit(f"could not find anon/service_role keys: {keys}")

    project_url = f"https://{ref}.supabase.co"
    print(f"project URL: {project_url}")

    # 5. Persist secrets locally.
    SECRETS_PATH.parent.mkdir(parents=True, exist_ok=True)
    SECRETS_PATH.write_text(
        f"# slothcv — created by scripts/provision_supabase.py\n"
        f"SUPABASE_PROJECT_REF={ref}\n"
        f"NEXT_PUBLIC_SUPABASE_URL={project_url}\n"
        f"NEXT_PUBLIC_SUPABASE_ANON_KEY={anon_key}\n"
        f"SUPABASE_SERVICE_ROLE_KEY={service_key}\n"
        f"SUPABASE_DB_PASSWORD={db_password}\n",
        encoding="utf-8",
    )
    try:
        os.chmod(SECRETS_PATH, 0o600)  # best-effort on POSIX; no-op on Windows ACLs.
    except Exception:
        pass
    print(f"wrote secrets -> {SECRETS_PATH}")

    ENV_LOCAL.write_text(
        f"NEXT_PUBLIC_SUPABASE_URL={project_url}\n"
        f"NEXT_PUBLIC_SUPABASE_ANON_KEY={anon_key}\n"
        f"SUPABASE_SERVICE_ROLE_KEY={service_key}\n",
        encoding="utf-8",
    )
    print(f"wrote env    -> {ENV_LOCAL}")

    # 6. Apply migration via the SQL endpoint (idempotent SQL — uses
    #    `if not exists` and `drop policy if exists` throughout).
    sql = MIGRATION.read_text(encoding="utf-8")
    print("applying migration...")
    _req("POST", f"/projects/{ref}/database/query", pat, {"query": sql})
    print("migration applied.")

    # 7. Summary.
    print("\n" + "=" * 60)
    print("DONE")
    print("=" * 60)
    print(f"  project ref   : {ref}")
    print(f"  dashboard     : https://supabase.com/dashboard/project/{ref}")
    print(f"  api url       : {project_url}")
    print(f"  secrets file  : {SECRETS_PATH}")
    print(f"  .env.local    : {ENV_LOCAL}")
    print()
    print("Next:")
    print("  1. Configure auth providers in the dashboard (Email is on by")
    print("     default; add Google OAuth -> Authentication > Providers).")
    print("  2. Add the production callback URL once you know the worker URL:")
    print("        https://slothcv.<account>.workers.dev/auth/callback")
    print("  3. Run `npm run dev` then `npm run deploy`.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
