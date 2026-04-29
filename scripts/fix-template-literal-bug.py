"""
The wrap-editable-fallback.py regex `\{(it|c|...)\.field \|\| "Label"\}`
also matched `${X.Y || "Label"}` inside template literals — the inner
`{X.Y || "Label"}` looks identical and the regex didn't anchor on a
non-`$` boundary. Result: a stray `<EditableFallback>` JSX tag landed
inside a backtick template literal, which is a syntax error.

This fix walks every bespoke template, finds the broken pattern
  `$<EditableFallback ... value={X.Y} placeholder="Z" />`
and reverts JUST that substitution back to
  `${X.Y || "Z"}`
which is valid JS inside template literals.

Idempotent. Safe to run after every wrap pass.
"""

from __future__ import annotations
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "src" / "templates"

# Pattern: a `$` immediately followed by an <EditableFallback> JSX tag.
# That `$` proves the substitution landed inside a template literal,
# not a JSX expression. Capture the original variable, field, and label
# so we can rebuild the `${X.Y || "Label"}` interpolation.
PATTERN = re.compile(
    r'\$<EditableFallback\s+data=\{data\}\s+'
    r'fieldId=\{`section\.\$\{section\.id\}\.item\.\$\{(\w+)\.id\}\.\w+`\}\s+'
    r'value=\{(\w+)\.(\w+)\}\s+'
    r'placeholder="([^"]+)"\s*/>'
)


def process(content: str) -> tuple[str, int]:
    count = 0

    def repl(m: re.Match) -> str:
        nonlocal count
        # All three captured `var` references (id-loop var, value var,
        # field) should match — they came from the same item — but we
        # use the value-side var/field as the source of truth since
        # that's what the original template literal actually rendered.
        var = m.group(2)
        field = m.group(3)
        label = m.group(4)
        count += 1
        return f'${{{var}.{field} || "{label}"}}'

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
        print(f"  - {f}: {n} mis-placed wrap(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
