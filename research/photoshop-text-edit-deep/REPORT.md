# Why Photoshop's Type Tool Feels Great — and How to Replicate It on the Web

Research commissioned 2026-04-27 to diagnose persistent "jumping text" feel in slothcv's inline text editor. Saved here for the next pass to consult.

## TL;DR

The "Photoshop feel" comes from **five non-negotiable invariants**, and the original web implementation broke at least four. Confidence: high on the diagnosis, medium-high on the exact CSS prescription.

1. **The source layer's bounding-box anchor never moves while editing.** Box grows in the alignment direction (left-aligned grows right; centered grows symmetrically; right-aligned grows left). It does not push or pull surrounding content — because **a Photoshop document is absolute-positioned by design**. No flex/grid reflow ever. Web "jumping text" is largely a *web-stack flex-layout* artifact, not a UX choice.
2. **There is exactly one source of truth at a time.** During edit, the textarea/buffer holds the truth; the rendered layer is hidden or frozen. On commit, the layer absorbs the buffer. **No two-way live sync writes back to the document tree per keystroke.**
3. **Esc reverts, Enter (numeric/Cmd+Return) commits, click-outside commits.** Reverting reads from a snapshot taken at edit-start. Committing flushes the buffer and produces a single undo entry.
4. **The bounding box is locked during edit.** Either the box has fixed bounds (Paragraph Type) or text grows from a stable anchor without affecting siblings (Point Type). Either way, no neighbour reflow.
5. **The caret lives inside a native OS-owned input.** Visible glyphs are a separate render layer. The caret is never re-mounted or repositioned by app state.

**Fix order, highest ROI first:**

a. **Stop writing the Zustand store per keystroke.** Textarea owns the value during edit; commit only on Enter / blur. Esc = revert from snapshot.
b. **Lock the source `<h1>`'s box** to its measured pre-edit `getBoundingClientRect()`. Set `width`/`height`/`min-width`/`min-height`. Then `visibility: hidden` it (preserves layout space) so only the textarea is visible.
c. **`focus({ preventScroll: true })` inside `useLayoutEffect`** — without `preventScroll`, the browser scrolls to bring the focused element into view, which can cause a viewport jump.
d. (Architectural, optional now): make the template root `position: relative` with absolute-positioned text fields (Canva model). This is the long-term fix that eliminates the entire bug class.

---

## 1. Photoshop's Anchor Behavior — Each Case

Two text-layer kinds, with **different growth semantics**:

| Type | Created by | Bounds | Wrapping | Growth on type |
|---|---|---|---|---|
| **Point Type** | single click | none | only on Return | extends in alignment direction from anchor |
| **Paragraph (Area) Type** | click-and-drag | fixed box | wraps when text hits box edge | text reflows *inside* box; box stays put |

- **Point, left-aligned:** anchor is bottom-left of first character's baseline. Typing extends rightward. Left edge stays put.
- **Point, center-aligned:** anchor on baseline at horizontal center. Typing extends symmetrically left+right. Visual center never drifts.
- **Point, right-aligned:** anchor at bottom-right of last character. Typing extends leftward. Right edge stays put.
- **Paragraph type:** typing reflows inside the box; box never moves. Overflow shows a `+` in the bottom-right handle but the box does **not** auto-grow. User manually resizes.

**Why this never feels jumpy:** a Photoshop document does not have flex/grid/flow layout. Every layer is absolutely positioned in canvas coordinates. The H1 layer growing downward by 12px does **not** push the paragraph layer below it — that paragraph layer sits at its own absolute Y. **Photoshop's calm feel is partially a property of its layout model, not just its editor code.**

---

## 2. Editing Buffer Separation

Photoshop maintains a **separate edit buffer** during type-edit mode:

- **Enter edit mode:** snapshot the layer's current text+style (revert state), open an internal text-edit session backed by OS text input services (TSF on Windows, Text Input on macOS), switch the layer's render pipeline to "live edit render."
- **Type:** buffer mutates; canvas renders the buffer's content per frame. The **layer object on disk / in document model is not yet mutated.**
- **Esc:** discard buffer, revert to snapshot. (User-configurable since CC 2015 via `Preferences → Type → Use Esc key to commit text`.)
- **Enter (numeric keypad)** or **Cmd/Ctrl+Return** or **click outside** or **switch tool:** commit buffer to the layer object. **One** undo entry. Edit session ends.

