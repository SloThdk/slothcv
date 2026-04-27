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
 *   - The textarea AUTO-GROWS as the user types. We resize on every
 *     input event using `scrollHeight`, growing downward.
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
   *  text touching the focus ring edge (cramped feel that the previous
   *  paddingRight:0 / paddingBottom:0 default produced on tight
   *  elements like H1s with no native padding). borderRadius is read
   *  so the box-shadow focus ring follows the template's corner shape
   *  instead of always being rectangular. */
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
  const sourceRef = useRef<{
    el: HTMLElement;
    originalColor: string;
  } | null>(null);

  // Resolve the lens for the active element-id.
  const lens = editingElementId
    ? elementTextLens(editingElementId, data, { setPersonal, updateSection })
    : null;

  // Capture rect + font + hide source text when an edit starts.
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
      },
    });
    setText(lens.read());
    // Hide the source element's text — its box stays in place (so the
    // template's layout doesn't shift) but no rendered text shows
    // underneath the overlay. This means when the user types longer
    // than the original, the overlay can grow downward without
    // overlapping still-visible old text.
    sourceRef.current = {
      el,
      originalColor: el.style.color, // inline style only — class colors are unaffected
    };
    el.style.color = "transparent";
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Auto-focus + select-all on enter, and apply initial auto-grow.
  useEffect(() => {
    if (!overlay) return;
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.select();
      // Trigger auto-grow once with the prefilled value.
      autoGrow(ta);
    });
  }, [overlay]);

  /** Resize the textarea to fit its content. Called on every input event
   *  and once on initial mount. Reset to "auto" first so the scrollHeight
   *  reflects the natural required height (without baseline + previous
   *  height-set distortion). */
  function autoGrow(ta: HTMLTextAreaElement) {
    ta.style.height = "auto";
    // Use scrollHeight for natural fit. Min-clamp to the source rect
    // height so single-line fields stay visually anchored — the
    // overlay box mirrors the source rect EXACTLY (no expansion) so
    // narrow elements like date strings don't overflow into adjacent
    // template content.
    const min = overlay?.rect.height ?? 0;
    const next = Math.max(min, ta.scrollHeight);
    ta.style.height = `${next}px`;
  }

  // Keyboard:
  //   - Esc                 → cancel (no save)
  //   - Enter (plain)       → newline (textarea default — DON'T preventDefault)
  //   - Cmd/Ctrl + Enter    → commit early (power-user shortcut)
  // Commit on blur is the standard exit gesture.
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      // Clear without writing — sourceRef cleanup happens via the
      // editingElementId useLayoutEffect when it sees null.
      setEditingElementId(null);
      return;
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commitAndExit();
      return;
    }
    // Plain Enter: don't preventDefault — let the textarea insert a
    // newline naturally. Browsers default to "\n" insertion.
  }

  function commitAndExit() {
    if (!lens) {
      setEditingElementId(null);
      return;
    }
    lens.write(text);
    setEditingElementId(null);
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

  return (
    <>
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          autoGrow(e.currentTarget);
        }}
        onBlur={commitAndExit}
        onKeyDown={onKeyDown}
        style={{
          position: "fixed",
          // Box mirrors the source rect EXACTLY — no outward expansion.
          // Earlier code expanded by 6px L/R + 4px T/B for a "breathing"
          // ring effect, but on narrow elements (date strings, short
          // labels in dense layouts) that 12px width add overlapped
          // adjacent template content. The focus ring still feels
          // generous because it lives in box-shadow space below, which
          // extends visually beyond the box without affecting layout.
          left: overlay.rect.left,
          top: overlay.rect.top,
          width: overlay.rect.width,
          minHeight: overlay.rect.height,
          // Faint surface tint so the editing field is distinguishable
          // from the surrounding template content without obscuring
          // anything behind it. Works on light + dark templates because
          // alpha is low and neutral.
          background: "rgb(255 255 255 / 0.04)",
          // Layered box-shadow ring instead of `outline`. Outline can't
          // follow border-radius and snaps in flat; box-shadow inherits
          // the source element's corner radius, gets a soft outer glow
          // at low opacity, plus a subtle drop shadow for elevation.
          // The 140ms cubic-bezier matches Linear / Notion / Figma's
          // micro-interaction pacing.
          outline: "none",
          borderRadius: overlay.font.borderRadius,
          boxShadow:
            "0 0 0 1.5px rgb(37 99 235 / 0.6), 0 0 0 5px rgb(37 99 235 / 0.10), 0 6px 16px -8px rgb(0 0 0 / 0.18)",
          transition:
            "box-shadow 140ms cubic-bezier(0.4, 0, 0.2, 1), background-color 140ms ease-out",
          fontFamily: overlay.font.fontFamily,
          fontSize: `${fontSizePx}px`,
          fontWeight:
            overlay.font.fontWeight as React.CSSProperties["fontWeight"],
          fontStyle:
            overlay.font.fontStyle as React.CSSProperties["fontStyle"],
          color: overlay.font.color,
          textAlign:
            overlay.font.textAlign as React.CSSProperties["textAlign"],
          lineHeight,
          letterSpacing,
          textTransform:
            overlay.font.textTransform as React.CSSProperties["textTransform"],
          // All four paddings copied from the source's computed style
          // (scaled by the preview's visual scale). The earlier code
          // hard-coded paddingRight/paddingBottom to 0 so the cursor
          // touched the focus ring on the right + bottom edges — fixed.
          // No artificial padding boost: the typed text lands EXACTLY
          // where the template rendered it (no visual jump on edit
          // start), and tight elements like H1s without native padding
          // get their breathing-room signal from the focus ring rather
          // than from a forced inset.
          paddingLeft: overlay.font.paddingLeft * sc,
          paddingTop: overlay.font.paddingTop * sc,
          paddingRight: overlay.font.paddingRight * sc,
          paddingBottom: overlay.font.paddingBottom * sc,
          margin: 0,
          border: "none",
          resize: "none",
          // overflow:hidden + auto-growing height = no inner scrollbar.
          overflow: "hidden",
          // Allow soft-wrapping but break-all so a long unbreakable
          // string doesn't horizontally overflow the textarea (which
          // would itself bleed past the bounding box).
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          caretColor: overlay.font.color,
          zIndex: 10000,
        }}
        spellCheck={true}
      />
      {/* Status hint — pinned to viewport bottom-center, NOT attached to
          the textarea, so it never overlaps the document text below
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
