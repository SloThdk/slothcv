/**
 * CustomElementsLayer — renders every user-added toolshelf element as an
 * absolutely-positioned overlay on top of (or in place of, in Blank's
 * case) the template's normal flow content.
 *
 * Each element gets:
 *   - Absolute x/y/w/h from `el` (writes to the page coordinate system).
 *   - z-index from `el.z` so the layers panel can reorder.
 *   - `data-element-id="custom.<id>"` so the preview's drag handler picks
 *     it up via the same path it picks up other element-level drags
 *     (walks up looking for `[data-element-id]` first).
 *   - Hover ring + cursor-grab so the user knows it's draggable.
 *
 * Drag commits route to `setCustomElementPosition` (in editor.ts) which
 * writes `customElements[idx].x` and `.y` directly — different code path
 * from `elementOverrides` but visually identical to the user.
 *
 * Line elements are rendered as a div with the configured thickness as
 * `border-top` (or rotated stroke for non-axis-aligned lines, deferred).
 *
 * Text elements are pre-line-wrappable but NOT contenteditable in v1 —
 * editing happens through the inspector panel. Adding live edit is a
 * follow-up; the existing per-element drag pattern doesn't conflict
 * with contenteditable since we read mousedown for drag, but the click
 * threshold (4px) would race with placement of the caret. Defer.
 */

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useEditorStore } from "@/lib/store/editor";
import { SOCIAL_ICONS_BY_NAME, isSocialIconName } from "@/lib/social-icons";
import type {
  ArrowElement,
  CrossElement,
  CustomElement,
  DiamondElement,
  EllipseElement,
  HeartElement,
  HexagonElement,
  IconElement,
  ImageElement,
  LineElement,
  OctagonElement,
  RectElement,
  ResumeData,
  SparkleElement,
  StarElement,
  TextElement,
  TriangleElement,
} from "@/types/resume";

/** Resize-corner discriminator. Re-declared here because the layer
 *  owns resize logic now (pointer capture lives on each handle). */
type ResizeCorner =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

interface Props {
  data: ResumeData;
  /** Currently-selected element id from the store. The layer adds an
   *  extra ring + corner mark to the selected element so users see what
   *  the inspector panel is editing. */
  selectedId: string | null;
}

export function CustomElementsLayer({ data, selectedId }: Props) {
  const items = data.customElements ?? [];
  if (items.length === 0) return null;
  // Sort by z so DOM order matches stack order. Stable sort by index for ties.
  const sorted = items
    .map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.z - b.e.z || a.i - b.i)
    .map((x) => x.e);

  return (
    <div
      // Layer fills the entire A4 page. pointer-events-none on the wrapper
      // means clicks go to the underlying CV until they hit a child
      // element (which has pointer-events-auto). Clean overlay model.
      aria-hidden="false"
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 10 }}
    >
      {sorted.map((el) => (
        <CustomElementNode
          key={el.id}
          el={el}
          selected={el.id === selectedId}
        />
      ))}
    </div>
  );
}

