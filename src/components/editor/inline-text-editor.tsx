/**
 * InlineTextEditor — absolutely-positioned `<div contenteditable>` that
 * overlays the source text element being edited. Activated by double-
 * clicking any text element with a registered lens (see
 * `src/lib/element-text-lens.ts`).
 *
 * # Why this looks the way it does (Photoshop polish)
 *
 * The hard requirement: editing should feel like Photoshop's Type Tool.
 * Double-click → caret appears in place → type → text grows from the
 * anchor without the surrounding layout shifting underneath the user.
 * Commit on Enter / Esc / click-outside. No "jumping" of the overlay,
 * no surprise scroll, no caret races.
 *
 * Four engineering decisions deliver that feel:
 *
 * 1. **The editor is a `<div contenteditable="plaintext-only">`, NOT a
 *    `<textarea>`.** This is the single most important decision and
 *    the cure for the residual "text jumps DOWN at edit-start" bug
 *    that lingered after every other fix. Why textarea was wrong:
 *      a) `<textarea>` is an HTML REPLACED element. Inside CSS Grid,
 *         `align-self: normal` resolves to `start` for replaced
 *         elements (vs. `stretch` for regular blocks). The replica
 *         `<div>` next to it stretches; the textarea didn't —
 *         vertical mismatch baked into the layout step.
 *      b) Chrome / Firefox both ship a 1-2 px UA caret-affordance
 *         offset baked into textarea's INTERNAL text rendering. It's
 *         not configurable from CSS (Mozilla bugs 1099204, 157846).
 *         Identical font-family / font-size / line-height between
 *         `<textarea>` and `<h1>`/`<span>`/`<p>` STILL produces a
 *         visible 1-15 px glyph-position shift, depending on the
 *         user's lineSpacing in Design tab.
 *    A `<div contenteditable>` is not replaced, has no UA caret
 *    offset, and stretches like any other block — its glyphs land at
 *    EXACTLY the same baseline as the source `<h1>` / `<span>` it
 *    overlays. Webflow / Framer / Penpot / Plasmic / TipTap /
 *    ProseMirror all use this approach. (Excalidraw uses `<textarea>`
 *    and works around the same bug with a 5 % height buffer hack —
 *    we can do better.)
 *
 * 2. **No live-commit during edit.** The textarea fix above kills the
 *    mount-time jump. This kills the mid-typing jump: writing each
 *    keystroke into the Zustand store via `lens.write` was triggering
 *    a React rerender of the template subtree → the source element's
 *    text changed → its parent's layout reflowed → the source's
 *    bounding rect shifted → the rAF position-sync loop dragged the
 *    overlay to the new spot → the user saw their text leap mid-
 *    stroke. Photoshop's Type Tool keeps the underlying text frame
 *    static during edit and commits on exit — we now match that.
 *    Local React state holds the typed value; `lens.write` runs once
 *    on commit (blur / Esc / Cmd+Enter).
 *
 * 3. **Source text + box are frozen during edit.** The source element
 *    is rendered with `color: transparent`, so the user only sees the
 *    overlay. Because we no longer mutate the data store during edit,
 *    the source's content (and therefore its bounding box) is rock
 *    stable. The overlay grows freely (CSS-grid auto-sizing) without
 *    chasing a moving target. On commit, the source rerenders with the
 *    new text — but by then the overlay is gone, so any layout shift
 *    happens AFTER the user has committed and is expected.
 *
 * 4. **`focus({ preventScroll: true })`.** Default `focus()` triggers
 *    the browser's "scroll into view" behaviour, which pans the canvas
 *    by a few pixels the moment the editor mounts. Even though the
 *    rAF loop catches the shift and re-syncs, the user perceives it as
 *    the text "jumping". `preventScroll: true` blocks the auto-scroll
 *    entirely — the canvas stays put.
 *
 * # Other invariants worth preserving
 *
 *   - The editor AUTO-GROWS via the CSS-grid replicated-content trick:
 *     a hidden `<div>` mirroring the typed text shares the same grid
 *     cell, and the grid track sizes to the taller child. No JS
 *     scrollHeight resize, no per-keystroke flicker. The technique is
 *     widely documented (CSS-Tricks: "The Cleanest Trick for
 *     Autogrowing Textareas") — it works EVEN BETTER with two
 *     `<div>`s than with a `<div>` + `<textarea>` because both
 *     children now lay out identically.
 *   - The contentEditable's content is set IMPERATIVELY via
 *     `innerText` in the focus useLayoutEffect — React doesn't
 *     reconcile its children. This is the universal pattern for
 *     contentEditable + React (passing `text` as children would have
 *     React clobber the user's caret on every rerender; see
 *     facebook/react#2047, #955).
 *   - Focus + select-all run inside `useLayoutEffect`, NOT
 *     `requestAnimationFrame`, so they commit BEFORE the browser
 *     paints the overlay. Otherwise the user sees one frame of an
 *     unfocused, mis-sized editor — the "bouncing" feel. select-all
 *     uses the Range API (contentEditable has no `.select()`).
 *   - The rAF position-sync loop is STILL needed to handle EXTERNAL
 *     shifts (canvas scroll, parent zoom, sibling section reflow).
 *     Now that the source's text is frozen, the loop almost never
 *     triggers a re-render — but it's there as insurance.
 *   - **Enter inserts a newline** — `contenteditable="plaintext-only"`
 *     makes Enter insert "\n" into innerText (matches textarea
 *     behaviour). Esc / Cmd-Enter / click-outside all COMMIT and
 *     exit. There is no "revert" path — matches Photoshop, Figma,
 *     Illustrator, Canva (the canvas-tool convention). Web-form
 *     muscle memory says Esc cancels, but the canvas convention is
 *     the stronger pull here (prior research at
 *     research/text-in-container-ux/ and
 *     research/inline-edit-jump-deep-dive/).
 *
 * # Why an overlay instead of contentEditable in place?
 *   1. **No template refactor.** Templates render `<h1>{name}</h1>` with
 *      whatever styling fits the design. Adding `contentEditable` to
 *      every text node across all templates would be a deep rewrite.
 *      The overlay reads the element's bounding rect, mirrors its
 *      position and font styles, and lets the user edit there —
 *      templates stay as-is.
 *   2. **React rerender stability.** If we set contentEditable=true on
 *      a React-managed node, the next rerender would clobber the user's
 *      typed text (React owns the children prop). The overlay lives
 *      OUTSIDE the template tree so React rerenders never interfere.
 */

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useEditorStore } from "@/lib/store/editor";
import { elementTextLens } from "@/lib/element-text-lens";

