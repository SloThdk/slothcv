"""
Add the EditableSectionTitle import to every template file that uses
<EditableSectionTitle ...> but doesn't import it. Idempotent — safe to
re-run.
"""
from __future__ import annotations
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "src" / "templates"


def has_correct_import(content: str) -> bool:
    """Does the file already have EditableSectionTitle in an import?"""
    return bool(re.search(r'import\s*\{[^}]*EditableSectionTitle[^}]*\}', content))


def add_import(content: str) -> str:
    """Splice EditableSectionTitle into the existing ./components import,
    or add a new line if missing."""
    pat = re.compile(r'^import\s*\{([^}]*)\}\s*from\s*"\./components";', re.MULTILINE)
    m = pat.search(content)
    if m:
        existing = [s.strip() for s in m.group(1).split(",") if s.strip()]
        if "EditableSectionTitle" in existing:
            return content
        existing.append("EditableSectionTitle")
        new_import = 'import { ' + ", ".join(sorted(set(existing))) + ' } from "./components";'
        return content[:m.start()] + new_import + content[m.end():]
    # No ./components import — add one.
    import_pat = re.compile(r'^(import\s+[^;]+;)$', re.MULTILINE)
    last_import = None
    for hit in import_pat.finditer(content):
        last_import = hit
    if last_import is None:
        return content
    insertion = '\nimport { EditableSectionTitle } from "./components";'
    return content[:last_import.end()] + insertion + content[last_import.end():]


def main() -> int:
    fixed = []
    skipped = []
    for fname in sorted(os.listdir(TEMPLATES)):
        path = TEMPLATES / fname
        if not path.is_file() or not fname.endswith(".tsx"):
            continue
        text = path.read_text(encoding="utf-8")
        if "<EditableSectionTitle" not in text:
            continue
        if has_correct_import(text):
            skipped.append(fname)
            continue
        new = add_import(text)
        if new == text:
            print(f"WARN couldn't add import to {fname}")
            continue
        path.write_text(new, encoding="utf-8")
        fixed.append(fname)
    print(f"Fixed:   {len(fixed)}")
    for f in fixed:
        print(f"  - {f}")
    print(f"Skipped (already had import): {len(skipped)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