function CustomElementNode({
  el,
  selected,
}: {
  el: CustomElement;
  selected: boolean;
}) {
  // Inline-edit mode for text elements — toggled by double-click. Lives
  // here as local state because only ONE node at a time can be in edit
  // mode (it's tied to the user's intent / cursor) and there's no
  // cross-component dependency on it.
  const [editing, setEditing] = useState(false);
  // Pull the writer from the store. ResizeHandles commit at gesture-end
  // by calling `onCommit({x,y,w,h})` and we route those into the same
  // updateCustomElement path the inspector panel uses, so undo history
  // and saveStatus dirtying both work correctly.
  const updateCustomElement = useEditorStore((s) => s.updateCustomElement);
  // Wrapper ref + tracked local-coord bounds. The wrapper's nominal
  // size is el.w × el.h, but a ResizeObserver lets us catch any
  // CSS-driven shrink (responsive layout, font load, container query
  // breakpoint flip, etc.) and re-position handles to match. Without
  // this, handles park at stale (el.w, el.h) coords after the wrapper
  // visually reflows — the "dots not following" symptom.
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState<{ w: number; h: number }>({
    w: el.w,
    h: el.h,
  });

  // Track the wrapper's actual rendered size in LOCAL coords (i.e.
  // pre-zoom-scale). ResizeObserver's `contentRect` reports the box
  // model in CSS px — the same coordinate space our handles are
  // positioned in via `left: cx - 12`. Update only on real change so
  // we don't re-render every frame.
  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;
    const ro = new ResizeObserver(() => {
      // offsetWidth / offsetHeight reflect the LOCAL CSS pixel size
      // (excluding any ancestor transform: scale()), which is what
      // we need for child absolute positioning to align. Skip when
      // the wrapper isn't laid out yet.
      const w = node.offsetWidth;
      const h = node.offsetHeight;
      if (!w || !h) return;
      setBounds((prev) =>
        Math.abs(prev.w - w) < 0.5 && Math.abs(prev.h - h) < 0.5
          ? prev
          : { w, h },
      );
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // Image element with `fit: contain` and a non-matching wrapper aspect
  // would render the IMG letterboxed — IMG visibly smaller than the
  // wrapper, with handles wrapping the (larger) wrapper. That's the
  // "dots forming a 3×3 grid bigger than the photo" bug.
  //
  // Fix: snap the wrapper to the image's natural aspect on first load
  // (and whenever fit / url changes). This makes the wrapper, the
  // visible image, and the resize handles all coincide — Photoshop's
  // "the bounding box IS the image" feel.
  //
  // We preserve the element's pixel area, so a 200×300 wrapper holding
  // a 16:9 image becomes ~283×159 (same area, image aspect). User can
  // still freely resize after — Shift on a corner handle locks the
  // aspect to keep the image looking right.
  //
  // Extract image-only fields to top-level vars so the dependency array
  // stays statically analyzable (no inline ternaries — exhaustive-deps
  // can't track them).
  const imgUrl = el.kind === "image" ? el.url : undefined;
  const imgFit = el.kind === "image" ? el.fit : undefined;
  const elKind = el.kind;
  const elId = el.id;
  const elW = el.w;
  const elH = el.h;
  useLayoutEffect(() => {
    if (elKind !== "image") return;
    if (!imgUrl || (imgFit ?? "cover") !== "contain") return;
    const node = wrapperRef.current;
    if (!node) return;
    const imgEl = node.querySelector("img");
    if (!imgEl) return;
    const apply = () => {
      const nw = imgEl.naturalWidth;
      const nh = imgEl.naturalHeight;
      if (!nw || !nh) return;
      const naturalAspect = nw / nh;
      const wrapperAspect = elW / elH;
      // Tolerance: 1 % of natural aspect. Float math + integer pixel
      // rounding will never make the two exactly equal even after a
      // snap, so without a tolerance the effect would loop.
      if (
        Math.abs(naturalAspect - wrapperAspect) <
        0.01 * naturalAspect
      ) {
        return;
      }
      // Preserve area so the user doesn't see a sudden size jump:
      //   newW × newH = elW × elH, newW / newH = naturalAspect
      // → newW = sqrt(area × aspect), newH = sqrt(area / aspect).
      const area = elW * elH;
      const newW = Math.round(Math.sqrt(area * naturalAspect));
      const newH = Math.round(Math.sqrt(area / naturalAspect));
      if (newW < 8 || newH < 8) return;
      updateCustomElement(elId, { w: newW, h: newH });
    };
    if (imgEl.complete && imgEl.naturalWidth) {
      apply();
    } else {
      imgEl.addEventListener("load", apply, { once: true });
      return () => imgEl.removeEventListener("load", apply);
    }
  }, [elId, elKind, elW, elH, imgUrl, imgFit, updateCustomElement]);

  if (!el.visible) return null;

  // Common positioning style. `transform` is reserved for the drag
  // handler — we use `left/top` for layout so transform stays a
  // composite-only override during interaction.
  const wrap: React.CSSProperties = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    opacity: el.opacity ?? 1,
    transform: el.rotate ? `rotate(${el.rotate}deg)` : undefined,
    transformOrigin: "center center",
    pointerEvents: "auto",
    zIndex: el.z,
  };

  // Selection ring — 2px solid blue with a 1px white halo OUTSIDE the
  // blue. The double-color trick keeps the ring visible on every
  // possible page background: blue is high-contrast on light bgs, the
  // outer white halo gives separation on dark bgs (Aurora / Eclipse /
  // user-painted dark backgrounds). Same trick Figma uses.
  //
  // Outline (not box-shadow) because outline doesn't affect layout —
  // toggling it on/off doesn't reflow the page. Outline-offset puts
  // a 1px gap between the element and the ring so the ring doesn't
  // blend into the element's edges.
  //
  // Three-tier visual language (per design research, Photoshop / Figma
  // convention): idle has no ring, hover gets a thin 1 px tinted ring,
  // selected gets the full 2 px solid ring + halo. The body.slothcv-
  // dragging CSS in globals.css disables the hover ring on every
  // element except the one being dragged so passing the cursor over
  // siblings doesn't paint the page in hover noise.
  const selectedRingStyle: React.CSSProperties = selected
    ? {
        outline: "2px solid #2563eb",
        outlineOffset: "2px",
        boxShadow: "0 0 0 4px rgba(255,255,255,0.6)",
      }
    : {};
  const ringClass = selected
    ? ""
    : "outline outline-1 outline-transparent hover:outline-blue-400/60 hover:outline-offset-2";

  return (
    <div
      ref={wrapperRef}
      data-element-id={`custom.${el.id}`}
      // duration-75 (was duration-100) — Photoshop-grade selection
      // feels instant. The 100 ms easing on outline / box-shadow used
      // to add a perceptible settle on every hover/select state change
      // and stacked visually as the cursor passed across overlapping
      // elements during a drag (each ring spent 100 ms fading out of
      // its hover state, even with pointer-events disabled). The
      // body.slothcv-dragging / -resizing rule in globals.css ALSO
      // hard-disables transitions during a drag — this duration-75 is
      // the steady-state value for hover/select transitions.
      className={`group ${editing ? "cursor-text" : "cursor-grab"} transition-[outline-color,box-shadow] duration-75 ${ringClass}`}
      style={{ ...wrap, ...selectedRingStyle }}
      onDoubleClick={(e) => {
        // Text elements: double-click enters inline edit mode. Other
        // shapes ignore the gesture (no edit semantics for a rect).
        // stopPropagation so the preview's drag handler doesn't see a
        // second mousedown and treat it as a fresh drag candidate.
        if (el.kind === "text") {
          e.stopPropagation();
          setEditing(true);
        }
      }}
    >
      {renderInner(el, editing, () => setEditing(false))}
      {selected && (
        // Handles wrap the wrapper's actual rendered size (`bounds`)
        // rather than the nominal `el.w/h` from data — they follow
        // any CSS-driven reflow automatically. For images we also
        // auto-fit the wrapper to the image's natural aspect (above)
        // so wrapper / visible image / handle box all coincide.
        <ResizeHandles
          elementId={el.id}
          x={el.x}
          y={el.y}
          w={bounds.w}
          h={bounds.h}
          aspectLock={
            el.kind === "image" && (el.fit ?? "cover") === "contain"
          }
          onCommit={(next) => updateCustomElement(el.id, next)}
        />
      )}
    </div>
  );
}

function renderInner(
  el: CustomElement,
  editing: boolean,
  exitEditing: () => void,
): React.ReactNode {
  switch (el.kind) {
    case "rect":
      return renderRect(el);
    case "ellipse":
      return renderEllipse(el);
    case "line":
      return renderLine(el);
    case "triangle":
      return renderTriangle(el);
    case "star":
      return renderStar(el);
    case "hexagon":
      return renderHexagon(el);
    case "arrow":
      return renderArrow(el);
    case "heart":
      return renderHeart(el);
    case "diamond":
      return renderDiamond(el);
    case "octagon":
      return renderOctagon(el);
    case "cross":
      return renderCross(el);
    case "sparkle":
      return renderSparkle(el);
    case "text":
      return editing ? (
        <EditableText el={el} onCommit={exitEditing} />
      ) : (
        renderText(el)
      );
    case "image":
      return renderImage(el);
    case "icon":
      return renderIcon(el);
  }
}

/** Inline-edit-mode renderer for text elements. Uses contentEditable so
 *  the user can type, select, paste, etc. — same as Canva / Figma text
 *  editing. Commits on blur. While editing, mousedown bypasses the drag
 *  handler because the preview's onMouseDown checks `target.isContentEditable`
 *  and bails out — letting native text-cursor placement happen normally. */
function EditableText({
  el,
  onCommit,
}: {
  el: TextElement;
  onCommit: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const update = useEditorStore((s) => s.updateCustomElement);
  // Auto-focus + select all on enter — matches the natural "I just
  // double-clicked, I'm about to retype" gesture.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, []);
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      style={{
        width: "100%",
        height: "100%",
        outline: "none",
        color: el.color,
        fontSize: el.fontSize,
        fontWeight: el.fontWeight,
        fontFamily: el.fontFamily,
        textAlign: el.align ?? "left",
        fontStyle: el.italic ? "italic" : undefined,
        textDecoration: el.underline ? "underline" : undefined,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        cursor: "text",
      }}
      onBlur={(e) => {
        update(el.id, { text: e.currentTarget.innerText });
        onCommit();
      }}
      onKeyDown={(e) => {
        // Esc cancels (don't commit), Enter+Shift adds newline, plain
        // Enter commits — same as Slack / inline editors.
        if (e.key === "Escape") {
          e.preventDefault();
          onCommit();
        } else if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
    >
      {el.text}
    </div>
  );
}

/** Eight-handle resize affordance.
 *
 *  Refactored from a window-level mousemove approach to **pointer
 *  events with `setPointerCapture`** — the modern Figma / tldraw /
 *  Excalidraw pattern. Per scout's research:
 *
 *    1. setPointerCapture redirects ALL subsequent pointer events on
 *       this pointerId to the captured element regardless of where the
 *       cursor moves. This eliminates the "drag falls off the element
 *       and breaks" class of bugs.
 *    2. The whole gesture's lifecycle (down → moves → up) lives on the
 *       handle itself. No window listeners, no stale closures, no
 *       priority-walking through closest(). React rerenders during the
 *       gesture can't override our DOM writes because the handle is
 *       a direct child component that owns its own ref-only state.
 *    3. Snapshot the start state ONCE on pointerdown — every move reads
 *       only from the ref + the live event coords. No component-state
 *       reads that could be stale.
 *    4. Compute scale dynamically from `wrap.getBoundingClientRect()`
 *       at pointerdown, so it works at any preview zoom.
 *
 *  Visual:
 *    - 24×24 invisible hit zone centered on the corner/edge.
 *    - 11×11 visible white dot inside, with 2px blue ring + drop
 *      shadow so it pops on any background.
 *    - z-index 9999 so it stacks above element body / SVG paths /
 *      images.
 */
function ResizeHandles({
  elementId,
  x,
  y,
  w,
  h,
  aspectLock,
  onCommit,
}: {
  elementId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Force aspect-ratio lock for this element regardless of Shift state.
   *  Set true for image-with-contain so a freehand resize never breaks
   *  the wrapper / image alignment we worked to establish via the
   *  natural-aspect snap. Shift then INVERTS to "free" — same Shift-
   *  inverted-meaning that PS Smart Objects use. */
  aspectLock?: boolean;
  onCommit: (next: { x: number; y: number; w: number; h: number }) => void;
}) {
  const positions: Array<{
    corner: ResizeCorner;
    cx: number;
    cy: number;
    cursor: string;
  }> = [
    { corner: "nw", cx: 0,     cy: 0,     cursor: "nwse-resize" },
    { corner: "n",  cx: w / 2, cy: 0,     cursor: "ns-resize" },
    { corner: "ne", cx: w,     cy: 0,     cursor: "nesw-resize" },
    { corner: "e",  cx: w,     cy: h / 2, cursor: "ew-resize" },
    { corner: "se", cx: w,     cy: h,     cursor: "nwse-resize" },
    { corner: "s",  cx: w / 2, cy: h,     cursor: "ns-resize" },
    { corner: "sw", cx: 0,     cy: h,     cursor: "nesw-resize" },
    { corner: "w",  cx: 0,     cy: h / 2, cursor: "ew-resize" },
  ];
  return (
    <>
      {positions.map((p) => (
        <ResizeHandle
          key={p.corner}
          corner={p.corner}
          elementId={elementId}
          cx={p.cx}
          cy={p.cy}
          cursor={p.cursor}
          x={x}
          y={y}
          w={w}
          h={h}
          aspectLock={aspectLock}
          onCommit={onCommit}
        />
      ))}
    </>
  );
}

/** Single resize handle. Owns its pointer-capture gesture lifecycle.
 *
 *  Modifier keys (live-evaluated every move — Figma model, not the
 *  PS-2019-locked-at-pointerdown model):
 *
 *    - **Shift** (or `aspectLock` prop): constrain aspect ratio. Holding
 *      Shift inverts whichever default is active — if `aspectLock` is on,
 *      Shift = freeform; if `aspectLock` is off, Shift = constrain. Mirrors
 *      every pre-2019 design app convention.
 *    - **Alt/Option**: scale from center — the OPPOSITE corner mirrors the
 *      drag instead of staying anchored. Matches PS / Affinity / Figma.
 *    - **Shift + Alt**: aspect-locked + center-anchored.
 *
 *  Clean-up is a body class, not inline styles, so the rest of the editor
 *  picks up the resize cursor and gets pointer-events disabled (no hover
 *  noise on siblings) via the CSS in globals.css.
 */
function ResizeHandle({
  corner,
  elementId,
  cx,
  cy,
  cursor,
  x,
  y,
  w,
  h,
  aspectLock,
  onCommit,
}: {
  corner: ResizeCorner;
  elementId: string;
  cx: number;
  cy: number;
  cursor: string;
  x: number;
  y: number;
  w: number;
  h: number;
  aspectLock?: boolean;
  onCommit: (next: { x: number; y: number; w: number; h: number }) => void;
}) {
  const handleRef = useRef<HTMLDivElement | null>(null);
  // Live gesture state. Lives in a ref because the move/up handlers are
  // attached AFTER pointerdown via direct DOM listeners — they need to
  // read the snapshot without reading React state (which would be stale).
  const gestureRef = useRef<{
    active: boolean;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    /** Centre of the bounding box at gesture start, used for Alt/center scale. */
    centerX: number;
    centerY: number;
    /** Aspect ratio at gesture start (w/h). Re-applied each frame when
     *  the user holds Shift (or aspectLock is on). */
    startAspect: number;
    visualScale: number;
    wrap: HTMLElement;
    pendingX: number;
    pendingY: number;
    pendingW: number;
    pendingH: number;
  } | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const handle = handleRef.current;
    if (!handle) return;
    const wrap = handle.closest("[data-element-id]") as HTMLElement | null;
    if (!wrap) return;
    // Compute the cumulative visual scale from the wrapper's actual
    // bounding rect vs its intrinsic CSS width. This catches any
    // `transform: scale()` ancestors automatically — the preview's zoom
    // could be 0.6, 0.75, 1.0, etc., and our math compensates.
    const rect = wrap.getBoundingClientRect();
    const visualScale = rect.width / Math.max(1, w);
    handle.setPointerCapture(e.pointerId);
    gestureRef.current = {
      active: true,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: x,
      startY: y,
      startW: w,
      startH: h,
      centerX: x + w / 2,
      centerY: y + h / 2,
      startAspect: w / Math.max(1, h),
      visualScale: visualScale || 1,
      wrap,
      pendingX: x,
      pendingY: y,
      pendingW: w,
      pendingH: h,
    };
    // Drag-isolation body class — see the matching CSS in globals.css.
    // Sets pointer-events: none on every preview-stage child except the
    // one being resized so we don't paint hover rings everywhere as the
    // box grows over siblings. Cursor is forced to the corner cursor.
    document.body.classList.add("slothcv-resizing");
    document.body.style.cursor = cursor;
    document.body.style.userSelect = "none";
    wrap.setAttribute("data-being-dragged", "true");
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const g = gestureRef.current;
    if (!g || !g.active || e.pointerId !== g.pointerId) return;
    // Modifiers — re-read every move so the user can tap Shift/Alt
    // mid-drag and see the effect immediately. Aspect lock applies
    // when EITHER the prop is set (image-with-contain) OR the user is
    // holding Shift; Shift INVERTS the prop's default so a held Shift
    // releases the aspect lock for one drag.
    const aspect = aspectLock !== !!e.shiftKey;
    const center = e.altKey;

    const dx = (e.clientX - g.startClientX) / g.visualScale;
    const dy = (e.clientY - g.startClientY) / g.visualScale;
    // Sign per axis: which way does this corner extend the box.
    const sx = corner === "e" || corner === "ne" || corner === "se" ? 1 : corner === "w" || corner === "nw" || corner === "sw" ? -1 : 0;
    const sy = corner === "s" || corner === "se" || corner === "sw" ? 1 : corner === "n" || corner === "nw" || corner === "ne" ? -1 : 0;

    // For Alt/center-scale, drag delta is mirrored into the opposite
    // side, doubling the apparent change. Width grows by 2 * sx * dx
    // around the centre instead of 1 * sx * dx.
    let nw: number;
    let nh: number;
    if (center) {
      nw = g.startW + 2 * sx * dx;
      nh = g.startH + 2 * sy * dy;
    } else {
      nw = g.startW + sx * dx;
      nh = g.startH + sy * dy;
    }
    // For edge handles only one axis was driven; preserve the other.
    if (sx === 0) nw = g.startW;
    if (sy === 0) nh = g.startH;

    if (aspect && (sx !== 0 || sy !== 0)) {
      // Aspect-lock heuristic: the axis with the LARGER signed delta
      // (in box-space, i.e. relative to the box's own dims) drives,
      // and the other axis snaps to ratio. This matches Figma's "drive
      // by the corner direction with bigger delta" feel — neither axis
      // jitters when the cursor moves diagonally.
      const ar = g.startAspect;
      // Signed box-space deltas for the two axes (positive = grow box).
      const wx = sx === 0 ? -Infinity : nw - g.startW;
      const wy = sy === 0 ? -Infinity : nh - g.startH;
      // Compare proportional change so different aspect ratios stay fair.
      const propX = sx === 0 ? -Infinity : Math.abs(wx) / Math.max(1, g.startW);
      const propY = sy === 0 ? -Infinity : Math.abs(wy) / Math.max(1, g.startH);
      if (propX >= propY) {
        nh = nw / ar;
      } else {
        nw = nh * ar;
      }
    }

    // Now derive the new top-left position. Two anchors:
    //   - center mode: center stays put → x = centerX - w/2.
    //   - default mode: the OPPOSITE corner stays put → recompute x/y
    //     from anchor offsets.
    let nx: number;
    let ny: number;
    if (center) {
      nx = g.centerX - nw / 2;
      ny = g.centerY - nh / 2;
    } else {
      // Anchor for x is the LEFT edge if we're growing east-side, else right.
      nx = sx === -1 ? g.startX + g.startW - nw : g.startX;
      ny = sy === -1 ? g.startY + g.startH - nh : g.startY;
    }

    const minSize = 8;
    if (nw < minSize) {
      // Don't let the right edge cross the anchored left edge.
      if (!center && sx === -1) {
        nx = g.startX + g.startW - minSize;
      }
      nw = minSize;
    }
    if (nh < minSize) {
      if (!center && sy === -1) {
        ny = g.startY + g.startH - minSize;
      }
      nh = minSize;
    }
    const rx = Math.round(nx);
    const ry = Math.round(ny);
    const rw = Math.round(nw);
    const rh = Math.round(nh);
    // Direct DOM mutation — bypasses React for 60fps perf during drag.
    g.wrap.style.left = `${rx}px`;
    g.wrap.style.top = `${ry}px`;
    g.wrap.style.width = `${rw}px`;
    g.wrap.style.height = `${rh}px`;
    g.wrap.style.willChange = "left, top, width, height";
    g.pendingX = rx;
    g.pendingY = ry;
    g.pendingW = rw;
    g.pendingH = rh;
  }

  function endGesture(e: React.PointerEvent<HTMLDivElement>) {
    const g = gestureRef.current;
    if (!g || !g.active) return;
    g.active = false;
    document.body.classList.remove("slothcv-resizing");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    g.wrap.removeAttribute("data-being-dragged");
    try {
      handleRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // releasePointerCapture can throw if the pointer was never
      // captured (extreme edge case in some browsers). Swallow — the
      // commit path doesn't depend on it.
    }
    g.wrap.style.willChange = "";
    onCommit({
      x: g.pendingX,
      y: g.pendingY,
      w: g.pendingW,
      h: g.pendingH,
    });
    gestureRef.current = null;
  }

  return (
    <div
      ref={handleRef}
      data-resize-handle={corner}
      data-resize-target={elementId}
      className="absolute touch-none"
      style={{
        left: cx - 12,
        top: cy - 12,
        width: 24,
        height: 24,
        cursor,
        pointerEvents: "auto",
        zIndex: 9999,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      // Defensive: kill mousedown bubbling so the preview's window
      // listener doesn't try to start its own custom-element drag.
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white"
        style={{
          width: 11,
          height: 11,
          pointerEvents: "none",
          boxShadow: "0 0 0 2px #2563eb, 0 1px 4px rgba(0,0,0,0.35)",
        }}
      />
    </div>
  );
}

function renderRect(el: RectElement) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: el.fill,
        border:
          el.stroke && el.strokeWidth
            ? `${el.strokeWidth}px solid ${el.stroke}`
            : undefined,
        borderRadius: el.radius ?? 0,
      }}
    />
  );
}

