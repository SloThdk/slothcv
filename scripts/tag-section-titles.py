"""
One-shot codemod: wrap every {section.title} (or {s.title} / {sec.title})
and every {transformHeader(X.title, ...)} in src/templates/*.tsx with
<EditableSectionTitle sid={X.id} data={data}>...</EditableSectionTitle>

Why a script: 36+ templates touch this pattern; manual edits are
error-prone and slow. This script runs idempotently — it skips
templates that already import EditableSectionTitle, and skips
sections that already have a custom data-element-id={titleId}
implementation (atlas / copenhagen / geist / vienna).
"""

from __future__ import annotations
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "src" / "templates"

# Files we DON'T touch:
#   components.tsx  — defines EditableSectionTitle; doesn't render headings
#   section-actions.tsx — uses section.title only in confirm prompt strings
#   shared.ts / registry.ts / renderer.ts / frame.tsx — no h2 here
#   custom-elements-layer.tsx — overlay layer, no section titles
SKIP_FILES = {
    "components.tsx",
    "section-actions.tsx",
    "shared.ts",
    "registry.ts",
    "renderer.ts",
    "frame.tsx",
    "custom-elements-layer.tsx",
}

# Templates that already wire data-element-id={titleId} on their <h2>
# directly — leave them alone (their custom implementation is fine and
# may have additional styling logic our wrapper would step on).
ALREADY_TAGGED = {
    "atlas.tsx",
    "copenhagen.tsx",
    "geist.tsx",
    "vienna.tsx",
}

# Patterns we rewrite, in order. Each tuple: (compiled_regex, replacement_fn).
# Replacement_fn takes a re.Match and returns the substitute string.

def repl_simple(m: re.Match) -> str:
    var = m.group(1)
    return f'<EditableSectionTitle sid={{{var}.id}} data={{data}}>{{{var}.title}}</EditableSectionTitle>'

def repl_transform_header(m: re.Match) -> str:
    var = m.group(1)
    second = m.group(2)
    return (
        f'<EditableSectionTitle sid={{{var}.id}} data={{data}}>'
        f'{{transformHeader({var}.title, {second})}}'
        f'</EditableSectionTitle>'
    )

PATTERNS: list[tuple[re.Pattern, "callable"]] = [
    # {transformHeader(X.title, Y)} — must run BEFORE {X.title} so the more-
    # specific match wins. {X.title} alone would otherwise match inside
    # the transformHeader call.
    (re.compile(r'\{transformHeader\(([a-zA-Z_]+)\.title,\s*([a-zA-Z_]+)\)\}'),
     repl_transform_header),
    # {section.title} / {s.title} / {sec.title} / {sect.title}
    (re.compile(r'\{(section|s|sec|sect)\.title\}'), repl_simple),
]


def update_imports(content: str) -> str:
    """Ensure `EditableSectionTitle` is in the import-from-./components line.

    Templates that don't currently import from ./components get a fresh
    import statement appended after the last existing `import ... from`
    line. Templates that DO import get EditableSectionTitle merged in.
    """
    if "EditableSectionTitle" in content:
        return content  # already imported

    # Look for an existing `from "./components"` import line.
    pat = re.compile(r'^import\s*\{([^}]*)\}\s*from\s*"\./components";', re.MULTILINE)
    m = pat.search(content)
    if m:
        existing = [s.strip() for s in m.group(1).split(",") if s.strip()]
        if "EditableSectionTitle" not in existing:
            existing.append("EditableSectionTitle")
        new_import = 'import { ' + ", ".join(sorted(set(existing))) + ' } from "./components";'
        return content[:m.start()] + new_import + content[m.end():]

    # No components import yet — splice one in after the last top-level
    # `import ... from ...;` line.
    import_pat = re.compile(r'^(import\s+[^;]+;)$', re.MULTILINE)
    last_import = None
    for hit in import_pat.finditer(content):
        last_import = hit
    if last_import is None:
        return content  # no imports at all — likely a non-template file
    insertion = '\nimport { EditableSectionTitle } from "./components";'
    return content[:last_import.end()] + insertion + content[last_import.end():]


def process(path: Path) -> str | None:
    """Return the rewritten content if changes were made, else None."""
    text = path.read_text(encoding="utf-8")
    new = text
    for pattern, fn in PATTERNS:
        new = pattern.sub(fn, new)
    if new == text:
        return None
    new = update_imports(new)
    return new


def main() -> int:
    changed = []
    skipped_already_tagged = []
    skipped_no_match = []
    for fname in sorted(os.listdir(TEMPLATES)):
        path = TEMPLATES / fname
        if not path.is_file():
            continue
        if fname in SKIP_FILES:
            continue
        if not fname.endswith(".tsx"):
            continue
        if fname in ALREADY_TAGGED:
            skipped_already_tagged.append(fname)
            continue
        result = process(path)
        if result is None:
            skipped_no_match.append(fname)
            continue
        path.write_text(result, encoding="utf-8")
        changed.append(fname)
    print(f"Updated:           {len(changed)}")
    for f in changed:
        print(f"  - {f}")
    print(f"Already tagged:    {len(skipped_already_tagged)}")
    for f in skipped_already_tagged:
        print(f"  - {f}")
    print(f"No match (skipped): {len(skipped_no_match)}")
    for f in skipped_no_match:
        print(f"  - {f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
