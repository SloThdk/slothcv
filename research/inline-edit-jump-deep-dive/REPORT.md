# Inline-edit jump — root cause + fix

Research commissioned 2026-04-27 (third pass on the same bug — text appearing to jump downward when entering inline edit on the canvas, then snapping back to the correct position on commit). Saved here for future reference.

## TL;DR

The visible jump-down was a **`<textarea>` baseline mismatch**, not a wrapper-positioning bug. The wrapper was correctly positioned at the source's top — but inside the wrapper the `<textarea>` (a **replaced element** with intrinsic sizing rules) renders its first line of text at a slightly LOWER y than a `<div>`/`<span>`/`<h1>` of the same font would.

The cure was to **stop using `<textarea>` and use a `contentEditable` `<div>` instead**. A contentEditable div is NOT a replaced element, has no intrinsic-size quirks, no internal anonymous shadow div with its own line-box rules, no caret-area padding, no UA box-sizing surprise. Its glyphs render at IDENTICAL positions to a regular `<div>` — and therefore identical to the source `<h1>`/`<span>`/`<p>` it overlays.

Industry confirms: Webflow, Framer, Penpot, Plasmic, TipTap, and ProseMirror all use contentEditable for this exact scenario. **Excalidraw uses `<textarea>` and explicitly hacks `height *= 1.05` to mask the same bug.** We can do better.

Confidence: **HIGH on the mechanism** (replaced-element baseline mismatch is documented in MDN + the Excalidraw codebase explicitly references the buffer hack). Confidence on the fix: **HIGH** — contentEditable is the standard.

---

## 1. Root cause

### 1a. The mechanism

`<textarea>` is a **replaced element** (HTML spec / MDN). For grid items, `align-self: normal` resolves to `stretch` for regular elements but to **`start` for replaced elements with intrinsic size** (CSS Box Alignment Module Level 3, MDN `align-self`).

In the editor's grid setup, the wrapper `<div style={{display: "grid", minHeight: rect.height, ...}}>` contained two children both at `gridArea: "1 / 1 / 2 / 2"`:

- The **replica `<div>`** (regular block element) → `align-self: stretch` → stretches to fill the grid cell. Its content sits at the TOP of the stretched cell.
- The **`<textarea>`** (replaced element) → `align-self: start` → sits at the TOP of the grid cell with its INTRINSIC HEIGHT (1 row × computed line-height). Does NOT stretch.

Inside the textarea, text glyphs are rendered by a UA-internal anonymous block (Chromium `RenderBlockFlow` / `HTMLTextAreaElement::CreateRendererForElement`). That internal block has its OWN line-box rules — and Chromium / Firefox both ship a small **vertical caret-affordance offset** on textareas: text glyphs render with the FIRST line's content area inset by 1-2px from the top of the textarea's content box, to make room for the caret blink without clipping. This is documented in Mozilla bug tracker (bug 1099204 textarea text scrolls under padding; bug 157846 incorrect padding implementation) and CSS-Tricks' "Box Sizing and Textarea." **It is not configurable via CSS.**

So:
- Source `<h1>` renders glyph baseline at `source.top + 0.78 × line-height` (typical font metric).
- Textarea — even with identical font, font-size, line-height — renders glyph baseline at `textarea.top + 0.78 × line-height + 1-2px caret-padding`.
- Textarea's TOP equals wrapper's TOP equals source's TOP.
- Visible glyphs are 1-2px LOWER inside the textarea than they were inside the source.

User sees a jump-down at edit start. On commit, the textarea unmounts, the source's `color: transparent` is restored to its snapshot value (re-coloring it visible), and source glyphs re-appear at their true position → "snaps back."

This is amplified when:

- Source has padding/leading that makes `rect.height > 1 × line-height` — when the cell is taller than the textarea AND the textarea is `align-self: start`, the textarea sits at the top with empty space below — but the textarea text STILL has the 1-2px internal offset.
- The user has bumped `lineSpacing` to 1.8 in Design tab. The line-box can be ~42px tall and the textarea's internal offset is amplified — visible jump can be **~5-15px**, exactly "to maybe a line."

### 1b. Things ruled out (active investigation, not the cause)

- **Ancestor with `transform`/`filter`/`perspective`/`will-change` making `position: fixed` reference that ancestor.** Grepped `src/app` and the preview ancestor chain — no such property above `<InlineTextEditor />`. The page-sheet inner div HAS `transform: scale(...)`, but the InlineTextEditor is mounted as a SIBLING outside that scaled div.
- **Zustand subscriber that mutates source layout when `editingElementId` flips.** Grepped — only `inline-text-editor.tsx` and `preview.tsx` subscribe. Preview only reads it for the dblclick handler. No layout mutation.
- **Hover affordances changing layout when source loses hover.** All hover states use `hover:ring-*` and `hover:bg-*` — both paint-only (box-shadow + background-color). Don't affect layout.
- **`SectionActions` floating buttons appearing on `group-hover`.** Use `position: absolute; opacity-0 group-hover:opacity-100`. Absolute positioning takes them out of flow — adding/removing doesn't affect siblings.
- **`select()` triggering scroll-into-view.** Would manifest as a CANVAS scroll, not a within-line glyph shift. Different symptom.

