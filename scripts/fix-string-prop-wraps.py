"""
Second-pass fixer: my wrap-editable-fallback.py also matched
`{X.field || "Label"}` when it was being passed as a STRING PROP
to a custom component (e.g. `label={l.label || "Link"}` →
`label=<EditableFallback ... />`). The result is invalid JSX
because the component expects a string.

Detect any `(prop)=<EditableFallback ... value={X.Y} placeholder="Z" />`
occurrence (i.e. an EditableFallback NOT preceded by `{`) and revert
it to `(prop)={X.Y || "Z"}`.

Idempotent. Run after wrap-editable-fallback.py + fix-template-literal-bug.py.
"""

from __future__ import annotations
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "src" / "templates"

# `<word>=<EditableFallback ... />` — a JSX element being passed as
# the value of a JSX prop instead of inside `{...}` braces. The
# EditableFallback children are pulled from the `value` and `placeholder`
# props so we can rebuild the original `{X.Y || "Z"}` expression.
PATTERN = re.compile(
    r'(\w+)=<EditableFallback\s+data=\{data\}\s+'
    r'fieldId=\{`[^`]+`\}\s+'
    r'value=\{(\w+)\.(\w+)\}\s+'
    r'placeholder="([^"]+)"\s*/>'
)


def process(content: str) -> tuple[str, int]:
    count = 0

    def repl(m: re.Match) -> str:
        nonlocal count
        prop = m.group(1)
        var = m.group(2)
        field = m.group(3)
        label = m.group(4)
        count += 1
        return f'{prop}={{{var}.{field} || "{label}"}}'

    return PATTERN.sub(repl, content), count


def main() -> int:
    changed = []
    for fname in sorted(os.listdir(TEMPLATES)):
        path = TEMPLATES / fname
        if not path.is_file() or not fname.endswith(".tsx"):
            continue
        text = path.read_text(encoding="utf-8")
        new, n = process(text)
        if n == 0:
            continue
        path.write_text(new, encoding="utf-8")
        changed.append((fname, n))
    print(f"Reverted: {len(changed)}")
    for f, n in changed:
        print(f"  - {f}: {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