function renderEllipse(el: EllipseElement) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: el.fill,
        border:
          el.stroke && el.strokeWidth
            ? `${el.strokeWidth}px solid ${el.stroke}`
            : undefined,
        borderRadius: "50%",
      }}
    />
  );
}

function renderLine(el: LineElement) {
  // Render as a top-aligned horizontal line within the element bounds.
  // Rotation comes from `el.rotate` on the wrapper, which lets the user
  // produce diagonals without us having to do trig here. The dashed
  // pattern uses CSS `border-top` style.
  const style: React.CSSProperties = {
    width: "100%",
    height: 0,
    borderTopColor: el.color,
    borderTopWidth: el.thickness,
    borderTopStyle:
      el.dash && el.dash.length > 0
        ? el.dash.length === 1 || el.dash[0] === el.dash[1]
          ? "dashed"
          : "dotted"
        : "solid",
    marginTop: (el.h - el.thickness) / 2,
  };
  return <div style={style} />;
}

function renderText(el: TextElement) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        color: el.color,
        fontSize: el.fontSize,
        fontWeight: el.fontWeight,
        fontFamily: el.fontFamily,
        textAlign: el.align ?? "left",
        fontStyle: el.italic ? "italic" : undefined,
        textDecoration: el.underline ? "underline" : undefined,
        // Wrap long text inside the box rather than overflow it.
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        // Vertical centering when the user hasn't set a tight height —
        // matches Canva/Figma's "text fills its box" behaviour.
        display: "flex",
        alignItems: "flex-start",
      }}
    >
      <span style={{ width: "100%" }}>{el.text}</span>
    </div>
  );
}

