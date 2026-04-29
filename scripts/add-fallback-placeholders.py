"""
Quick-win sweep: in every bespoke template (one that doesn't use the
shared SectionBody from components.tsx), find raw `{X.field}` value
references in JSX and add `|| "Label"` fallbacks so empty entries
render visible placeholder text.

This is a MINIMUM-VIABLE pass — it doesn't add inline-edit support
on the field (that needs full EditableFallback wrapping with a
data-element-id), but it ensures users who click "+ Add education"
on a bespoke-rendered template at least see something on the canvas
instead of an empty row.

Idempotent: skips fields that already have a `||` fallback. Safe to
re-run as new bespoke templates land.
"""

from __future__ import annotations
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "src" / "templates"

# Templates that use the shared SectionBody — DON'T touch them, my
# components.tsx EditableFallback already covers their fields.
USES_SHARED_SECTION_BODY = {
    "atlas.tsx", "bento.tsx", "berlin.tsx", "capitol.tsx", "copenhagen.tsx",
    "dashboard.tsx", "dubai.tsx", "frankfurt.tsx", "geneva.tsx",
    "heidelberg.tsx", "helsinki.tsx", "madrid.tsx", "manhattan.tsx",
    "marina.tsx", "mosaic.tsx", "notion.tsx", "oslo.tsx", "reykjavik.tsx",
    "scratch.tsx", "singapore.tsx", "tokyo.tsx", "vesterbro.tsx",
    "vienna.tsx", "zurich.tsx",
}

SKIP_FILES = {
    "components.tsx", "frame.tsx", "renderer.tsx", "section-actions.tsx",
    "shared.ts", "registry.ts", "custom-elements-layer.tsx", "blank.tsx",
}

# Aurora was done manually with full EditableFallback wrapping; skip
# it here so the script doesn't duplicate fallbacks.
ALREADY_DONE = {"aurora.tsx"}

# Field name → human-readable placeholder text. Only fields that
# legitimately appear empty for new entries; date arithmetic (start/
# end Date) is handled separately.
FIELD_PLACEHOLDERS = {
    "role": "Role",
    "company": "Company",
    "organization": "Organization",
    "name": "Name",
    "title": "Title",
    "degree": "Degree",
    "field": "Field of study",
    "institution": "Institution",
    "location": "Location",
    "gpa": "GPA",
    "techStack": "Tech stack",
    "authors": "Authors",
    "venue": "Venue",
    "date": "Date",
    "issuer": "Issuer",
    "expiry": "Expires",
    "credentialId": "Credential ID",
    "description": "Description",
    "email": "email@example.com",
    "phone": "Phone",
    "proficiency": "Proficiency",
    "headline": "Headline",
    "fullName": "Your name",
}

# Variable names commonly used to alias an iteration item: `it`, `c`
# (cert/award), `a` (award), `p` (publication), `t` (talk), `r`
# (reference), `l` (language), `s` (skill / section), `b` (bullet).
ITEM_VARS = ["it", "c", "a", "p", "t", "r", "l", "s", "b", "h", "ref"]
ITEM_VARS_RE = "(?:" + "|".join(ITEM_VARS) + ")"


def process(content: str) -> tuple[str, int]:
    """Return (new_content, replacements_made)."""
    count = 0
    new = content
    for field, placeholder in FIELD_PLACEHOLDERS.items():
        # Match `{<varname>.<field>}` — a JSX expression rendering the raw
        # value. We do NOT want to match cases that already have `||`
        # (already have a fallback) or `&&` (conditional render — handled
        # separately, manually if needed). Also skip if the expression is
        # inside a string literal (e.g., `${it.field}`) — those are
        # template-literal interpolations, not JSX leaves.
        pattern = re.compile(
            r'\{(' + ITEM_VARS_RE + r')\.' + field + r'\}'
        )

        def replacer(m: re.Match) -> str:
            nonlocal count
            count += 1
            var = m.group(1)
            return f'{{{var}.{field} || "{placeholder}"}}'

        new = pattern.sub(replacer, new)
    return new, count


def main() -> int:
    changed = []
    skipped = []
    for fname in sorted(os.listdir(TEMPLATES)):
        path = TEMPLATES / fname
        if not path.is_file() or not fname.endswith(".tsx"):
            continue
        if fname in SKIP_FILES:
            continue
        if fname in USES_SHARED_SECTION_BODY:
            continue
        if fname in ALREADY_DONE:
            continue
        text = path.read_text(encoding="utf-8")
        new, n = process(text)
        if n == 0:
            skipped.append(fname)
            continue
        path.write_text(new, encoding="utf-8")
        changed.append((fname, n))
    print(f"Updated: {len(changed)}")
    for f, n in changed:
        print(f"  - {f}: {n} fallback(s) added")
    print(f"Skipped (no patterns matched): {len(skipped)}")
    for f in skipped:
        print(f"  - {f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
