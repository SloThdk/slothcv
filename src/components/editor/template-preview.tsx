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

import { useEffect, useMemo, useRef, useState } from "react";
import { TemplateRenderer } from "@/templates/renderer";
import { sampleResumeData } from "@/templates/sample-data";
import { PAGE_DIMENSIONS_MM, mmToPx } from "@/templates/shared";
import { defaultDesignForTemplate } from "@/lib/resume-defaults";
import type { ResumeData, TemplateId } from "@/types/resume";

interface Props {
  id: TemplateId;
  /** Tailwind utility for the outer aspect / size container. Defaults to A4
   *  proportions (210/297) so the full document is visible. Override with
   *  `aspect-square` etc if a different ratio is needed. */
  className?: string;
  /** Resume data to render. When omitted (e.g. landing-page anonymous
   *  gallery), the per-template `sampleResumeData(id)` persona is used —
   *  Sam Carter for dev templates, Alex Lindgren for design, etc. The
   *  in-editor Templates tab passes the user's REAL data so the
   *  thumbnail and the post-swap preview show the SAME content (no
   *  surprise photos / personas). The `id` is still used to drive the
   *  layout and to thread through the renderer; the data's
   *  `meta.template` is overridden so each card renders the right
   *  layout regardless of what's currently selected. */
  data?: ResumeData;
}

export function TemplatePreview({
  id,
  className = "aspect-[210/297]",
  data: providedData,
}: Props) {
  // Decide what content to render. Prefer caller-supplied data (the
  // user's actual CV in the editor); fall back to a per-template sample
  // persona for the landing-page gallery.
  //
  // For each card we override BOTH meta.template AND design so the card
  // shows what the user will get when they click "Switch template" —
  // the template's intended visual identity (Aurora's mint on dark navy,
  // Eclipse's warm amber serif, Manhattan's navy/gold, etc.) merged with
  // the user's content. This matches setTemplate's behaviour in the
  // editor store, so card → post-swap parity is preserved.
  //
  // For the landing-page anonymous gallery, sampleResumeData(id) already
  // bakes the per-template design tokens, so no merging needed there.
  //
  // Memoised on (providedData, id) so we don't allocate a new object
  // every render.
  const data = useMemo<ResumeData>(() => {
    if (!providedData) return sampleResumeData(id);
    return {
      ...providedData,
      meta: { ...providedData.meta, template: id },
      design: defaultDesignForTemplate(id),
    };
  }, [providedData, id]);
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