/** Generic SVG shape wrapper. The path is drawn in a viewBox sized to
 *  the element's natural w/h so it scales cleanly with resize handles
 *  without deforming the stroke. preserveAspectRatio="none" lets it
 *  stretch to non-square boxes (e.g. wide arrow). */
function ShapeSvg({
  el,
  pathD,
  viewW,
  viewH,
}: {
  el: { fill: string; stroke?: string; strokeWidth?: number };
  pathD: string;
  viewW: number;
  viewH: number;
}) {
  return (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      preserveAspectRatio="none"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        overflow: "visible",
      }}
    >
      <path
        d={pathD}
        fill={el.fill}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth ?? 0}
      />
    </svg>
  );
}

function renderTriangle(el: TriangleElement) {
  // Equilateral-ish: apex at top-center, base across the bottom.
  const path = `M 50 0 L 100 100 L 0 100 Z`;
  return <ShapeSvg el={el} pathD={path} viewW={100} viewH={100} />;
}

function renderStar(el: StarElement) {
  // 5-point star inscribed in 100x100 with outer radius 48, inner 22.
  // Math: 10 vertices alternating outer/inner, starting at the top.
  const cx = 50, cy = 50, R = 48, r = 22;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? R : r;
    pts.push(`${cx + radius * Math.cos(angle)} ${cy + radius * Math.sin(angle)}`);
  }
  const path = `M ${pts.join(" L ")} Z`;
  return <ShapeSvg el={el} pathD={path} viewW={100} viewH={100} />;
}

