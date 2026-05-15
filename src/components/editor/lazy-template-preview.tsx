/**
 * LazyTemplatePreview — defers mounting `<TemplatePreview>` until the
 * card scrolls within ~one viewport-height of the visible region.
 *
 * Why this is its own component:
 *   The landing-page gallery renders ~60 template cards. Each card's
 *   TemplatePreview imports the template's per-template chunk via
 *   `next/dynamic` (see `templates/renderer.tsx`), so every card
 *   triggers a network fetch for its chunk the moment React mounts
 *   it — even though only the ~6 cards above the fold are visible at
 *   first paint. PageSpeed flagged this as 137 KiB of unused JS on
 *   landing, all of which was the editor-side template chunks for
 *   cards the user wasn't looking at.
 *
 *   `content-visibility: auto` on the wrapping card (already set on
 *   the gallery item in `app/page.tsx`) skips paint + style for
 *   off-screen elements but does NOT prevent React from mounting
 *   them, so the dynamic imports still fire. The fix has to happen
 *   at the React layer: keep the card as a static placeholder until
 *   IntersectionObserver says it's close to the viewport, then mount
 *   the real preview. After the first mount the preview stays
 *   mounted (no re-unmount on scroll-out) so subsequent scrolls
 *   don't trigger re-fetches.
 *
 * Why a 200 px rootMargin:
 *   Triggers the mount when the card is still ~one card-height
 *   below the viewport, so by the time the user actually sees it,
 *   the dynamic chunk has already loaded and rendered. Mirrors the
 *   pattern used by Next.js's own next/image lazy loading.
 */
"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { TemplatePreview } from "./template-preview";
import type { ResumeData, TemplateId } from "@/types/resume";

interface Props {
  id: TemplateId;
  className?: string;
  data?: ResumeData;
  /** Placeholder background — defaults to the card's surface tone so
   *  the un-mounted state visually matches the rest of the gallery
   *  card and doesn't read as "broken / loading" before scroll. */
  placeholderStyle?: CSSProperties;
}

export function LazyTemplatePreview({
  id,
  className = "aspect-[210/297]",
  data,
  placeholderStyle,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // If the browser doesn't support IntersectionObserver (very old
    // mobile Safari), mount immediately — better to ship the chunk
    // than to never render the preview.
    if (typeof IntersectionObserver === "undefined") {
      setShouldMount(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldMount(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`relative w-full overflow-hidden bg-surface-hover ${className}`}
      style={placeholderStyle}
    >
      {shouldMount ? (
        <TemplatePreview id={id} className="" data={data} />
      ) : null}
    </div>
  );
}