interface OverlayRect {
  /** Bounding rect of the element being edited, in viewport coordinates.
   *  This is POST-SCALE — if the preview is at 60% zoom, the rect is
   *  60% of the element's intrinsic size. */
  rect: DOMRect;
  /** Effective visual scale (cumulative product of all transform: scale
   *  parents). Multiply font/spacing CSS values by this to get the
   *  actual rendered size. */
  visualScale: number;
  /** Computed font styles copied from the source element. Pixel values
   *  are CSS px (pre-scale) — visualScale is applied at render time.
   *  All four paddings are captured so the editing overlay never has
   *  text touching the focus ring edge. borderRadius is read so the
   *  box-shadow ring follows the template's corner shape. The extended
   *  metrics (fontFeatureSettings / fontVariantNumeric / fontKerning /
   *  tabSize) are read because UA defaults differ from the source's
   *  typography settings — without copying them you get sub-pixel
   *  character drift on mount, which the eye reads as a "twitch". */
  font: {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    color: string;
    textAlign: string;
    lineHeight: string;
    letterSpacing: string;
    textTransform: string;
    paddingLeft: number;
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    borderRadius: string;
    fontFeatureSettings: string;
    fontVariantNumeric: string;
    fontKerning: string;
    tabSize: string;
  };
}