Critical property: commit is **atomic, single-step, single-undo**. Per-keystroke commits would flood undo and produce per-frame document mutations the rest of the app reacts to. Photoshop deliberately avoids that.

For web: **the textarea is your buffer; the React/Zustand state is your committed layer.** Per-keystroke commit collapses the distinction and is the root cause of jumping text.

---

## 3. Bounding-Box Freeze During Edit

- **Paragraph Type:** box is frozen by definition (you drew it).
- **Point Type:** anchor edge is frozen; trailing edge advances per character by natural advance width. Computed in isolation per layer; **does not propagate to siblings** because layers are absolute.

There is no separate "freeze the box" code path in Photoshop. The freeze is a consequence of the architecture: text-layer bounds are computed *for that layer in isolation* and never feed an auto-layout system that affects siblings. Affinity Photo, Illustrator, Sketch, Canva, Figma all share this absolute-coordinate model.

**No design tool with absolute coordinates has the "jumping text" problem. The web problem is unique to flex/grid layout.**

---

## 4. Live Re-Layout vs Deferred Commit

Photoshop **does** live-relayout the visible glyph layer per keystroke (recomputes line breaks for Paragraph Type, extends glyph run for Point Type). What it does **not** do is propagate that to other layers, the document model, or undo stack.

Two different things — conflating them is the trap:

- **Visual update of the edit target** — must be live, per keystroke.
- **Document-model mutation + propagation** — must be deferred to commit.

The original slothcv code did both at once: keystroke writes Zustand → re-renders source `<h1>` → flex parent reflows → source's `getBoundingClientRect()` changes → overlay-positioning effect re-runs and moves the textarea → visible jump.

---

## 5. Caret Stability

Photoshop owns the caret directly — drawn from glyph metrics, blink cadence app-controlled. The OS provides keystrokes via TSF/IME but doesn't draw the caret.

On web it's easier: **the browser owns the textarea's caret**, and as long as you (a) don't unmount-remount the textarea, (b) don't reset its `value` from outside while typing, (c) don't change its position mid-keystroke, the caret is perfectly stable.

The original caret jumped specifically because:
1. Code wrote the textarea's value to Zustand on each keystroke.
2. Source `<h1>` re-rendered.
3. Flex parent reflowed; source's rect changed.
4. Overlay-positioning effect moved the textarea.
5. Moving an element during an active `input` event can disturb selection in some browsers, and visually the textarea has "jumped."

Symptom = "caret jumps." Cause = "container moved." Fix = "stop the container from moving."

> "If you have a caret in a middle position and the value changes unexpectedly, the input element won't make any assumption on the caret position, and will jump it to the end. As a general rule, do not change the input value asynchronously while the user is typing." — DEV.to, Solving Caret Jumping in React Inputs

---

## 6. Cross-Tool Comparison

| Tool | Editor model | Buffer | Commit trigger | Source visible during edit? | Source position stable? |
|---|---|---|---|---|---|
| **Photoshop** | Native OS text-edit, separate from layer model | Snapshot for revert | Enter (numeric), Cmd+Return, click outside, Esc (configurable) | Yes — layer renders the buffer live | Yes — absolute |
| **Affinity Photo** | Same model as PS, Serif's own engine, TSF-backed | Same | Same | Yes | Yes — absolute |
| **Illustrator** | Point/area type; same anchor behavior | Same | Plus Cmd+Return | Yes | Yes — absolute |
| **Figma** | Custom C++ text engine; canvas-rendered text + DOM hidden input/textarea for keystrokes/IME | Hidden DOM input | Enter (single-line), click outside, Esc | Visually yes (canvas reflects buffer); DOM input offscreen-positioned | Yes — pure absolute |
| **Sketch** | Native NSTextView in a layer | Cocoa text storage | Enter, blur | Yes | Yes — absolute |
| **Canva** | DOM-based; each element `position:absolute` inside fixed-size canvas div; contentEditable for inline | The contentEditable element itself | Click outside, Esc | Element IS the editor — no overlay | Yes — absolute siblings, no flex involved |
| **Excalidraw** | Hidden DOM textarea overlay over canvas-rendered text | textarea | Esc, click outside, Cmd+Enter | Original canvas text **hidden** during edit; only textarea shown | Yes — canvas absolute |
| **Konva** | DOM textarea overlay matched to canvas text style/position | textarea | Enter (no Shift), click outside, Esc | Original Konva text node **hidden** (`textNode.hide()`) during edit | Yes — canvas absolute |
| **CodeMirror** | Hidden textarea wrapped in `overflow:hidden;height:0` div, moved to align with cursor; render is separate | textarea | N/A (continuous) | Render mirrors buffer in real time, separate elements | Hidden textarea moves to follow cursor |

