"""Apply 00000000000006_resume_variants.sql to the slothcv Supabase project.

Reads DB password from C:/Users/phili/.claude-secrets/slothcv.env, opens a
direct postgres connection through the IPv4-friendly pooler, and runs the
migration. Idempotent — uses `add column if not exists` so a re-run is a
no-op.
"""

from __future__ import annotations

import os
import pathlib
import sys

import psycopg2

SECRETS = pathlib.Path("C:/Users/phili/.claude-secrets/slothcv.env")
MIGRATION = pathlib.Path(
    "C:/Users/phili/Sync/Websites/slothcv/supabase/migrations/00000000000006_resume_variants.sql"
)


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for raw in SECRETS.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def main() -> int:
    env = load_env()
    project_ref = env["SUPABASE_PROJECT_REF"]
    password = env["SUPABASE_DB_PASSWORD"]
    sql = MIGRATION.read_text(encoding="utf-8")

    # Try direct connection first (db.<ref>.supabase.co), then fall back to
    # the EU pooler. Direct works in most environments; pooler is the
    # IPv4-only fallback.
    candidates = [
        ("direct", f"db.{project_ref}.supabase.co", 5432),
        # AWS-0 (older projects)
        ("aws-0-eu-central-1", "aws-0-eu-central-1.pooler.supabase.com", 6543),
        ("aws-0-eu-west-1", "aws-0-eu-west-1.pooler.supabase.com", 6543),
        ("aws-0-us-east-1", "aws-0-us-east-1.pooler.supabase.com", 6543),
        ("aws-0-us-east-2", "aws-0-us-east-2.pooler.supabase.com", 6543),
        ("aws-0-us-west-1", "aws-0-us-west-1.pooler.supabase.com", 6543),
        # AWS-1 (newer projects)
        ("aws-1-eu-central-1", "aws-1-eu-central-1.pooler.supabase.com", 6543),
        ("aws-1-eu-west-1", "aws-1-eu-west-1.pooler.supabase.com", 6543),
        ("aws-1-us-east-1", "aws-1-us-east-1.pooler.supabase.com", 6543),
        ("aws-1-us-east-2", "aws-1-us-east-2.pooler.supabase.com", 6543),
        ("aws-1-us-west-1", "aws-1-us-west-1.pooler.supabase.com", 6543),
    ]
    last_err: Exception | None = None
    for name, host, port in candidates:
        try:
            user = (
                "postgres" if name == "direct" else f"postgres.{project_ref}"
            )
            print(f"[try] {name} {host}:{port} user={user}", flush=True)
            conn = psycopg2.connect(
                host=host,
                port=port,
                user=user,
                password=password,
                dbname="postgres",
                connect_timeout=10,
            )
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.close()
            print(f"[ok]  applied via {name}", flush=True)
            return 0
        except Exception as e:  # broad: any connection / SQL error
            last_err = e
            print(f"[fail] {name}: {e}", flush=True)
    print(f"[error] all connection attempts failed: {last_err}", flush=True)
    return 1


if __name__ == "__main__":
    sys.exit(main())