---

## 2. The fix

Switch the `<textarea>` for a `contentEditable` `<div>`. Eliminates the replaced-element baseline mismatch AND the UA-internal text offset in one step. The replica trick still drives auto-grow — both grid children are now plain `<div>`s with identical layout semantics.

Required adjustments (all in `src/components/editor/inline-text-editor.tsx`):

1. **Type the ref as `HTMLDivElement`** (was `HTMLTextAreaElement`).
2. **Initialize the contentEditable's content imperatively, NOT via React children.** Passing `{text}` as children would have React reconcile children on every state change — clobbering the user's caret. Set `el.innerText = initialText` inside the focus useLayoutEffect (right after focus + before select). The contentEditable becomes uncontrolled; React doesn't manage its children. Only `latestTextRef.current` and the local `text` state mirror it for the commit path and the replica's auto-grow.
3. **Update `onTextChange` → `onContentInput`** to read from `innerText` rather than `e.target.value`. `innerText` (NOT `textContent`) preserves visible whitespace and works with the trailing-space replica.
4. **Update the focus/select-all `useLayoutEffect`** — `<div contenteditable>` doesn't have `.select()`. Use a Range API:
   ```tsx
   const range = document.createRange();
   range.selectNodeContents(el);
   const sel = window.getSelection();
   sel?.removeAllRanges();
   sel?.addRange(range);
   ```
5. **Keep the existing `committedRef` guard** — exactly-once commit logic doesn't change.
6. **`contenteditable="plaintext-only"`** is Newly Baseline 2024 (Chrome 120+, Safari 17+, Firefox 122+) — strips formatting from paste, prevents accidental rich-text injection, behaves like a textarea for input semantics.

That's the entire change. **No template changes, no schema changes, no store changes.**

### Why this works (mechanism)

A `<div contenteditable>` is NOT a replaced element. `align-self: normal` resolves to `stretch` for it (matching the replica div). It has no UA-internal anonymous shadow div with its own line-box rules — it IS the rendering block. It has no caret-affordance padding. Its `getBoundingClientRect()` and its glyph baselines obey the same layout rules as any other `<div>`. When stacked in a grid cell with the replica, both render identically; both glyphs sit on the same baseline; the source `<h1>` underneath uses the same baseline; **the visible text does not jump.**

---

## 3. Why the previous attempts didn't work

### Attempt 1 — Per-keystroke live-commit removed
**Fixed:** the source's text was being mutated on every keystroke → React rerender → flex parent reflow → source rect shift → rAF chase → visible flicker as the user typed.
**Didn't fix the jump:** the jump happens in the FIRST FRAME after textarea mount, BEFORE any keystroke. Live-commit is a typing-time problem; this is a mount-time problem. Same symptom (text moves), different mechanism.

### Attempt 2 — `focus({ preventScroll: true })`
**Fixed:** browser auto-scroll-into-view that pans the canvas a few pixels when textarea grabs focus. Real fix.
**Didn't fix the jump:** the jump is a **glyph-position-INSIDE-the-textarea** phenomenon, not a viewport-scroll phenomenon. `preventScroll` keeps the canvas where it is — the textarea STILL renders text 1-2px lower than the source did. Two unrelated bugs.

### Attempt 3 — Locked source element width/height to measured pre-edit dimensions
**Tried:** pin the source's box so the rAF loop has nothing to chase.
**Made it worse because:** setting an explicit `width` on a flex/grid CHILD changes the basis used by the parent's layout algorithm. The parent re-runs layout with the NEW basis → source ends up at a slightly different position → the act of LOCKING moved the very thing the lock was meant to pin.
**Wouldn't have fixed the original jump anyway:** the jump is inside the textarea's own rendering, not in the source's position. Locking the source's box has no effect on what happens INSIDE the textarea overlay.

### Attempt 4 — Replica `text + "\n"` swapped to `text + " "`
**Fixed:** a `\n` in `whiteSpace: pre-wrap` forces a phantom second line — the replica was 2 lines tall, the wrapper grew to 2 lines, the focus ring was 2× taller than the source. Trailing space keeps it single-line. Real fix for "the box looks too tall."
**Didn't fix the jump:** the jump is the **vertical position of the textarea's glyphs**, not the height of the wrapper. Reducing the wrapper height doesn't move the textarea's first-line glyph baseline (textarea is still `align-self: start` and still has the UA caret offset).

---

## 4. Edge cases the fix handles