### Universal pattern across all of them

1. A native input element (textarea/input/NSTextView/contentEditable) receives keystrokes — **never** the rendered glyph element.
2. Rendered text updates visually per keystroke from the buffer.
3. The container is **absolute-positioned**, so growth never reflows siblings.
4. Commit is a **deliberate single act** (Enter/blur/Esc).
5. Either the source is hidden during edit (Excalidraw, Konva) **or** the source IS the editor (Canva, Notion) — but the source is **never live-driven by an outside store** during edit.

The original slothcv implementation had all five wrong: textarea overlay (good, kept) but writes to store per keystroke (bad), source is in a flex column (bad), no commit/revert distinction (bad), source visible+driven during edit (mixed-bad).

---

## 7. Web-Platform Translation

### 7a. Stop writing the store per keystroke

```tsx
// WRONG — per-keystroke commit
<textarea value={store.fields.name} onChange={(e) => store.setField('name', e.target.value)} />

// RIGHT — local buffer, commit on commit-event
const [buffer, setBuffer] = useState(() => store.fields.name);
const snapshotRef = useRef(store.fields.name);

useEffect(() => { snapshotRef.current = store.fields.name; }, []); // capture revert snapshot

const commit = () => { store.setField('name', buffer); onClose(); };
const revert = () => { onClose(); }; // do NOT write to store

return (
  <textarea
    value={buffer}
    onChange={(e) => setBuffer(e.target.value)}
    onBlur={commit}
    onKeyDown={(e) => {
      if (e.key === 'Escape') { e.preventDefault(); revert(); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
    }}
  />
);
```

This single change eliminates the rerender storm driving the layout shift.

### 7b. Lock the source's bounding box during edit

```tsx
// On edit-begin
const sourceEl = sourceRef.current!;
const rect = sourceEl.getBoundingClientRect();
sourceEl.dataset.editing = 'true';
sourceEl.style.minWidth  = `${rect.width}px`;
sourceEl.style.minHeight = `${rect.height}px`;
sourceEl.style.width     = `${rect.width}px`;
sourceEl.style.height    = `${rect.height}px`;

// On edit-end (commit OR revert)
sourceEl.style.removeProperty('width');
sourceEl.style.removeProperty('height');
sourceEl.style.removeProperty('min-width');
sourceEl.style.removeProperty('min-height');
delete sourceEl.dataset.editing;
```

Source occupies the same flex/grid space throughout — overlay's anchor coordinates remain valid.

### 7c. Hide the source visually during edit

```css
[data-editing="true"] { visibility: hidden; }
```

Use `visibility: hidden` (preserves box), **not** `display: none` (collapses box, defeats the lock). Both Excalidraw and Konva do this.

