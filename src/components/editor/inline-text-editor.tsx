/**
 * InlineTextEditor — absolutely-positioned textarea that overlays the
 * element being edited. Activated by double-clicking any text element
 * with a registered lens (see `src/lib/element-text-lens.ts`).
 *
 * # Why this looks the way it does (Photoshop polish)
 *
 * The hard requirement: editing should feel like Photoshop's Type Tool.
 * Double-click → caret appears in place → type → text grows from the
 * anchor without the surrounding layout shifting underneath the user.
 * Commit on Enter / Esc / click-outside. No "jumping" of the overlay,
 * no surprise scroll, no caret races.
 *
 * Three engineering decisions deliver that feel:
 *
 * 1. **No live-commit during edit.** The single biggest source of
 *    "jumpy" behaviour was writing each keystroke into the Zustand
 *    store via `lens.write`. That triggered a React rerender of the
 *    template subtree → the source element's text changed → its
 *    parent's layout reflowed → the source's bounding rect shifted →
 *    the rAF position-sync loop dragged the overlay to the new spot →
 *    the user saw their text leap mid-stroke. Photoshop's Type Tool
 *    keeps the underlying text frame static during edit and commits on
 *    exit — we now match that. Local React state holds the typed value;
 *    `lens.write` runs once on commit (blur / Esc / Cmd+Enter).
 *
 * 2. **Source text + box are frozen during edit.** The source element
 *    is rendered with `color: transparent`, so the user only sees the
 *    overlay. Because we no longer mutate the data store during edit,
 *    the source's content (and therefore its bounding box) is rock
 *    stable. The overlay grows freely (CSS-grid auto-sizing) without
 *    chasing a moving target. On commit, the source rerenders with the
 *    new text — but by then the overlay is gone, so any layout shift
 *    happens AFTER the user has committed and is expected.
 *
 * 3. **`focus({ preventScroll: true })`.** Default `focus()` triggers
 *    the browser's "scroll into view" behaviour, which pans the canvas
 *    by a few pixels the moment the textarea mounts. Even though the
 *    rAF loop catches the shift and re-syncs, the user perceives it as
 *    the text "jumping". `preventScroll: true` blocks the auto-scroll
 *    entirely — the canvas stays put.
 *
 * # Other invariants worth preserving
 *
 *   - The textarea AUTO-GROWS via the CSS-grid replicated-content
 *     trick: a hidden `<div>` mirroring the typed text shares the same
 *     grid cell, and the grid track sizes to the taller child. No JS
 *     scrollHeight resize, no per-keystroke flicker. The technique is
 *     widely documented (CSS-Tricks: "The Cleanest Trick for
 *     Autogrowing Textareas").
 *   - Focus + select-all run inside `useLayoutEffect`, NOT
 *     `requestAnimationFrame`, so they commit BEFORE the browser paints
 *     the overlay. Otherwise the user sees one frame of an unfocused,
 *     mis-sized editor — the "bouncing" feel.
 *   - The rAF position-sync loop is STILL needed to handle EXTERNAL
 *     shifts (canvas scroll, parent zoom, sibling section reflow). Now
 *     that the source's text is frozen, the loop almost never triggers
 *     a re-render — but it's there as insurance.
 *   - **Enter inserts a newline** — same as a normal text input.
 *     Esc / Cmd-Enter / click-outside all COMMIT and exit. There is no
 *     "revert" path — matches Photoshop, Figma, Illustrator, Canva
 *     (the canvas-tool convention). Web-form muscle memory says Esc
 *     cancels, but the canvas convention is the stronger pull here
 *     (prior research at research/text-in-container-ux/).
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
  const taRef = useRef<HTMLTextAreaElement | null>(null);
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
    const rect = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);
    const intrinsicW = el.offsetWidth || rect.width || 1;
    const visualScale = rect.width / intrinsicW || 1;
    setOverlay({
      rect,
      visualScale,
      font: {
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
      },
    });
    const initialText = lens.read();
    setText(initialText);
    latestTextRef.current = initialText;
    // Hide the source element's text — its box stays in place (so the
    // template's layout doesn't shift) but no rendered text shows
    // underneath the overlay. The source's text + computed styles
    // remain unchanged for the entire edit session because we no
    // longer write to the data store on every keystroke (see file
    // header). The overlay grows freely above a perfectly still source
    // — that's the "Photoshop feel" behaviour.
    // Snapshot original inline styles BEFORE we mutate them. We
    // INTENTIONALLY DO NOT lock the source's width / height — even
    // though the agent's research suggested it as insurance, in
    // practice setting an explicit width on a flex / grid child
    // causes the parent's layout algorithm to re-run with a different
    // basis, and the source can end up at a SLIGHTLY different
    // position. The rAF rect-sync loop then chases the new position
    // and the user sees the overlay (and the visible edit text) jump
    // down a few pixels at edit start.
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
    el.style.color = "transparent";
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

  // Focus + select-all in useLayoutEffect — runs synchronously after
  // the overlay mounts but BEFORE the browser paints, so the user
  // never sees the unfocused intermediate state. requestAnimationFrame
  // would delay focus to the NEXT frame which is exactly the visible
  // flash that read as "bouncing" in the previous implementation.
  //
  // **`preventScroll: true` is critical.** The browser's default
  // focus-into-view behaviour pans the canvas a few pixels the moment
  // the textarea mounts, which then propagates as the source's rect
  // shifting, the rAF loop chasing it, and the user perceiving a
  // "jump". Suppressing the auto-scroll is the cleanest fix — the
  // user doesn't need the canvas to scroll because they're already
  // looking at the element they double-clicked.
  //
  // We only run focus once per edit session (initial mount), not on
  // every overlay rect tick. Re-focusing on every rAF re-render of
  // the overlay would steal focus while the user is mid-keystroke if
  // anything else briefly grabs focus. The dependency on
  // `editingElementId` (rather than `overlay`) ensures one focus per
  // session.
  useLayoutEffect(() => {
    if (!editingElementId) return;
    const ta = taRef.current;
    if (!ta) return;
    ta.focus({ preventScroll: true });
    ta.select();
  }, [editingElementId]);

  // Commit the latest typed value via lens.write and close the overlay.
  // Reads from the ref (not React state) because blur / keyboard
  // commits can fire in the same microtask as a keystroke; the ref is
  // updated synchronously inside onTextChange while React state is
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

  // Keyboard, matching the industry convention (Figma + Photoshop) per
  // the commit-cancel research:
  //   - Esc                 → commit + exit (NOT revert). Universal in
  //                           canvas tools. Web-form muscle memory says
  //                           Esc cancels, but the canvas convention is
  //                           the stronger pull and matches Figma /
  //                           Canva / Illustrator.
  //   - Enter (plain)       → newline (textarea default — left alone)
  //   - Cmd/Ctrl + Enter    → commit + exit
  // Click-outside / blur is also commit (the universal default).
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      commit();
      return;
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commit();
      return;
    }
  }

  /** Update the textarea's local value. We deliberately do NOT write
   *  through to the data store here — that's the source of the
   *  "jumping" feel (every keystroke triggered a Zustand update →
   *  React rerender → source's bounding box shifted → overlay re-
   *  synced to the new rect). Instead we mirror the value into a ref
   *  for the commit handlers to pick up. The source's text + box stay
   *  perfectly still for the entire edit session; the overlay grows
   *  freely above it via CSS-grid auto-sizing. */
  function onTextChange(next: string) {
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
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          rows={1}
          style={{
            ...sharedStyle,
            gridArea: "1 / 1 / 2 / 2",
            outline: "none",
            resize: "none",
            // overflow:hidden — the replica drives the height, the
            // textarea is always exactly as tall as it needs to be,
            // so an inner scrollbar should never appear.
            overflow: "hidden",
            caretColor: overlay.font.color,
          }}
          spellCheck={true}
        />
      </div>
      {/* Status hint — pinned to viewport bottom-center, NOT attached
          to the textarea, so it never overlaps the document text below
          the field being edited. Reads like an editor's status bar:
          informational, not in the way. */}
      <div
        className="pointer-events-none fixed left-1/2 bottom-4 -translate-x-1/2 select-none rounded-full bg-blue-600 px-3 py-1 text-[11px] font-medium text-white shadow-lg"
        style={{ zIndex: 10001 }}
      >
        <kbd className="rounded bg-white/20 px-1 font-mono text-[10px]">
          Enter
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
