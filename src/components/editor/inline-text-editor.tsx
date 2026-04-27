/**
 * InlineTextEditor — absolutely-positioned textarea that overlays the
 * element being edited. Activated by double-clicking any text element
 * with a registered lens (see `src/lib/element-text-lens.ts`).
 *
 * Editing UX:
 *   - The underlying source element's text is HIDDEN during edit
 *     (color: transparent) so the overlay is the only thing the user
 *     sees. The element's BOX stays in place so the layout doesn't
 *     shift, but its rendered text is invisible — when the user types
 *     longer than the original, the overlay can grow without "bleeding
 *     over" still-visible underlying text.
 *   - The textarea AUTO-GROWS via the CSS-grid replicated-content
 *     trick: a hidden `<div>` mirroring the typed text shares the same
 *     grid cell, and the grid track sizes to the taller child. No JS
 *     scrollHeight resize, no per-keystroke flicker. The technique is
 *     widely documented (CSS-Tricks: "The Cleanest Trick for
 *     Autogrowing Textareas").
 *   - Focus + select-all run inside `useLayoutEffect`, NOT
 *     `requestAnimationFrame`, so they commit BEFORE the browser paints
 *     the overlay. Otherwise the user sees one frame of an unfocused,
 *     mis-sized editor — that's the "bouncing" feel.
 *   - **Enter inserts a newline** — same as a normal text input.
 *     Cmd/Ctrl+Enter commits early. Esc cancels (no save).
 *     Click-outside (blur) commits.
 *
 * Why an overlay instead of contentEditable in place?
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
  // text during edit and restore it on close. Stored in a ref so the
  // cleanup effect can run without re-querying the DOM.
  // `originalText` snapshots the value at edit-start so Esc can revert
  // the live-committed changes.
  const sourceRef = useRef<{
    el: HTMLElement;
    originalColor: string;
    originalText: string;
  } | null>(null);

  // Resolve the lens for the active element-id.
  const lens = editingElementId
    ? elementTextLens(editingElementId, data, { setPersonal, updateSection })
    : null;

  // Capture rect + font + hide source text when an edit starts.
  // useLayoutEffect commits synchronously after DOM mutation but BEFORE
  // the browser paints, so the overlay never appears in an intermediate
  // "not yet focused / not yet sized" state.
  useLayoutEffect(() => {
    if (!editingElementId) {
      setOverlay(null);
      // Restore the source element's text colour if we were editing.
      if (sourceRef.current) {
        sourceRef.current.el.style.color = sourceRef.current.originalColor;
        sourceRef.current = null;
      }
      return;
    }
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
    // Hide the source element's text — its box stays in place (so the
    // template's layout doesn't shift) but no rendered text shows
    // underneath the overlay. We snapshot the original text too so Esc
    // can revert any live-committed changes (we now write each
    // keystroke to the data store so the source's wrapper grows with
    // the text — Photoshop / Figma "Hug contents" behavior).
    sourceRef.current = {
      el,
      originalColor: el.style.color,
      originalText: initialText,
    };
    el.style.color = "transparent";
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

  // Restore source colour on unmount as a safety net.
  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        sourceRef.current.el.style.color = sourceRef.current.originalColor;
        sourceRef.current = null;
      }
    };
  }, []);

  // Focus + select-all in useLayoutEffect — runs synchronously after
  // the overlay mounts but BEFORE the browser paints, so the user
  // never sees the unfocused intermediate state. requestAnimationFrame
  // would delay focus to the NEXT frame which is exactly the visible
  // flash that read as "bouncing" in the previous implementation.
  useLayoutEffect(() => {
    if (!overlay) return;
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    ta.select();
  }, [overlay]);

  // Keyboard, matching the industry convention (Figma + Photoshop) per
  // the commit-cancel research:
  //   - Esc                 → commit + exit (NOT revert). Universal in
  //                           canvas tools. Web-form muscle memory says
  //                           Esc cancels, but the canvas convention is
  //                           the stronger pull and matches Figma /
  //                           Canva / Illustrator.
  //   - Enter (plain)       → newline (textarea default)
  //   - Cmd/Ctrl + Enter    → commit + exit
  // Click-outside / blur is also commit (the universal default).
  //
  // Live-commit (every keystroke writes the typed text into the data
  // store via lens.write) means we don't need a separate "commit" step
  // — the data is already saved per-keystroke, debounced through the
  // editor's autosave. Esc / blur just close the overlay; the typed
  // text is already in the store.
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setEditingElementId(null);
      return;
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setEditingElementId(null);
      return;
    }
  }

  /** Live-commit each keystroke into the data store. Two-phase write:
   *  local React state for the textarea's `value` + lens.write into
   *  Zustand for the source's wrapper to grow. The source rerenders
   *  with the new text, its CSS-driven width auto-grows, and our rAF
   *  rect-sync loop keeps the overlay glued to the new bounds. */
  function onTextChange(next: string) {
    setText(next);
    if (lens) lens.write(next);
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
        {/* Hidden replica — the natural content height drives the grid
            track size. Trailing newline matches the textarea's
            "Enter at end of line grows the box" behavior. aria-hidden
            because screen readers should only see the textarea. */}
        <div
          aria-hidden
          style={{
            ...sharedStyle,
            gridArea: "1 / 1 / 2 / 2",
            visibility: "hidden",
            pointerEvents: "none",
          }}
        >
          {text + "\n"}
        </div>
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onBlur={() => setEditingElementId(null)}
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
        cancel{"  ·  "}
        <span className="opacity-80">click outside to save</span>
      </div>
    </>
  );
}

/** Minimal CSS-escape for the data-element-id attribute selector. */
function cssEscape(id: string): string {
  return id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