(slothcv uses `color: transparent` instead, which preserves the source's background/decorations — better in our case where templates may have colored bands behind the text.)

### 7d. `focus({ preventScroll: true })` in `useLayoutEffect`

Critical and rarely remembered. Without `preventScroll`, the browser scrolls the page so the focused textarea is in view, shifting the entire viewport.

```tsx
useLayoutEffect(() => {
  textareaRef.current?.focus({ preventScroll: true });
  textareaRef.current?.select(); // optional: select-all so typing replaces
}, []);
```

`useLayoutEffect` (synchronous, pre-paint) not `useEffect` (async, post-paint) — otherwise the user sees one frame at the wrong position.

### 7e. Position overlay using fixed coordinates captured once

Recompute only on scroll/resize, not per keystroke. Combined with (7b), the rect never changes during a keystroke.

### 7f. Mirror font metrics exactly

`window.getComputedStyle(sourceEl)` → copy `fontFamily`, `fontSize`, `fontWeight`, `letterSpacing`, `lineHeight`, `textAlign`, `color`, `padding` to the textarea inline style. Konva and Excalidraw both do this. Anything missed = visible glyph drift between source and overlay.

### 7g. Mount the overlay in a portal

Mount via `createPortal` to `document.body`, position absolutely. Otherwise an unrelated parent rerender can unmount the textarea, dropping focus and selection.

### 7h. Architectural fix (long-term)

Templates use `display: grid` with **explicit pixel row tracks** (`grid-template-rows: 60px 80px 200px ...`), or absolute-positioned children inside a fixed-size `position: relative` template root (Canva model). No row track is "auto" sized to text content. Then growth in one cell *cannot* move siblings because no sibling's position is content-derived.

This is the bigger refactor. Do (7a–g) first; only do (7h) if you keep fighting CSS in many other places.

---

## 8. Anti-Patterns That Cause Jumping Text (ranked by impact)

1. **Per-keystroke commit to a global store that drives the source render.** Single biggest culprit.
2. **`auto`-sized flex/grid items containing edit-target text.** Lock dimensions before opening overlay.
3. **`focus()` without `preventScroll: true`.**
4. **`useEffect` instead of `useLayoutEffect` for overlay positioning.** User sees wrong-position frame before snap.
5. **Re-measuring `getBoundingClientRect()` per keystroke.** Expensive (forced reflow) and stale.
6. **Driving textarea `value` from external state during typing.** Even setting `value={store.x}` causes React to set DOM `value` each render → can collapse selection. Use uncontrolled (`defaultValue`) or local-state-controlled.
7. **`display: none`-ing the source during edit.** Collapses the box → parent reflows → overlay moves. Use `visibility: hidden` or `color: transparent`.
8. **Mounting the textarea inside the source element.** If source rerenders, textarea unmounts/remounts → focus and selection lost. Use a portal at body root.
9. **Animating the overlay in.** A 200ms transition overlaps with the user's first keystrokes → wobbly feel. Open/close with no transition.
10. **Letting unrelated parent state changes (autosave, collab cursor) re-render the source.** `React.memo` the source render or skip rerenders while `isEditing === true`.

---

## 9. Concrete Action List for the slothcv CV Editor

Top-down by ROI; ship after #4 and reassess:

1. **Local buffer in the overlay.** No Zustand writes per keystroke. Commit on Enter / Cmd+Enter / blur. Esc reverts (just unmount; no write occurred). [SHIPPED 2026-04-27]
2. **`focus({ preventScroll: true })` inside `useLayoutEffect`.** [SHIPPED 2026-04-27]
3. **Lock source `width`/`height`/`min-*`** to measured pre-edit box. Set `data-editing="true"` and `[data-editing="true"] { visibility: hidden; }`. [SHIPPED 2026-04-27 with `color: transparent` instead — preserves template background bands]
4. **Mount overlay via React portal** at body root, positioned absolutely from source's pre-edit `getBoundingClientRect()` + scroll offset. Reposition only on scroll/resize. [DEFERRED — current rAF positioning works because `<InlineTextEditor />` is a stable sibling at the preview-stage level, not nested in the template tree]
5. **Mirror font metrics** from `getComputedStyle(source)` to textarea inline style at edit-begin. [SHIPPED — already in place]
6. **`React.memo`** the source render so unrelated store changes don't rerender during edit. [DEFERRED — would require per-template instrumentation]
7. **(Optional architectural):** templates → `display: grid` with explicit pixel row tracks, OR absolute-positioned children of a fixed `position: relative` root. [DEFERRED — large architectural change]

---

## 10. Direct Answers

- **Should live-commit per keystroke be removed entirely?** **Yes.** Buffer locally, commit on Enter/blur/Esc-revert. This is the single highest-leverage change and the universal pattern across Photoshop, Affinity, Figma, Illustrator, Excalidraw, Konva, Sketch, Canva.
- **Should the source element be size-locked during edit (CSS lock)?** **Yes.** Measure once, lock `width`/`height`/`min-*`, then `visibility: hidden` (or `color: transparent` if you need backgrounds visible). Release on edit-end.
- **Should `focus()` use `preventScroll`?** **Yes, always.** This is silent-but-critical.
- **Other invisible-but-critical details:** `useLayoutEffect` not `useEffect` for positioning + focus; portal-mount the overlay; mirror full computed style not just `font-size`; `React.memo` source while editing; never animate overlay open/close; `Esc` must not write to store (or, in slothcv's choice, treat Esc as a commit-and-exit per the canvas convention — but never as a partial write).

---

## 11. Things Not Verifiable From Public Sources

- **Whether Figma's text-edit overlay is contentEditable, hidden textarea, or a private DOM API.** Figma's engineering blog is vague — describes "custom text rendering" and in-house C++ layout, doesn't disclose the input element. Behaviorally Figma supports IME, drag-select, platform-native shortcuts, which strongly implies a hidden native `<textarea>` (the same trick CodeMirror, ProseMirror, Excalidraw use).
- **Whether Photoshop's edit buffer is structurally distinct or "marked dirty."** Adobe doesn't disclose. Behavior (atomic commit, single undo, full revert) is consistent with either. The functional contract is what matters; copy that, not the internals.
- **Notion's inline edit:** uses contentEditable on the block itself — no overlay. Each block IS the editor. Works because (a) blocks are vertically stacked with no horizontal flex sibling reflow, (b) growth in one block pushes blocks below by a small amount that reads as natural document growth, not as "the text I'm editing jumped."

---

## Sources

- Adobe — Create type in Photoshop: https://helpx.adobe.com/photoshop/using/creating-type.html
- Adobe — Edit text in Photoshop: https://helpx.adobe.com/photoshop/using/editing-text.html
- Adobe — Add text with Horizontal Type tool: https://helpx.adobe.com/photoshop/using/tool-techniques/horizontal-type-tool.html
- Julieanne Kost — Point vs Paragraph Type in Photoshop: https://blogs.adobe.com/jkost/2015/10/point-vs-paragraph-type-in-photoshop.html
- Julieanne Kost — 30 Tips for Working with Type: https://jkost.com/blog/2020/09/30-tips-tricks-and-shortcuts-for-working-with-type-in-photoshop.html
- Peachpit — Point Type and Area Type: https://www.peachpit.com/articles/article.aspx?p=715009&seqNum=2
- John Nack — Committing a text edit in PS and AI: https://blogs.adobe.com/jnack/2009/06/tip_committing_a_text_edit_in_ps_and_ai.html
- CreativePro — Secrets of the Esc Key: https://creativepro.com/secrets-of-the-esc-key/
- Marijn Haverbeke — Faking an editable control in browser JavaScript: https://marijnhaverbeke.nl/blog/browser-input-reading.html
- Konva — Editable Text: https://konvajs.org/docs/sandbox/Editable_Text.html
- Excalidraw — Text WYSIWYG Editor (DeepWiki): https://deepwiki.com/excalidraw/excalidraw/5.4-font-management
- Figma Blog — Building a professional design tool on the web: https://www.figma.com/blog/building-a-professional-design-tool-on-the-web/
- Figma Blog — Canvas, Meet Code (code layers): https://www.figma.com/blog/building-figmas-code-layers/
- Made By Evan — Figma engineering notes: https://madebyevan.com/figma/
- Andrew Chan — Notes From Figma II: https://andrewkchan.dev/posts/figma2.html
- MDN — HTMLElement.focus() (preventScroll): https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus
- SiteLint — Setting focus and preventing scroll: https://www.sitelint.com/blog/how-to-set-the-focus-on-element-and-prevent-from-scrolling
- DEV — Solving Caret Jumping in React Inputs: https://dev.to/kwirke/solving-caret-jumping-in-react-inputs-36ic
- DevMuscle — useLayoutEffect with Practical Example: https://devmuscle.com/blog/practical-usage-uselayouteffect
- CSS-Tricks — Editable Textarea Supporting Syntax-Highlighted Code: https://css-tricks.com/creating-an-editable-textarea-that-supports-syntax-highlighted-code/
- CSS-Tricks — Content Jumping (and How To Avoid It): https://css-tricks.com/content-jumping-avoid/
- Snook — Absolutely Positioned Textareas: https://snook.ca/archives/html_and_css/absolute-position-textarea
- GitHub — facebook/react#2047 ContentEditable caret jumps: https://github.com/facebook/react/issues/2047
- GitHub — facebook/react#955 Cursor jumps to end of controlled input: https://github.com/facebook/react/issues/955
