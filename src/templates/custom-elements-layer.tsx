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

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/lib/store/editor";
import type {
  ArrowElement,
  CrossElement,
  CustomElement,
  DiamondElement,
  EllipseElement,
  HeartElement,
  HexagonElement,
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
      data-element-id={`custom.${el.id}`}
      className={`group ${editing ? "cursor-text" : "cursor-grab"} transition-[outline-color,box-shadow] duration-100 ${ringClass}`}
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
        // Lines get a simpler 2-handle resize (just the endpoints),
        // everything else gets the full 8-handle box. For now we render
        // 8 handles even on lines — the user can resize the bounding
        // box and the line stretches to match.
        <ResizeHandles
          elementId={el.id}
          x={el.x}
          y={el.y}
          w={el.w}
          h={el.h}
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
  onCommit,
}: {
  elementId: string;
  x: number;
  y: number;
  w: number;
  h: number;
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
          onCommit={onCommit}
        />
      ))}
    </>
  );
}

/** Single resize handle. Owns its pointer-capture gesture lifecycle. */
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
      visualScale: visualScale || 1,
      wrap,
      pendingX: x,
      pendingY: y,
      pendingW: w,
      pendingH: h,
    };
    // Visual cue while resizing — body cursor takes over so the user
    // sees the resize cursor everywhere on the page until release.
    document.body.style.cursor = cursor;
    document.body.style.userSelect = "none";
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const g = gestureRef.current;
    if (!g || !g.active || e.pointerId !== g.pointerId) return;
    const dx = (e.clientX - g.startClientX) / g.visualScale;
    const dy = (e.clientY - g.startClientY) / g.visualScale;
    let nw = g.startW;
    let nh = g.startH;
    let nx = g.startX;
    let ny = g.startY;
    if (corner === "e" || corner === "ne" || corner === "se") nw = g.startW + dx;
    if (corner === "w" || corner === "nw" || corner === "sw") {
      nw = g.startW - dx;
      nx = g.startX + dx;
    }
    if (corner === "s" || corner === "se" || corner === "sw") nh = g.startH + dy;
    if (corner === "n" || corner === "nw" || corner === "ne") {
      nh = g.startH - dy;
      ny = g.startY + dy;
    }
    const minSize = 8;
    if (nw < minSize) {
      // Don't let the right edge cross the anchored left edge.
      if (corner === "w" || corner === "nw" || corner === "sw") {
        nx = g.startX + g.startW - minSize;
      }
      nw = minSize;
    }
    if (nh < minSize) {
      if (corner === "n" || corner === "nw" || corner === "ne") {
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
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
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
