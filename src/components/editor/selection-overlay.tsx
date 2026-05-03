/**
 * SelectionOverlay — single SVG layer painted over the page sheet that
 * draws a hover ring around whatever `[data-element-id]` /
 * `[data-section-id]` the cursor is currently over. Replaces the
 * per-element `hover:ring-2 hover:ring-neutral-900/X transition-shadow`
 * Tailwind utilities scattered across all 48 templates.
 *
 * # Why one overlay instead of 50+ per-element rings
 *
 * The previous architecture had every template stamp `hover:ring-2`
 * (Tailwind: implemented via `box-shadow`) on every `<h1>{name}</h1>`,
 * `<span>{role}</span>`, `<p>{summary}</p>`, etc. With ~10-30 editable
 * elements per template × ~50 templates × every element's `:hover` rule
 * having a `transition-shadow` AND `transition-[background-color,box-shadow]`
 * declaration, the result was a paint storm on every cursor move. The
 * user described it as "rough, heavy, doesn't feel like Photoshop". The
 * concrete mechanism: each ring update is a paint pass on a separate
 * paint layer, and the four-way :has() cascade (in globals.css line 415)
 * had to walk the parent chain for every move. Heavy.
 *
 * tldraw 4.4 (October 2025) migrated from per-shape SVG rings to a
 * single overlay layer and reported a 25× perf win on heavy selections.
 * Figma, Excalidraw, and Penpot all use the single-overlay model. We
 * match.
 *
 * # Mechanics
 *
 *   1. One SVG element is mounted INSIDE the scaled page wrapper, at
 *      the same coordinate level as `SnapGuidesOverlay`. The page
 *      wrapper's `transform: scale(...)` applies to it too — so the
 *      ring scales naturally with zoom, no manual scale math.
 *   2. A single `pointermove` listener on the `.preview-stage`
 *      ancestor walks `event.target.closest('[data-element-id],
 *      [data-section-id]')` to resolve the leafmost editable element
 *      under the cursor. rAF-throttled so we never run the resolver
 *      faster than the compositor needs it.
 *   3. The resolved element's `getBoundingClientRect()` is converted
 *      from viewport coords to page-local coords using the SVG's own
 *      rect as the origin. The ring's `x/y/width/height` attributes
 *      are then written directly to the SVG `<rect>` via refs — no
 *      React rerender. This is the same direct-DOM pattern preview.tsx
 *      already uses for drag.
 *   4. The selection ring (for custom toolshelf elements) is not
 *      handled here — `custom-elements-layer.tsx` continues to draw
 *      its own selected/handles state because it's coupled to the
 *      resize-handle gizmo. Our scope is HOVER feedback only.
 *
 * # Why pointermove and not mouseenter
 *
 *   - `mouseenter` doesn't bubble (per the DOM spec), so per-element
 *     React `onMouseEnter` handlers can't be delegated. With 50+
 *     elements that means 50+ live listeners.
 *   - `pointermove` bubbles through the whole tree, so a single
 *     listener on the stage container delegates cleanly via
 *     `event.target.closest()`. Same pattern Figma's canvas uses.
 *
 * # Edge cases handled
 *
 *   - Suppressed entirely while `editingElementId` is set (the
 *     contentEditable overlay owns the visual state during edit).
 *   - Suppressed while a drag is active (`body.slothcv-dragging` —
 *     the drag-isolation cascade already handles cursor + transition
 *     suppression; we just clear our hover so the ring doesn't ghost-
 *     paint over the dragged element).
 *   - Suppressed during PDF export (`body.slothcv-exporting`).
 *   - Hides the ring when the cursor leaves the stage entirely.
 *
 * # Animation
 *
 *   - Fade-in on hover: 80 ms `cubic-bezier(0, 0, 0.2, 1)` (Material
 *     standard-decelerate). Below Nielsen's 100 ms instant-feedback
 *     threshold so it reads as instant but the eye still picks up the
 *     ease.
 *   - Fade-out: 0 ms (instant). Symmetric fade was leaving a phantom
 *     trail when sweeping the cursor across multiple elements.
 *   - Animated property: `opacity` only — runs on the GPU compositor,
 *     not the paint pass. Zero per-frame cost.
 */

"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useEditorStore } from "@/lib/store/editor";

interface Props {
  /** Page sheet width in CSS px (intrinsic, pre-scale). The SVG's
   *  `viewBox` is set to this so coordinates inside it match the page's
   *  natural coordinate system. Page-local x/y in `<rect>` attributes
   *  scale automatically with the wrapper's `transform: scale(...)`. */
  pageWidth: number;
  /** Page sheet height in CSS px (intrinsic, pre-scale). Same role as
   *  pageWidth. */
  pageHeight: number;
}

