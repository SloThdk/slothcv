/**
 * editor-snap — smart guides / edge & center snap for the visual editor.
 *
 * Per the smart-guides research (Photoshop, Affinity, Figma, Sketch):
 *
 *   - Threshold: 8 px in editor coords (matches PS / Affinity defaults).
 *     Figma uses 5 px but for non-designers (our audience) a slightly
 *     larger threshold is more forgiving without feeling sticky.
 *   - Six snap lines per element: left, h-center, right, top, v-center,
 *     bottom. Plus the page as a virtual element so users can snap to
 *     page edges + page center.
 *   - One snap PER AXIS — smallest absolute delta wins. Without this the
 *     overlay would render multiple competing lines and feel chaotic.
 *   - Hold Ctrl/Cmd to bypass — universal across all four tools.
 *   - Visual: a single magenta line per active snap, spanning from the
 *     topmost edge of the (dragged, candidate) pair to the bottommost.
 *     Magenta `#ff0066` is the WCAG-safe Photoshop / Figma convention —
 *     distinct from the blue selection ring so users don't confuse the
 *     two state channels.
 *
 * Algorithm: O(6n + 6) per pointermove. For our typical CV (~10 elements),
 * one snap pass is ~60 comparisons — well under one frame budget. We
 * don't need a spatial index at this scale; that's the v2 deferral path
 * for documents with hundreds of layers.
 */

/** A draggable / snappable rectangle in page coordinates. */
export interface SnapRect {
  /** Stable id — used to exclude self from the candidate list. */
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A guide line that should be drawn while a snap is active. */
export interface SnapGuide {
  /** Which axis the line lies along — `"x"` is a vertical guide, `"y"` is horizontal. */
  axis: "x" | "y";
  /** Position of the line in page coords (the page x for vertical, page y for horizontal). */
  pos: number;
  /** Extent of the guide along the OTHER axis: `[start, end]` in page coords.
   *  We draw from the lowest extent of either rect to the highest, so the line
   *  visually "joins" the dragged box and the candidate it's snapping to. */
  extent: [number, number];
}

/** Result of a snap pass — corrected position + the guides to render. */
export interface SnapResult {
  /** Snapped x. May equal the input x if no snap fired on this axis. */
  x: number;
  /** Snapped y. May equal the input y if no snap fired on this axis. */
  y: number;
  /** Active snap guides — one per axis at most. Empty when nothing snapped. */
  guides: SnapGuide[];
}

/** Default snap distance, in page (pre-zoom) px. */
export const SNAP_THRESHOLD = 8;

/** Build the candidate list once at drag-start. Cheaper than rebuilding
 *  on every pointermove — the candidates don't move during a single drag.
 *
 *  Always pushes the PAGE rect as a virtual candidate so the user can
 *  snap to page edges (top/left/right/bottom) and page center. The page
 *  is identified by id `"__page__"` so the caller can style its guides
 *  differently if desired. */
export function buildSnapCandidates(
  rects: SnapRect[],
  draggedId: string,
  pageWidth: number,
  pageHeight: number,
): SnapRect[] {
  const out: SnapRect[] = [];
  for (const r of rects) {
    if (r.id === draggedId) continue;
    out.push(r);
  }
  out.push({ id: "__page__", x: 0, y: 0, w: pageWidth, h: pageHeight });
  return out;
}

/** Run a snap pass against the candidate list.
 *
 *  Strategy: collect candidate edges per axis (left/center/right for x,
 *  top/center/bottom for y), then for each of the dragged element's three
 *  edges per axis, find the smallest delta to any candidate edge below
 *  the threshold. The winning delta is applied to the dragged position
 *  and a single guide line is recorded for that axis.
 *
 *  Returns `{ x, y, guides }`. The caller applies `x, y` as the new
 *  position and dispatches a render of `guides` in a magenta overlay. */
export function snap(
  dragged: SnapRect,
  candidates: SnapRect[],
  threshold = SNAP_THRESHOLD,
): SnapResult {
  // Dragged element's three edges per axis.
  const dxs = [dragged.x, dragged.x + dragged.w / 2, dragged.x + dragged.w];
  const dys = [dragged.y, dragged.y + dragged.h / 2, dragged.y + dragged.h];

  // Track the best snap per axis: smallest |delta| wins.
  let bestDx = 0;
  let bestDxAbs = Infinity;
  let bestDxCandidate: SnapRect | null = null;
  let bestDxLine = 0; // candidate edge position on x axis
  let bestDy = 0;
  let bestDyAbs = Infinity;
  let bestDyCandidate: SnapRect | null = null;
  let bestDyLine = 0;

  for (const c of candidates) {
    const cxs = [c.x, c.x + c.w / 2, c.x + c.w];
    const cys = [c.y, c.y + c.h / 2, c.y + c.h];

    for (const dx of dxs) {
      for (const cx of cxs) {
        const delta = cx - dx;
        const ad = Math.abs(delta);
        if (ad < threshold && ad < bestDxAbs) {
          bestDx = delta;
          bestDxAbs = ad;
          bestDxCandidate = c;
          bestDxLine = cx;
        }
      }
    }
    for (const dy of dys) {
      for (const cy of cys) {
        const delta = cy - dy;
        const ad = Math.abs(delta);
        if (ad < threshold && ad < bestDyAbs) {
          bestDy = delta;
          bestDyAbs = ad;
          bestDyCandidate = c;
          bestDyLine = cy;
        }
      }
    }
  }

  const guides: SnapGuide[] = [];
  if (bestDxCandidate) {
    // Vertical guide at x = bestDxLine. Extent spans from min(dragged.top,
    // candidate.top) to max(dragged.bottom, candidate.bottom) so the guide
    // visually joins the two boxes. Use the SNAPPED dragged position (post-
    // correction) so the extent looks right after the snap fires.
    const dTop = dragged.y;
    const dBot = dragged.y + dragged.h;
    const cTop = bestDxCandidate.y;
    const cBot = bestDxCandidate.y + bestDxCandidate.h;
    guides.push({
      axis: "x",
      pos: bestDxLine,
      extent: [Math.min(dTop, cTop), Math.max(dBot, cBot)],
    });
  }
  if (bestDyCandidate) {
    const dLeft = dragged.x + bestDx; // post-snap x
    const dRight = dLeft + dragged.w;
    const cLeft = bestDyCandidate.x;
    const cRight = bestDyCandidate.x + bestDyCandidate.w;
    guides.push({
      axis: "y",
      pos: bestDyLine,
      extent: [Math.min(dLeft, cLeft), Math.max(dRight, cRight)],
    });
  }

  return {
    x: dragged.x + bestDx,
    y: dragged.y + bestDy,
    guides,
  };
}
