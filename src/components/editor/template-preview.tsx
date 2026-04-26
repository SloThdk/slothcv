/**
 * TemplatePreview — renders the REAL template with sample data, scaled down
 * into an A4-shaped card so the user sees how the FULL document looks.
 *
 * Why A4-shaped (210/297, ~1:1.414) and not 3/4 (1:1.333)? With 3/4 the page
 * is taller than the container so the bottom 6% gets clipped — making
 * thumbnails look "enlarged" with no visible end-of-page. Matching the
 * actual page ratio means we see the entire document edge-to-edge.
 *
 * Implementation:
 *   - Mount `<TemplateRenderer fixedSize>` so the template emits an A4-shaped
 *     element at intrinsic mm-derived width.
 *   - Use a `ResizeObserver` to compute the scale ratio that fits the page
 *     into the card width.
 *   - Apply `transform: scale(ratio)` so all type/positioning stays crisp
 *     (no canvas rasterization).
 *   - Disable pointer-events on the inner content so the parent <Link>/<button>
 *     captures clicks.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { TemplateRenderer } from "@/templates/renderer";
import { sampleResumeData } from "@/templates/sample-data";
import { PAGE_DIMENSIONS_MM, mmToPx } from "@/templates/shared";
import type { TemplateId } from "@/types/resume";

interface Props {
  id: TemplateId;
  /** Tailwind utility for the outer aspect / size container. Defaults to A4
   *  proportions (210/297) so the full document is visible. Override with
   *  `aspect-square` etc if a different ratio is needed. */
  className?: string;
}

export function TemplatePreview({ id, className = "aspect-[210/297]" }: Props) {
  const data = sampleResumeData(id);
  const pageWidthPx = mmToPx(PAGE_DIMENSIONS_MM[data.design.pageSize].w);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  // Track wrapper width and rescale so the page content always fits.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const recompute = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / pageWidthPx);
    };
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    recompute();
    return () => ro.disconnect();
  }, [pageWidthPx]);

  return (
    <div
      ref={wrapRef}
      className={`relative w-full overflow-hidden bg-surface-hover ${className}`}
    >
      {/* Inner stage uses the page's intrinsic px width and is then scaled.
         pointer-events-none lets parent links capture clicks. */}
      <div
        className="pointer-events-none origin-top-left"
        style={{
          width: pageWidthPx,
          transform: `scale(${scale})`,
        }}
      >
        <TemplateRenderer data={data} fixedSize={true} skipOverlay />
      </div>
    </div>
  );
}