- **Multi-line sources** (Summary body, Custom body, long Hobbies paragraph). contentEditable handles multi-line via `Enter` → `\n` in `innerText` (plaintext-only mode). Replica trick still drives auto-grow because both children remain plain `<div>`s.
- **RTL text** (Arabic, Hebrew). Both `<textarea>` and `<div contenteditable>` honor `direction: rtl`.
- **CJK / IME composition.** contentEditable supports IME via `compositionstart`/`compositionupdate`/`compositionend` events. `onInput` fires AFTER `compositionend` on Chrome / Safari.
- **Tiny inline `<span>`s** (date / location with `text-[0.85em]`). Fix applies identically.
- **Custom (toolshelf) text elements.** Have their own `EditableText` path inside `CustomElementsLayer` that ALREADY uses contentEditable. Unchanged.
- **Editable date pair (`startDate — endDate`).** Each date span gets its own InlineTextEditor session; same fix.
- **Custom font feature settings** (Lora, Manrope, JetBrains Mono). Font-feature-settings in the snapshot already cover this. contentEditable inherits identically.
- **Zoom levels 50/75/100/fit.** `visualScale` math doesn't change.
- **Dark mode templates / colored backgrounds.** Wrapper background paint-only; caretColor flows through.
- **Strict Mode double-effect cycle.** `committedRef` guard handles this — unchanged.
- **A→B switch** (user clicks one element while editing another without committing first). The cleanup-closure pattern handles this — unchanged.

---

## 5. Reference patterns from industry

### Webflow (Rich Text element editing)
Uses contentEditable on the actual rendered element (in-place, not overlay). Double-click → `contentEditable=true` set on the same `<div>` that was rendering the text. No baseline shift because nothing got swapped.

### Framer (on-page editing)
Same approach as Webflow — contentEditable in-place on text layers.

### Excalidraw (textWysiwyg) — the OUTLIER
Uses `<textarea>` overlay because their canvas-rendered text isn't real DOM (it's painted via Canvas2D `fillText`, so they MUST swap to a real form element for editing). They explicitly acknowledge the visual jump in their codebase: `height *= 1.05;` in `updateWysiwygStyle()` is commented as a 5% buffer "to prevent jumping." **They never solved the underlying mismatch — they just made the textarea taller so the user doesn't notice the cursor touching the bottom edge.**

### TipTap / ProseMirror
Both use contentEditable on the editor root. The library expects FULL CONTROL of a contentEditable region. ProseMirror's `EditorView.dom` IS a contentEditable div.

### Penpot
Uses `<foreignObject>` SVG with contentEditable HTML inside.

### Plasmic
contentEditable overlay model nearly identical to slothcv's after the fix.

### CSS-Tricks "cleanest trick for autogrowing textareas"
Source of the grid-cell + replica pattern. **Works just as well with contentEditable + replica as with textarea + replica** — the replica drives the grid track size, the editing element fills the cell.

---

## Sources

- MDN — `<textarea>` element (replaced element baseline behavior): https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/textarea
- MDN — `align-self`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/align-self
- MDN — `vertical-align`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/vertical-align
- MDN — Box alignment in CSS Grid layout: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Box_alignment_in_grid_layout
- CSS-Tricks — The Cleanest Trick for Autogrowing Textareas: https://css-tricks.com/the-cleanest-trick-for-autogrowing-textareas/
- CSS-Tricks — `align-self` almanac (replaced-element exception): https://css-tricks.com/almanac/properties/a/align-self/
- CSS-Tricks — Box Sizing and Textarea (UA differences): https://css-tricks.com/examples/BoxSizing/
- Excalidraw — Text WYSIWYG Editor (DeepWiki, confirms `height *= 1.05;` "to prevent jumping"): https://deepwiki.com/excalidraw/excalidraw/5.4-font-management
- Excalidraw textWysiwyg.tsx (GitHub): https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/wysiwyg/textWysiwyg.tsx
- Mozilla bug 1099204 — Textarea text scrolls under padding (UA-internal text positioning): https://bugzilla.mozilla.org/show_bug.cgi?id=1099204
- Mozilla bug 157846 — Incorrect padding implementation on textareas: https://bugzilla.mozilla.org/show_bug.cgi?id=157846
- Chromium issue 41492445 — `scrollIntoView` not prevented by `focus({preventScroll: true})`: https://issues.chromium.org/issues/41492445
- web.dev — contentEditable `plaintext-only` Newly Baseline (2024): https://web.dev/blog/contenteditable-plaintext-only-baseline
- Webflow Help — Rich text element overview (in-place contentEditable): https://help.webflow.com/hc/en-us/articles/33961256808467-Rich-text-element-overview
- Framer Help — On-Page Editing (contentEditable on text layers): https://www.framer.com/help/articles/on-page-editing/
- TipTap FAQ — "library expects full control of the contentEditable div": https://tiptap.dev/docs/guides/faq
- Penpot — Block 1: Handle text: https://penpot.app/courses/block-1/handle-text/
- Plasmic Substack — Introducing: New simplified canvas with interactive editing: https://plasmic.substack.com/p/introducing-new-simplified-canvas
- Vincent De Oliveira — Deep dive CSS: font metrics, line-height and vertical-align: https://iamvdo.me/en/blog/css-font-metrics-line-height-and-vertical-align
