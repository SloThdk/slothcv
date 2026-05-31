"""Lighthouse-based performance gate for slothcv.

Runs `npx lighthouse` against one or more URLs in BOTH desktop and mobile
profiles, parses the four headline scores (performance, accessibility,
best-practices, SEO), prints a clean before/after-style table, and exits
non-zero if any score drops below the per-route budget defined in
PERF.md.

Defaults audit the deployed origin (https://slothcv.philipsloth.com) for the
landing page, the dashboard, and the editor. Override with `--url` for
ad-hoc audits. Override the entire route list with `--route landing
--route dashboard ...` to gate fewer routes during local dev.

Usage:

    # CI / pre-deploy gate against production
    python scripts/perf_gate.py

    # Audit a single URL (e.g. a Pages preview deploy)
    python scripts/perf_gate.py --url https://slothcv-preview.pages.dev

    # Local dev — only check landing
    python scripts/perf_gate.py --base http://localhost:3000 \\
                                --route landing

Exit codes:
    0  — all routes met every budget on both desktop AND mobile
    1  — at least one budget breach OR Lighthouse failed to run
    2  — bad CLI usage / configuration error

The script wraps `npx lighthouse` so we don't need a global install. The
first invocation in a fresh node_modules will download Lighthouse on
demand (~30s). Subsequent runs use the cached binary.
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Iterable


# ---------------------------------------------------------------------------
# Per-route performance budgets.
#
# These mirror PERF.md and are the contract the gate enforces.
#
# Tier policy:
#   - Landing  → ≥95 perf (static, light, must be flawless on cold visit)
#   - Dashboard→ ≥95 perf (auth-gated but still simple list view)
#   - Editor   → ≥85 perf (heavy: Zustand store, drag-drop, live preview)
#
# Accessibility / best-practices / SEO are uniform — those are correctness
# axes, not "spend more JS" axes; if they drop we want to know everywhere.
# ---------------------------------------------------------------------------
DEFAULT_BUDGETS: dict[str, dict[str, int]] = {
    "landing": {
        "performance": 95,
        "accessibility": 95,
        "best-practices": 90,
        "seo": 90,
    },
    "dashboard": {
        "performance": 95,
        "accessibility": 95,
        "best-practices": 90,
        "seo": 90,
    },
    "editor": {
        "performance": 85,
        "accessibility": 95,
        "best-practices": 90,
        "seo": 90,
    },
}


# Default routes appended to the base URL. The keys here drive both the
# Lighthouse target URLs and the budget lookup. New routes = add a row in
# DEFAULT_BUDGETS and ROUTES.
ROUTES: dict[str, str] = {
    "landing": "/",
    "dashboard": "/dashboard/",
    "editor": "/editor/",
}


@dataclasses.dataclass
class Scores:
    """Headline scores from a single Lighthouse run.

    Each score is 0-100 (rounded — Lighthouse reports floats 0..1, which
    we multiply and round at parse time so the table matches the
    Chrome DevTools UI output exactly).
    """

    performance: int
    accessibility: int
    best_practices: int
    seo: int

    def to_dict(self) -> dict[str, int]:
        return {
            "performance": self.performance,
            "accessibility": self.accessibility,
            "best-practices": self.best_practices,
            "seo": self.seo,
        }


def parse_lighthouse_report(report: dict) -> Scores:
    """Pluck the four headline scores out of the JSON Lighthouse emits."""
    cats = report["categories"]

    def pct(key: str) -> int:
        # Lighthouse reports `null` when the category couldn't be measured
        # (e.g. SEO on a JSON-only response). Treat null as 0 so the gate
        # explicitly fails — better to surface than to silently pass.
        v = cats[key]["score"]
        return 0 if v is None else round(v * 100)

    return Scores(
        performance=pct("performance"),
        accessibility=pct("accessibility"),
        best_practices=pct("best-practices"),
        seo=pct("seo"),
    )


def run_lighthouse(url: str, preset: str) -> Scores:
    """Invoke `npx lighthouse <url> --preset=<preset>` and return parsed scores.

    `preset` is either `desktop` or empty (mobile is the default). We force
    `--quiet`, `--chrome-flags="--headless=new --no-sandbox"`, and JSON
    output to a tempfile we own.

    Mobile uses `--form-factor=mobile --throttling-method=simulate` (the
    Lighthouse default) so the scores match Chrome DevTools "Mobile" runs.
    Desktop uses `--preset=desktop` which is `--form-factor=desktop
    --throttling-method=simulate --screenEmulation.disabled=false` and
    matches DevTools "Desktop" runs.
    """
    with tempfile.NamedTemporaryFile(
        mode="w",
        suffix=".json",
        delete=False,
        encoding="utf-8",
    ) as tf:
        out_path = Path(tf.name)

    # Build the Lighthouse command. We keep the chrome flags minimal —
    # `--headless=new` is the modern headless mode, `--no-sandbox` is
    # required when running in containers/CI where the chrome sandbox
    # isn't available. Locally on Windows it's a no-op.
    chrome_flags = "--headless=new --no-sandbox --disable-gpu"

    cmd: list[str] = [
        "npx",
        "--yes",
        "lighthouse",
        url,
        "--quiet",
        "--output=json",
        f"--output-path={out_path}",
        f"--chrome-flags={chrome_flags}",
        "--max-wait-for-load=60000",
        "--only-categories=performance,accessibility,best-practices,seo",
    ]
    if preset == "desktop":
        cmd.append("--preset=desktop")
    # mobile is the default form factor — no flag needed.

    # Stream stderr to our stderr so warnings show up live during long
    # runs, but capture stdout so any lighthouse status lines don't
    # pollute the table the script prints at the end.
    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=sys.stderr,
            text=True,
            check=False,
            shell=True,  # Windows: npx lives in a .cmd shim.
        )
    except FileNotFoundError as e:
        print(f"[perf_gate] npx not found on PATH: {e}", file=sys.stderr)
        sys.exit(2)

    # Heuristic: success = the JSON report exists and parses, regardless
    # of process exit code. Why we tolerate non-zero exit:
    #   - On Windows, `chrome-launcher`'s tmp-folder cleanup occasionally
    #     hits an EPERM during `rmSync` because Chrome still holds a
    #     file handle. Lighthouse has already produced the report and
    #     written it to `--output-path` by the time this fires; the
    #     subsequent crash is purely cleanup noise.
    #   - We detect this by checking whether `out_path` exists and is
    #     non-empty AFTER the process exits. If so, parse + return; if
    #     not, treat it as a real failure.
    report: dict | None = None
    if out_path.exists() and out_path.stat().st_size > 0:
        try:
            report = json.loads(out_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(
                f"[perf_gate] lighthouse JSON failed to parse "
                f"({url} / {preset or 'mobile'}): {e}",
                file=sys.stderr,
            )

    # Clean up the tempfile regardless of whether we used it.
    try:
        out_path.unlink()
    except FileNotFoundError:
        pass

    if report is None:
        # No usable JSON — propagate the failure. Surface the exit code
        # so a CI log can distinguish "Chrome wouldn't launch" (exit
        # ~127) from "Lighthouse network error" (exit 1) etc.
        print(
            f"[perf_gate] lighthouse failed for {url} ({preset or 'mobile'}): "
            f"exit={proc.returncode}, no JSON report produced",
            file=sys.stderr,
        )
        if proc.stdout:
            print(proc.stdout, file=sys.stderr)
        sys.exit(1)

    return parse_lighthouse_report(report)


def colorise(score: int, budget: int) -> str:
    """Return an ANSI-coloured string of the score, green if ≥ budget,
    red otherwise. Falls back to plain text on Windows without
    colorama (we don't import colorama; the modern Windows Terminal
    handles VT sequences natively, and old cmd.exe just shows the
    escape codes — minor cosmetic only)."""
    if score >= budget:
        return f"\033[32m{score:3d}\033[0m"
    return f"\033[31m{score:3d}\033[0m"


def render_table(
    rows: list[tuple[str, str, Scores, dict[str, int]]],
) -> str:
    """Pretty-print a Markdown-ish table. Each row is
    (route, profile, scores, budgets)."""
    header = (
        "| Route     | Profile  | Perf | A11y | Best | SEO  |\n"
        "|-----------|----------|------|------|------|------|"
    )
    lines = [header]
    for route, profile, scores, budgets in rows:
        cells = [
            f"| {route:<9}",
            f"| {profile:<8}",
            f"| {colorise(scores.performance, budgets['performance']):>4}",
            f"| {colorise(scores.accessibility, budgets['accessibility']):>4}",
            f"| {colorise(scores.best_practices, budgets['best-practices']):>4}",
            f"| {colorise(scores.seo, budgets['seo']):>4}",
            "|",
        ]
        lines.append(" ".join(cells))
    return "\n".join(lines)


def evaluate(
    scores: Scores, budgets: dict[str, int]
) -> list[tuple[str, int, int]]:
    """Return list of (axis, actual, budget) for every BREACH (actual < budget)."""
    breaches: list[tuple[str, int, int]] = []
    for axis, want in budgets.items():
        got = scores.to_dict()[axis]
        if got < want:
            breaches.append((axis, got, want))
    return breaches


def main(argv: Iterable[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Lighthouse perf gate for slothcv — fails if any "
        "route drops below the per-route budget on desktop or mobile.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--base",
        default="https://slothcv.philipsloth.com",
        help="Base URL for routes (no trailing slash).",
    )
    parser.add_argument(
        "--url",
        action="append",
        default=[],
        help="Audit one explicit URL (skip route table). Repeatable.",
    )
    parser.add_argument(
        "--route",
        action="append",
        choices=list(ROUTES.keys()),
        default=[],
        help="Limit the audit to a subset of routes (default: all). Repeatable.",
    )
    parser.add_argument(
        "--profile",
        choices=["desktop", "mobile", "both"],
        default="both",
        help="Lighthouse form factor.",
    )
    parser.add_argument(
        "--no-color",
        action="store_true",
        help="Disable ANSI colour even on TTY.",
    )
    parser.add_argument(
        "--baseline-out",
        type=Path,
        default=None,
        help="Write a JSON baseline of the run to this path (no gate fail "
        "is suppressed — this is just for snapshotting into PERF.md).",
    )
    args = parser.parse_args(list(argv))

    if args.no_color:
        # Monkey-patch colorise to a no-op (we still align widths).
        global colorise
        colorise = lambda s, _b: f"{s:3d}"  # noqa: E731

    # Sanity-check: npx must exist on PATH.
    if shutil.which("npx") is None and shutil.which("npx.cmd") is None:
        print(
            "[perf_gate] npx not found — install Node.js / nvm so `npx` is "
            "on PATH, then retry.",
            file=sys.stderr,
        )
        return 2

    profiles: list[str] = (
        ["desktop", "mobile"] if args.profile == "both" else [args.profile]
    )

    # Build the audit plan. --url overrides the route table; otherwise we
    # iterate ROUTES and skip anything not in --route (if specified).
    plan: list[tuple[str, str]] = []  # (label, full_url)
    if args.url:
        for u in args.url:
            plan.append((u, u))
    else:
        wanted = set(args.route) if args.route else set(ROUTES.keys())
        for route, path in ROUTES.items():
            if route in wanted:
                plan.append((route, args.base.rstrip("/") + path))

    if not plan:
        print("[perf_gate] no routes to audit (check --route flags).",
              file=sys.stderr)
        return 2

    rows: list[tuple[str, str, Scores, dict[str, int]]] = []
    breach_count = 0
    baseline: dict[str, dict[str, dict[str, int]]] = {}

    for label, url in plan:
        budgets = DEFAULT_BUDGETS.get(label, DEFAULT_BUDGETS["landing"])
        baseline[label] = {}
        for profile in profiles:
            print(f"[perf_gate] auditing {label} on {profile}: {url}",
                  file=sys.stderr)
            scores = run_lighthouse(url, profile)
            rows.append((label, profile, scores, budgets))
            baseline[label][profile] = scores.to_dict()
            for axis, got, want in evaluate(scores, budgets):
                breach_count += 1
                print(
                    f"  [BREACH] {label}/{profile}: {axis} {got} < {want}",
                    file=sys.stderr,
                )

    print()
    print(render_table(rows))
    print()

    if args.baseline_out:
        args.baseline_out.write_text(
            json.dumps(baseline, indent=2, sort_keys=True),
            encoding="utf-8",
        )
        print(f"[perf_gate] wrote baseline → {args.baseline_out}",
              file=sys.stderr)

    if breach_count > 0:
        print(
            f"[perf_gate] FAIL — {breach_count} score(s) below budget.",
            file=sys.stderr,
        )
        return 1

    print("[perf_gate] OK — all routes meet budget.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