function renderHexagon(el: HexagonElement) {
  // Pointy-top hex inscribed in 100x100; 6 vertices, 60° apart.
  const cx = 50, cy = 50, R = 48;
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${cx + R * Math.cos(angle)} ${cy + R * Math.sin(angle)}`);
  }
  const path = `M ${pts.join(" L ")} Z`;
  return <ShapeSvg el={el} pathD={path} viewW={100} viewH={100} />;
}

function renderArrow(el: ArrowElement) {
  // Right-pointing arrow built in a 200×100 viewBox: shaft 0..130 wide,
  // arrowhead 130..200. preserveAspectRatio="none" lets it stretch to
  // any aspect ratio the user resizes to.
  const path = "M 0 35 L 130 35 L 130 10 L 200 50 L 130 90 L 130 65 L 0 65 Z";
  return <ShapeSvg el={el} pathD={path} viewW={200} viewH={100} />;
}

function renderHeart(el: HeartElement) {
  // Classic heart silhouette in a 100×95 viewBox. Two cubic-Bezier
  // curves form the lobes, meeting at the bottom V. Geometric (not
  // emoji) so it rasterizes cleanly to PDF.
  const path =
    "M 50 15 C 30 -5, -5 5, 5 35 C 12 60, 30 75, 50 92 C 70 75, 88 60, 95 35 C 105 5, 70 -5, 50 15 Z";
  return <ShapeSvg el={el} pathD={path} viewW={100} viewH={95} />;
}

function renderDiamond(el: DiamondElement) {
  // 4-point diamond (rotated square). Apex points at top/bottom/left/right.
  const path = "M 50 0 L 100 50 L 50 100 L 0 50 Z";
  return <ShapeSvg el={el} pathD={path} viewW={100} viewH={100} />;
}

function renderOctagon(el: OctagonElement) {
  // Regular 8-sided polygon. Eight vertices at 45° spacing.
  const cx = 50, cy = 50, R = 48;
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i - Math.PI / 8; // tilt so flat top/bottom
    pts.push(`${cx + R * Math.cos(angle)} ${cy + R * Math.sin(angle)}`);
  }
  const path = `M ${pts.join(" L ")} Z`;
  return <ShapeSvg el={el} pathD={path} viewW={100} viewH={100} />;
}

function renderCross(el: CrossElement) {
  // Plus / cross / first-aid-style shape. 12 corners forming a + outline.
  // Center 100x100; arm width 30, arm length out from center 50.
  const path =
    "M 35 0 L 65 0 L 65 35 L 100 35 L 100 65 L 65 65 L 65 100 L 35 100 L 35 65 L 0 65 L 0 35 L 35 35 Z";
  return <ShapeSvg el={el} pathD={path} viewW={100} viewH={100} />;
}

function renderSparkle(el: SparkleElement) {
  // 4-point sparkle (Apple-style "shimmer"). Pointy at top/bottom/left/
  // right with concave waists. Hand-tuned for instant recognisability
  // even at small sizes.
  const path =
    "M 50 0 L 56 44 L 100 50 L 56 56 L 50 100 L 44 56 L 0 50 L 44 44 Z";
  return <ShapeSvg el={el} pathD={path} viewW={100} viewH={100} />;
}

/** Brand-glyph renderer. Looks the icon up in the registry, falls back
 *  to a neutral placeholder if the registry doesn't know the name (the
 *  Zod schema gates this at load time, but defensive rendering covers
 *  the case where the registry is updated and an old in-memory CV
 *  references a removed glyph during a hot-reload). The fill is driven
 *  by `el.color`, so the inspector's color picker writes the persisted
 *  CV value and the user sees an instant recolour. preserveAspectRatio
 *  is left at the default `xMidYMid meet` so square-aspect glyphs stay
 *  square even if the user drag-resizes to a non-square box — they
 *  centre inside the box. (For polygon shapes we use "none" / stretch,
 *  but brand glyphs visibly distort when stretched and the user
 *  expects the corner-handle Shift modifier to lock aspect — the
 *  inspector layer already shows that affordance.) */
function renderIcon(el: IconElement) {
  const def = isSocialIconName(el.iconName)
    ? SOCIAL_ICONS_BY_NAME[el.iconName]
    : null;
  if (!def) {
    // Fallback — a faint dashed square with a "?" so the user notices
    // and can swap to a known icon via the inspector. Far better than
    // an invisible element that the user thinks they "lost".
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          border: "2px dashed #cbd5e1",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: 18,
          fontWeight: 700,
        }}
        aria-label="Unknown icon — open the inspector to choose a brand"
      >
        ?
      </div>
    );
  }
  return (
    <svg
      viewBox={def.viewBox}
      width="100%"
      height="100%"
      style={{ display: "block" }}
      aria-label={def.label}
      role="img"
    >
      <path d={def.path} fill={el.color} />
    </svg>
  );
}

function renderImage(el: ImageElement) {
  if (!el.url) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "repeating-linear-gradient(45deg, #e5e7eb 0 8px, #f3f4f6 8px 16px)",
          borderRadius: el.radius ?? 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9ca3af",
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        Add image URL in inspector
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={el.url}
      alt=""
      referrerPolicy="no-referrer"
      // CRITICAL: `draggable={false}` blocks the browser's native
      // image-drag gesture. Without this, the first mousedown on an
      // <img> triggers the OS-level "drag this image" UI (you can drop
      // it on the desktop, etc.) and our mousedown→drag handler never
      // sees consistent events. Setting it false on the IMG tag forces
      // mousedown to bubble normally to the wrapper div, where our
      // drag handler picks it up cleanly.
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      style={{
        width: "100%",
        height: "100%",
        objectFit: el.fit ?? "cover",
        borderRadius: el.radius ?? 0,
        display: "block",
        // Disable the OS user-select highlight on the image so a drag
        // doesn't paint blue selection over the picture.
        userSelect: "none",
        WebkitUserSelect: "none",
        // Mobile-friendly: no callout when long-pressing.
        WebkitTouchCallout: "none",
      }}
    />
  );
}