export function InlineTextEditor() {
  const editingElementId = useEditorStore((s) => s.editingElementId);
  const data = useEditorStore((s) => s.data);
  const setPersonal = useEditorStore((s) => s.setPersonal);
  const updateSection = useEditorStore((s) => s.updateSection);
  const setEditingElementId = useEditorStore((s) => s.setEditingElementId);

  const [overlay, setOverlay] = useState<OverlayRect | null>(null);
  // Editor element is a `<div contenteditable>` (NOT a `<textarea>`),
  // because textarea is a REPLACED element and inside CSS Grid that
  // resolves `align-self: normal → start` for replaced elements (vs.
  // `stretch` for regular blocks like the replica), and on top of that
  // Chrome / Firefox bake a 1-2 px UA caret-affordance offset into the
  // textarea's internal text rendering — the two effects together make
  // the textarea's first-line glyphs render visibly LOWER than the
  // source `<h1>` / `<span>` / `<p>` it overlays. A `<div
  // contenteditable>` is not replaced, has no UA-internal text offset,
  // and stretches to fill the grid cell — its glyphs land at exactly
  // the same baseline as the source. Same trick used by Webflow /
  // Framer / Penpot / Plasmic / TipTap / ProseMirror.
  const taRef = useRef<HTMLDivElement | null>(null);
  const [text, setText] = useState("");

  // Reference + saved styles for the source element so we can hide its
  // text during edit AND lock its outer box during edit, then restore
  // both on close. Stored in a ref so the cleanup effect can run
  // without re-querying the DOM.
  //
  // The original* fields snapshot the inline-style strings BEFORE we
  // mutate them. Restore writes the snapshots back verbatim, which
  // naturally returns the element to "no inline override" if it had
  // no override originally, OR to the original override if it did
  // (e.g. a template-level inline color). Empty string clears the
  // inline property entirely.
  //
  // Note: we no longer snapshot `originalText` because we no longer
  // mutate the data store during edit (the typed value lives in local
  // React state until commit). Nothing to revert.
  const sourceRef = useRef<{
    el: HTMLElement;
    originalColor: string;
    originalWidth: string;
    originalHeight: string;
    originalMinWidth: string;
    originalMinHeight: string;
    originalMaxWidth: string;
    originalMaxHeight: string;
  } | null>(null);

  // Latest value typed into the textarea, available to commit handlers
  // (blur, Esc, Cmd+Enter) without going through React's stale-closure
  // dance. We always read this ref when committing so the final write
  // reflects the very last keystroke even if React batched the state
  // update.
  const latestTextRef = useRef("");

  // Guards against double-commit. The same edit session can route
  // through commit() (Esc / Cmd+Enter / blur handler) AND through the
  // useLayoutEffect cleanup (when editingElementId changes). Both
  // would otherwise write the typed value to the store. The flag is
  // reset to false on each edit-session setup; flipped to true on the
  // first commit; checked by every subsequent commit attempt.
  //
  // Strict-mode safety: React 18 strict mode double-invokes effects.
  // The first cleanup pass would commit immediately (with the initial
  // text, equal to lens.read()). The flag prevents that no-op from
  // burning a write.
  const committedRef = useRef(false);

  // Tracks which edit session has already been focus+select'd. The
  // focus useLayoutEffect runs every time `overlay` changes (rAF
  // position-sync rewrites overlay each frame the source moves), so
  // without this guard we'd re-focus mid-keystroke and collapse the
  // user's caret / selection. Set to the editingElementId on the
  // first successful focus call; reset to null when the edit session
  // ends.
  const focusedSessionRef = useRef<string | null>(null);

  // Resolve the lens for the active element-id.
  const lens = editingElementId
    ? elementTextLens(editingElementId, data, { setPersonal, updateSection })
    : null;

  // Capture rect + font + hide source text when an edit starts; the
  // returned cleanup commits the typed value AND restores the source on
  // exit (whether the exit is a user blur, a programmatic
  // setEditingElementId(null), or the user double-clicking a different
  // element directly without first committing). Putting cleanup in the
  // effect's return function (rather than a top-of-effect
  // `if (!editingElementId)` branch) is what makes the A→B switch
  // correct — React runs the previous cleanup before the next setup.
  //
  // useLayoutEffect commits synchronously after DOM mutation but BEFORE
  // the browser paints, so the overlay never appears in an intermediate
  // "not yet focused / not yet sized" state.
  useLayoutEffect(() => {
    if (!editingElementId) return;
    const el = document.querySelector(
      `[data-element-id="${cssEscape(editingElementId)}"]`,
    ) as HTMLElement | null;
    if (!el || !lens) {
      setEditingElementId(null);
      return;
    }

    // Capture computed font / paddings BEFORE we mutate the source.
    // `getComputedStyle` returns a LIVE CSSStyleDeclaration so reading
    // `cs.color` AFTER `el.style.color = "transparent"` would resolve
    // to "rgba(0,0,0,0)" — the overlay would then render invisible
    // text. Snapshot every value we care about here, drop the live
    // reference, and the rest of this effect can mutate freely.
    const cs = window.getComputedStyle(el);
    const fontSnapshot = {
      fontFamily: cs.fontFamily,
      fontSize: parseFloat(cs.fontSize) || 16,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      color: cs.color,
      textAlign: cs.textAlign,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      textTransform: cs.textTransform,
      paddingLeft: parseFloat(cs.paddingLeft) || 0,
      paddingTop: parseFloat(cs.paddingTop) || 0,
      paddingRight: parseFloat(cs.paddingRight) || 0,
      paddingBottom: parseFloat(cs.paddingBottom) || 0,
      borderRadius: cs.borderRadius || "0",
      fontFeatureSettings: cs.fontFeatureSettings || "normal",
      fontVariantNumeric: cs.fontVariantNumeric || "normal",
      fontKerning: cs.fontKerning || "auto",
      tabSize: cs.tabSize || "8",
    };

    // Snapshot original inline styles BEFORE we mutate. We INTENTIONALLY
    // DO NOT lock the source's width / height — even though scout's
    // research suggested it as insurance, in practice setting an
    // explicit width on a flex / grid child causes the parent's layout
    // algorithm to re-run with a different basis, and the source can
    // end up at a SLIGHTLY different position. The rAF rect-sync loop
    // would then chase the new position and the user would see the
    // overlay (and the visible edit text) jump down a few pixels at
    // edit start.
    //
    // Without the lock, the source's box stays exactly where the
    // browser already had it. Because we no longer write to the data
    // store on every keystroke (see file header), the source's text
    // doesn't change either, so its box has no reason to shift. The
    // rAF loop is still there as insurance for genuine external
    // changes (canvas scroll / zoom / sibling reflow from a different
    // edit), but for the common case of "user types into one field"
    // the source is pinned by virtue of nothing asking it to move.
    sourceRef.current = {
      el,
      originalColor: el.style.color,
      originalWidth: el.style.width,
      originalHeight: el.style.height,
      originalMinWidth: el.style.minWidth,
      originalMinHeight: el.style.minHeight,
      originalMaxWidth: el.style.maxWidth,
      originalMaxHeight: el.style.maxHeight,
    };

    // Hide the source element's text — its box stays in place (so the
    // template's layout doesn't shift) but no rendered text shows
    // underneath the overlay. Color doesn't affect layout, so this is
    // pure paint-channel suppression.
    el.style.color = "transparent";

    // Clear the browser's auto-selection from the user's double-click.
    // Without this, the rect we read below is captured WITH the
    // selection visible, and the rAF loop's first tick (after the
    // browser has dropped the selection on focus-shift to our overlay)
    // reads a SLIGHTLY DIFFERENT rect — the overlay then animates from
    // the selection-inflated rect to the steady-state rect and the
    // user perceives a "jump down" of 1-3 px. Clearing here pins both
    // rect reads to the same browser layout state.
    const sel0 = window.getSelection();
    if (sel0) sel0.removeAllRanges();

    // FINALLY read the rect — after all visual mutations (transparency
    // + selection clear) have settled. This is the same rect the rAF
    // position-sync loop will read on its first tick, so the captured
    // rect equals the rect rAF wants → zero jump on edit-start.
    const rect = el.getBoundingClientRect();
    const intrinsicW = el.offsetWidth || rect.width || 1;
    const visualScale = rect.width / intrinsicW || 1;

    setOverlay({ rect, visualScale, font: fontSnapshot });

    const initialText = lens.read();
    setText(initialText);
    latestTextRef.current = initialText;
    committedRef.current = false;

    // Snapshot lens + el + every original style so the cleanup closure
    // works regardless of any subsequent re-render that produces a new
    // lens for a different editingElementId. Without snapshotting, a
    // fast A→B switch could see the cleanup fire with B's lens and
    // write A's typed text into B's field — silent data corruption.
    const editingLens = lens;
    const editingEl = el;
    const snap = sourceRef.current;
    return () => {
      // Commit typed text into the data store IF this edit session
      // hasn't already been committed by Esc / Cmd+Enter / blur (the
      // other commit paths). The committedRef guard makes commit
      // exactly-once per session and tolerates the React-18-strict-
      // mode double-effect cycle without burning a no-op write.
      if (!committedRef.current) {
        committedRef.current = true;
        const next = latestTextRef.current;
        try {
          if (next !== editingLens.read()) editingLens.write(next);
        } catch {
          // Lens read/write failure (e.g. the section was deleted
          // while editing). Swallow — the source restore below is
          // more important than the write.
        }
      }
      // Restore every inline style we mutated. Reads from the
      // snapshotted closure so we always restore the element we
      // actually mutated, never a fresher one a parallel edit might
      // have set up. Belt-and-braces: also clear sourceRef.current if
      // it still points at the same element so the unmount safety
      // effect doesn't double-restore.
      editingEl.style.color = snap.originalColor;
      editingEl.style.width = snap.originalWidth;
      editingEl.style.height = snap.originalHeight;
      editingEl.style.minWidth = snap.originalMinWidth;
      editingEl.style.minHeight = snap.originalMinHeight;
      editingEl.style.maxWidth = snap.originalMaxWidth;
      editingEl.style.maxHeight = snap.originalMaxHeight;
      if (sourceRef.current?.el === editingEl) {
        sourceRef.current = null;
      }
      setOverlay(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingElementId]);

  // KEEP THE OVERLAY GLUED TO THE SOURCE while editing.
  //
  // The original implementation captured the source's bounding rect ONCE
  // on edit-start and used `position: fixed` with frozen left/top. That
  // broke the moment ANYTHING shifted the source's screen position:
  //   - User scrolls the preview canvas → overlay floats to wrong spot.
  //   - Sibling sections grow / shrink → source reflows, overlay drifts.
  //   - Page-zoom changes mid-edit → overlay's visualScale is stale.
  //   - Typing causes the wrapper to grow (paragraph wrap) → mismatch.
  //
  // Fix: rAF loop that reads `el.getBoundingClientRect()` every frame
  // while editing and re-syncs `overlay.rect` if it changed. Cheap (one
  // bounding-rect read + a maybe-setState) and 100 % robust to whatever
  // makes the source move. Stops on edit-end.
  useEffect(() => {
    if (!editingElementId) return;
    const el = sourceRef.current?.el;
    if (!el) return;
    let raf = 0;
    let lastKey = "";
    const tick = () => {
      const r = el.getBoundingClientRect();
      const intrinsicW = el.offsetWidth || r.width || 1;
      const visualScale = r.width / intrinsicW || 1;
      // Stable key encodes everything that matters for re-render. Skip
      // setState when nothing changed so React doesn't churn at 60 fps
      // when the source is genuinely still.
      const key = `${Math.round(r.left * 100) / 100}|${Math.round(r.top * 100) / 100}|${Math.round(r.width * 100) / 100}|${Math.round(r.height * 100) / 100}|${visualScale.toFixed(3)}`;
      if (key !== lastKey) {
        lastKey = key;
        setOverlay((prev) =>
          prev ? { ...prev, rect: r, visualScale } : prev,
        );
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [editingElementId]);

  // Restore source on InlineTextEditor unmount as a safety net for
  // the case where the editor page navigates away mid-edit. The main
  // effect's cleanup already handles the normal exit paths, so this
  // only fires when sourceRef survives that path (rare — requires the
  // editing-element node to be removed from the DOM between the
  // effect setup and unmount).
  useEffect(() => {
    return () => {
      const s = sourceRef.current;
      if (!s) return;
      s.el.style.color = s.originalColor;
      s.el.style.width = s.originalWidth;
      s.el.style.height = s.originalHeight;
      s.el.style.minWidth = s.originalMinWidth;
      s.el.style.minHeight = s.originalMinHeight;
      s.el.style.maxWidth = s.originalMaxWidth;
      s.el.style.maxHeight = s.originalMaxHeight;
      sourceRef.current = null;
    };
  }, []);

  // Initial-content + focus + select-all.
  //
  // **The original implementation's hidden bug:** depending only on
  // `[editingElementId]` looked correct, but the effect actually fired
  // BEFORE the contentEditable existed in the DOM. The setup order is:
  //
  //   1. `setEditingElementId(id)` triggers a render of `<InlineTextEditor>`.
  //   2. Render returns `null` (overlay state is still null).
  //   3. After commit, the rect-capture useLayoutEffect runs and calls
  //      `setOverlay(...)` — schedules a re-render.
  //   4. THIS effect runs next, in declaration order. But `taRef.current`
  //      is still null because step 2 didn't mount the contentEditable.
  //      Focus is silently skipped.
  //   5. React processes the queued re-render. The overlay JSX renders.
  //      `taRef.current` populates. But this effect's deps
  //      (`[editingElementId]`) didn't change between renders 1 and 2,
  //      so React DOES NOT re-fire it. **Focus never happens
  //      automatically — the user has to click the overlay to start
  //      typing.**
  //
  // Fix: depend on `overlay` as well. The rect-capture effect sets
  // overlay; that triggers a re-render where the contentEditable
  // mounts; THIS effect re-runs (deps changed), `taRef.current` is
  // now valid, focus fires.
  //
  // The rAF position-sync loop also writes to `overlay` every frame
  // the source moves (it merges a new rect+scale into the existing
  // overlay state, producing a fresh object reference each call). So
  // this effect would re-run on every rAF tick. The
  // `focusedSessionRef` guard short-circuits subsequent runs — focus
  // / select-all happens exactly ONCE per edit session and never
  // again, even as the rAF loop ticks.
  //
  // **`preventScroll: true` is critical.** The browser's default
  // focus-into-view behaviour pans the canvas a few pixels the moment
  // the editor mounts, which then propagates as the source's rect
  // shifting, the rAF loop chasing it, and the user perceiving a
  // "jump". Suppressing the auto-scroll is the cleanest fix — the
  // user doesn't need the canvas to scroll because they're already
  // looking at the element they double-clicked.
  //
  // For select-all we use the Range API (contentEditable has no
  // `.select()`). selectNodeContents covers all text nodes in the
  // editing div, mimicking textarea's select-all behaviour.
  //
  // We initialize the contentEditable's content imperatively via
  // `innerText` rather than passing `text` as React children. This is
  // the "uncontrolled input" pattern for contentEditable: React
  // doesn't manage the editing div's children, so subsequent renders
  // (e.g. from rAF rect-sync, replica resize) cannot clobber the
  // user's caret position or selection. The latestTextRef + local
  // `text` state mirror the value for the commit path and the
  // replica's auto-grow display.
  useLayoutEffect(() => {
    // Reset focus tracker on edit-end so the next edit session re-focuses.
    if (!editingElementId) {
      focusedSessionRef.current = null;
      return;
    }
    // Wait for the overlay to mount in the DOM. Without this guard
    // the effect fires before `<div ref={taRef}>` exists — focus
    // silently skips and the user has to click manually.
    if (!overlay) return;
    // Already focused for this session? rAF position-sync rewrites
    // `overlay` every frame the source moves — short-circuit so we
    // don't steal focus / collapse selection mid-keystroke.
    if (focusedSessionRef.current === editingElementId) return;

    const el = taRef.current;
    if (!el) return;
    // Set initial content. Empty string is normal — happens when the
    // user double-clicks an empty placeholder field.
    el.innerText = latestTextRef.current;
    el.focus({ preventScroll: true });
    // Select all so the user's first keystroke replaces the text —
    // matches textarea / browser-form behaviour for "I just opened
    // this for editing, I'm about to retype."
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    focusedSessionRef.current = editingElementId;
  }, [editingElementId, overlay]);

  // Commit the latest typed value via lens.write and close the overlay.
  // Reads from the ref (not React state) because blur / keyboard
  // commits can fire in the same microtask as a keystroke; the ref is
  // updated synchronously inside onContentInput while React state is
  // batched. Skip the write entirely if the text is unchanged from the
  // initial value — avoids a no-op store mutation that would still
  // trigger autosave.
  function commit() {
    const next = latestTextRef.current;
    if (lens && next !== lens.read()) {
      lens.write(next);
    }
    setEditingElementId(null);
  }

  // Keyboard. The earlier policy followed Photoshop's Type Tool (plain
  // Enter inserts a newline, Cmd+Enter commits). Real users hitting
  // Enter expecting "save" instead got an unexpected newline that
  // grew the auto-sized box downward — read by every tester as the
  // editor "jumping". For a CV editor (where 90 % of editable fields
  // are short strings — name, headline, email, role, dates) the
  // web-form convention is the stronger pull:
  //
  //   - Plain Enter         → commit + exit. Matches every form-field
  //                           muscle memory the user already has.
  //   - Shift+Enter         → newline. Matches Slack / Discord / GitHub
  //                           comment / every modern chat-style editor.
  //                           For multi-line fields (summary, bullets)
  //                           the user holds Shift to get a soft break.
  //   - Cmd/Ctrl + Enter    → commit + exit. Kept for backwards muscle
  //                           memory — anyone who learned the previous
  //                           binding still gets save behaviour.
  //   - Esc                 → commit + exit (NOT revert). Canvas-tool
  //                           convention; matches Figma / Canva.
  //
  // Click-outside / blur is also commit (the universal default).
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      commit();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      // Plain Enter or Cmd/Ctrl+Enter both commit. preventDefault
      // blocks the contentEditable's native newline insertion —
      // without it, a "\n" would land in innerText one tick before
      // commit() fires, polluting the saved value.
      e.preventDefault();
      commit();
      return;
    }
    // Shift+Enter falls through — contenteditable=plaintext-only
    // inserts "\n" natively, the replica picks up the new content
    // on the next onInput tick, the auto-grow grid track expands.
  }

  /** Mirror the contentEditable's current `innerText` into local
   *  React state + the latestTextRef. The contentEditable itself is
   *  uncontrolled — the browser owns its DOM children, React doesn't
   *  reconcile them. We only read from it (here) and on commit. This
   *  is the universal contentEditable pattern — passing `text` as
   *  children would cause React to clobber the user's caret on every
   *  rerender (proven anti-pattern, e.g. facebook/react#2047).
   *
   *  Setting React state here re-renders the component, which updates
   *  the replica `<div>` (it IS controlled by `text`) so the auto-
   *  grow grid track stays in sync with the typed content. */
  function onContentInput(e: React.FormEvent<HTMLDivElement>) {
    const next = (e.currentTarget as HTMLDivElement).innerText;
    setText(next);
    latestTextRef.current = next;
  }

  if (!editingElementId || !overlay || !lens) return null;
  const sc = overlay.visualScale;
  const fontSizePx = overlay.font.fontSize * sc;
  const lh = overlay.font.lineHeight;
  const lineHeight = /^\d+(\.\d+)?px$/.test(lh)
    ? `${parseFloat(lh) * sc}px`
    : lh;
  const ls = overlay.font.letterSpacing;
  const letterSpacing = /^-?\d+(\.\d+)?px$/.test(ls)
    ? `${parseFloat(ls) * sc}px`
    : ls;

  // Shared typography style applied to BOTH the textarea AND the
  // hidden replica div so they wrap and lay out IDENTICALLY. Per-
  // element overrides (caret color, focus outline, visibility) diverge
  // below in their respective inline `style` props.
  const sharedStyle: React.CSSProperties = {
    fontFamily: overlay.font.fontFamily,
    fontSize: `${fontSizePx}px`,
    fontWeight: overlay.font.fontWeight as React.CSSProperties["fontWeight"],
    fontStyle: overlay.font.fontStyle as React.CSSProperties["fontStyle"],
    color: overlay.font.color,
    textAlign: overlay.font.textAlign as React.CSSProperties["textAlign"],
    lineHeight,
    letterSpacing,
    textTransform:
      overlay.font.textTransform as React.CSSProperties["textTransform"],
    paddingLeft: overlay.font.paddingLeft * sc,
    paddingTop: overlay.font.paddingTop * sc,
    paddingRight: overlay.font.paddingRight * sc,
    paddingBottom: overlay.font.paddingBottom * sc,
    margin: 0,
    border: "none",
    background: "transparent",
    fontFeatureSettings: overlay.font.fontFeatureSettings,
    fontVariantNumeric:
      overlay.font.fontVariantNumeric as React.CSSProperties["fontVariantNumeric"],
    fontKerning: overlay.font.fontKerning as React.CSSProperties["fontKerning"],
    tabSize: overlay.font.tabSize as React.CSSProperties["tabSize"],
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflowWrap: "break-word",
  };

  return (
    <>
      {/* Wrapper carries the focus ring + position. Inside it, the
          replica div and the textarea share grid cell 1/1 — the
          replica's natural height drives the row, the textarea
          stretches to fill via grid's default `align-self:stretch`. */}
      <div
        style={{
          position: "fixed",
          left: overlay.rect.left,
          top: overlay.rect.top,
          width: overlay.rect.width,
          // Source rect is the floor; grid grows above it as content
          // wraps. The wrapper never shrinks below the original element
          // so single-line fields stay visually anchored.
          minHeight: overlay.rect.height,
          display: "grid",
          // Faint surface tint distinguishes the active edit from
          // surrounding template content without obscuring it. Works
          // on light + dark templates because alpha is low.
          background: "rgb(255 255 255 / 0.04)",
          // Layered box-shadow ring inherits the source's border-radius
          // (outline can't follow border-radius and snaps in flat).
          // 140 ms cubic-bezier matches Linear / Notion / Figma pacing.
          borderRadius: overlay.font.borderRadius,
          boxShadow:
            "0 0 0 1.5px rgb(37 99 235 / 0.6), 0 0 0 5px rgb(37 99 235 / 0.10), 0 6px 16px -8px rgb(0 0 0 / 0.18)",
          transition:
            "box-shadow 140ms cubic-bezier(0.4, 0, 0.2, 1), background-color 140ms ease-out",
          // Layout containment: sizing changes inside the wrapper
          // don't trigger ancestor reflows. Cheap perf insurance for
          // typing-heavy editing in a heavily-styled template tree.
          contain: "layout style",
          zIndex: 10000,
        }}
      >
        {/* Hidden replica — its natural content height drives the
            grid track size. The trailing SPACE (not newline) is the
            canonical CSS-Tricks pattern: it ensures any trailing
            newline in `text` still produces an inhabited last line so
            the box accounts for it, BUT it doesn't add a phantom
            extra line for ordinary single-line text the way "\n"
            does. With "\n", a one-line h1 was rendered into a
            two-line tall edit box, which the user reads as the text
            having "jumped down" into a taller container.
            aria-hidden because screen readers should only see the
            textarea. */}
        <div
          aria-hidden
          style={{
            ...sharedStyle,
            gridArea: "1 / 1 / 2 / 2",
            visibility: "hidden",
            pointerEvents: "none",
          }}
        >
          {text + " "}
        </div>
        {/* The editing surface. `<div contenteditable="plaintext-only">`
            instead of `<textarea>`: the textarea was rendering its
            first-line glyphs 1-15 px LOWER than the source `<h1>` /
            `<span>` / `<p>` it overlays, because (a) textarea is a
            REPLACED element so CSS Grid resolves its `align-self:
            normal → start` (vs `stretch` for regular blocks like the
            replica beside it), and (b) Chrome / Firefox bake an
            internal caret-affordance offset into textarea text
            rendering that's not configurable from CSS. The
            contentEditable div is not replaced, has no UA caret
            offset, and lays out identically to a `<div>` (which is
            what the source elements are). Webflow / Framer / Penpot /
            Plasmic / TipTap / ProseMirror all use this approach.

            React doesn't reconcile its children — we set `innerText`
            imperatively in the focus useLayoutEffect, the user's
            typing mutates the DOM directly, we mirror back to React
            state via `onContentInput` so the replica auto-grows. No
            `children` prop here intentionally. */}
        <div
          ref={taRef}
          contentEditable="plaintext-only"
          suppressContentEditableWarning
          spellCheck={true}
          onInput={onContentInput}
          onBlur={commit}
          onKeyDown={onKeyDown}
          style={{
            ...sharedStyle,
            gridArea: "1 / 1 / 2 / 2",
            outline: "none",
            // Stretch to fill the cell (matches the replica's stretch
            // behaviour). Grid's default `align-self: normal` resolves
            // to `stretch` for non-replaced blocks — explicit here for
            // clarity, in case any global CSS overrides it later.
            alignSelf: "stretch",
            // overflow:hidden — the replica drives the height, the
            // editor is always exactly as tall as it needs to be, so
            // an inner scrollbar should never appear.
            overflow: "hidden",
            caretColor: overlay.font.color,
            // Browsers can break-line in unexpected places inside
            // contentEditable; pre-wrap + word-break match the
            // textarea's wrapping behaviour and the replica's. (Also
            // already in sharedStyle but explicit here is defence in
            // depth.)
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        />
      </div>
      {/* Status hint — pinned to viewport bottom-center, NOT attached
          to the editor, so it never overlaps the document text below
          the field being edited. Reads like an editor's status bar:
          informational, not in the way. The keys reflect the actual
          binding policy in `onKeyDown` above. */}
      <div
        className="pointer-events-none fixed left-1/2 bottom-4 -translate-x-1/2 select-none rounded-full bg-blue-600 px-3 py-1 text-[11px] font-medium text-white shadow-lg"
        style={{ zIndex: 10001 }}
      >
        <kbd className="rounded bg-white/20 px-1 font-mono text-[10px]">
          Enter
        </kbd>{" "}
        save{"  ·  "}
        <kbd className="rounded bg-white/20 px-1 font-mono text-[10px]">
          Shift+Enter
        </kbd>{" "}
        newline{"  ·  "}
        <kbd className="rounded bg-white/20 px-1 font-mono text-[10px]">
          Esc
        </kbd>{" "}
        save{"  ·  "}
        <span className="opacity-80">click outside to save</span>
      </div>
    </>
  );
}

/** Minimal CSS-escape for the data-element-id attribute selector. */
function cssEscape(id: string): string {
  return id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