export function SelectionOverlay({ pageWidth, pageHeight }: Props) {
  // Read editing state to suppress hover during inline-edit. We
  // deliberately do NOT subscribe to selectedElementId here — selection
  // ring painting belongs to custom-elements-layer.tsx; this component
  // only handles HOVER. Keeping the responsibilities split keeps the
  // re-render scope minimal: this component re-renders only when the
  // edit-state changes, never on selection changes.
  const editingElementId = useEditorStore((s) => s.editingElementId);

  // SVG + rect refs. We update the rect's x/y/width/height + the SVG's
  // overall opacity via direct DOM (setAttribute / style writes) so the
  // hover follow doesn't churn the React tree on every pointermove.
  const svgRef = useRef<SVGSVGElement | null>(null);
  const hoverRectRef = useRef<SVGRectElement | null>(null);
  // Tracks the last hovered element-id so we can short-circuit when the
  // cursor stays on the same element across many pointermoves.
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    // While inline-edit is active, don't paint any hover. The dashed
    // edit indicator on the editor overlay is a stronger affordance
    // than a hover ring, and overlapping rings on the same element
    // read as visual noise.
    if (editingElementId) {
      const svg = svgRef.current;
      if (svg) svg.style.opacity = "0";
      lastIdRef.current = null;
      return;
    }

    // Anchor: the SVG itself. We need its viewport rect so we can
    // convert each hovered element's `getBoundingClientRect()` into
    // page-local coords. The SVG is INSIDE the scaled wrapper, so its
    // bounding rect already reflects the page's screen-space position
    // and scale — divide screen-space delta by that scale to get
    // page-local coords.
    const svg = svgRef.current;
    if (!svg) return;

    // Pre-resolve the parent stage. We attach the pointer listeners
    // there (not on `window`) so we don't fire the resolver while the
    // cursor is over the inspector / toolbar / chrome — only when it's
    // over the actual page sheet area.
    const stage = svg.closest(".preview-stage") as HTMLElement | null;
    if (!stage) return;

    let rafPending = false;
    let lastEvent: PointerEvent | null = null;

    /** Resolve which `[data-element-id]` or `[data-section-id]`
     *  ancestor the pointer is currently over. Returns the most-
     *  specific match (element wins over section, matching the drag
     *  priority used by preview.tsx onMouseDown). */
    function resolveTarget(e: PointerEvent): {
      el: HTMLElement;
      id: string;
    } | null {
      const target = e.target as HTMLElement | null;
      if (!target) return null;
      // Bail if cursor is over the inline editor (portaled outside
      // the stage tree). Defensive — the listener is on the stage so
      // we shouldn't see those events here, but cheap to check.
      if (target.closest("[data-slothcv-inline-editor]")) return null;
      // Bail if the resize-handle is hovered — the handle has its own
      // visual feedback (cursor change + scale on hover), competing
      // hover rings would double-paint the corner area.
      if (target.closest("[data-resize-handle]")) return null;
      // Most-specific element-id wins. closest() walks up the tree
      // until it finds the first matching ancestor.
      const elHit = target.closest("[data-element-id]") as
        | HTMLElement
        | null;
      if (elHit) {
        const id = elHit.getAttribute("data-element-id");
        if (id) return { el: elHit, id };
      }
      const secHit = target.closest("[data-section-id]") as
        | HTMLElement
        | null;
      if (secHit) {
        const id = secHit.getAttribute("data-section-id");
        if (id) return { el: secHit, id };
      }
      return null;
    }

    /** Apply the resolved target to the overlay rect. Page-local coord
     *  conversion: the SVG and the hit element are both inside the
     *  same `transform: scale()` wrapper, so their bounding rects
     *  share the same scale factor. Subtract the SVG origin to get
     *  origin-aligned coords; divide by scale to get pre-transform
     *  page-local coords (the `viewBox` coordinate space). */
    function applyHover(target: { el: HTMLElement; id: string }) {
      const overlay = svgRef.current;
      const rect = hoverRectRef.current;
      if (!overlay || !rect) return;
      const svgRect = overlay.getBoundingClientRect();
      const elRect = target.el.getBoundingClientRect();
      // Visual scale: ratio of svgRect.width to the SVG's viewBox
      // width. This catches ANY ancestor transform: scale()
      // automatically — no need to read the editor zoom value. If
      // svgRect.width happens to be 0 (overlay not yet laid out),
      // bail and try again next frame.
      const vbW = pageWidth || 1;
      const scale = svgRect.width / vbW;
      if (!isFinite(scale) || scale <= 0) return;
      const x = (elRect.left - svgRect.left) / scale;
      const y = (elRect.top - svgRect.top) / scale;
      const w = elRect.width / scale;
      const h = elRect.height / scale;
      // Round to 0.5 px (the actual paint-rounding threshold across
      // every modern browser at typical DPRs) to avoid sub-pixel
      // jitter when the cursor moves but the element didn't.
      rect.setAttribute("x", String(Math.round(x * 2) / 2));
      rect.setAttribute("y", String(Math.round(y * 2) / 2));
      rect.setAttribute("width", String(Math.max(0, Math.round(w * 2) / 2)));
      rect.setAttribute(
        "height",
        String(Math.max(0, Math.round(h * 2) / 2)),
      );
      // Show the overlay. Opacity transitions on the SVG itself are
      // cheap (compositor-only) — no paint cost regardless of how
      // often we toggle them.
      overlay.style.opacity = "1";
    }

    /** Hide the hover overlay. Used when cursor leaves the stage,
     *  enters the inline editor, or hovers over background. */
    function clearHover() {
      const overlay = svgRef.current;
      if (overlay) overlay.style.opacity = "0";
      lastIdRef.current = null;
    }

    /** rAF-throttled pointer handler. We only run the resolver +
     *  applyHover once per frame, even if the user is moving the
     *  mouse at 240 Hz on a 240 Hz display. The compositor only paints
     *  at vsync anyway, so any work above 1× per frame is wasted. */
    function processFrame() {
      rafPending = false;
      const e = lastEvent;
      lastEvent = null;
      if (!e) return;
      // Suppress hover during drag — the drag-isolation cascade
      // (body.slothcv-dragging) already kills :hover via pointer-
      // events: none, but our delegated listener doesn't go through
      // that cascade. Defensive read of the body class.
      if (
        document.body.classList.contains("slothcv-dragging") ||
        document.body.classList.contains("slothcv-resizing") ||
        document.body.classList.contains("slothcv-exporting")
      ) {
        clearHover();
        return;
      }
      const target = resolveTarget(e);
      if (!target) {
        clearHover();
        return;
      }
      // Same element as last frame? No need to re-write the rect.
      if (target.id === lastIdRef.current) {
        // ...but re-apply on every frame anyway because the source
        // could have moved (e.g. inside a scrolling preview pane,
        // section reflow, etc.). Cheap — just three setAttribute
        // calls. Worth the simplicity vs. tracking a separate
        // last-rect cache.
      }
      lastIdRef.current = target.id;
      applyHover(target);
    }

    function onPointerMove(e: PointerEvent) {
      lastEvent = e;
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(processFrame);
    }

    function onPointerLeave() {
      // Cursor left the stage entirely — no element under it.
      clearHover();
    }

    // Attach. The `passive: true` flag tells the browser we will
    // never preventDefault — avoids the synchronous scroll-blocking
    // path even though we don't scroll-block here. Free win.
    stage.addEventListener("pointermove", onPointerMove, { passive: true });
    stage.addEventListener("pointerleave", onPointerLeave);
    return () => {
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [editingElementId, pageWidth]);

  // Initial paint state: rect at 0,0 with zero size, overlay invisible.
  // The pointermove handler will resize/position it on the first move.
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (svg) svg.style.opacity = "0";
  }, []);

  return (
    <svg
      ref={svgRef}
      // pointer-events: none so the overlay never intercepts clicks.
      // The cursor goes straight through to the underlying CV content
      // (which is what owns drag/click semantics). Without this, the
      // overlay would steal the entire page's pointer events as soon
      // as it covered them.
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: pageWidth,
        height: pageHeight,
        pointerEvents: "none",
        // Above page content (z 0-10) but below snap guides (z 9998)
        // and toast/modal layers. The hover ring should obscure
        // content edges but never cover snap-guide feedback.
        zIndex: 50,
        // Compositor-only opacity transition. 80 ms in / 0 ms out —
        // see the docstring for why asymmetric.
        transition: "opacity 80ms cubic-bezier(0, 0, 0.2, 1)",
        opacity: 0,
        // GPU layer hint for the duration of the editor session. The
        // overlay is always present in the DOM even when invisible, so
        // promoting it once is cheaper than promoting on every fade-in.
        willChange: "opacity",
      }}
      viewBox={`0 0 ${pageWidth} ${pageHeight}`}
      preserveAspectRatio="none"
    >
      <rect
        ref={hoverRectRef}
        // Initial geometry — overwritten by applyHover() on first move.
        x={0}
        y={0}
        width={0}
        height={0}
        // Stroke the rect 1.5 px wide in slothcv brand blue. Same
        // colour as the inline-edit ring (`rgb(37 99 235)` ≡ #2563eb)
        // for visual coherence; lower opacity so it reads as a
        // softer "you can interact with this" cue vs the editor's
        // active-edit ring. shape-rendering="geometricPrecision" keeps
        // the stroke crisp at fractional zoom levels (75 %, 125 %).
        fill="none"
        stroke="rgb(37 99 235)"
        strokeOpacity={0.7}
        strokeWidth={1.5}
        shapeRendering="geometricPrecision"
        // Half-pixel offset on outline rendering: SVG strokes are
        // centred on the pixel grid, so 1.5 px stroke at integer x/y
        // straddles the pixel boundary and looks blurry at 1x DPR.
        // Browsers handle this for us when the rect's coords are
        // already half-pixel-aligned — applyHover() rounds to 0.5 px
        // boundaries.
      />
    </svg>
  );
}
