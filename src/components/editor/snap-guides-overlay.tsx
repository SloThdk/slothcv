/**
 * SnapGuidesOverlay — magenta lines drawn while a drag/resize is actively
 * snapping. Mounted INSIDE the page sheet's transformed wrapper so it
 * naturally inherits the same `transform: scale()` the rest of the
 * preview uses (no manual zoom math needed).
 *
 * Listens for window-level `slothcv:snap-guides` events. The drag handler
 * dispatches the latest active guides on every move; we render whatever
 * we got. On `slothcv:snap-guides-end` we clear.
 *
 * Why magenta `#ff0066`: distinct from our blue selection ring (`#2563eb`)
 * so users perceive guides as a different state channel — temporal events
 * instead of persistent state. PS / Figma / Sketch all use a magenta hue
 * for the same reason. WCAG-safe contrast against white CV pages.
 */

"use client";

import { useEffect, useState } from "react";
import type { SnapGuide } from "@/lib/editor-snap";

const GUIDE_COLOR = "#ff0066";
const GUIDE_WIDTH = 1; // 1 px in page coordinates

interface OverlayPayload {
  guides: SnapGuide[];
}

export function SnapGuidesOverlay({
  pageWidth,
  pageHeight,
}: {
  pageWidth: number;
  pageHeight: number;
}) {
  const [guides, setGuides] = useState<SnapGuide[]>([]);

  useEffect(() => {
    function onUpdate(e: Event) {
      const detail = (e as CustomEvent<OverlayPayload>).detail;
      setGuides(detail?.guides ?? []);
    }
    function onEnd() {
      setGuides([]);
    }
    window.addEventListener("slothcv:snap-guides", onUpdate);
    window.addEventListener("slothcv:snap-guides-end", onEnd);
    return () => {
      window.removeEventListener("slothcv:snap-guides", onUpdate);
      window.removeEventListener("slothcv:snap-guides-end", onEnd);
    };
  }, []);

  if (guides.length === 0) return null;

  return (
    <svg
      // Pinned to the page sheet's coordinate system, NOT pointer-events
      // active — guides are read-only feedback, never interactive.
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: pageWidth,
        height: pageHeight,
        pointerEvents: "none",
        // Above content + custom elements (z 10) but below toast/modal.
        zIndex: 9998,
      }}
      viewBox={`0 0 ${pageWidth} ${pageHeight}`}
      preserveAspectRatio="none"
    >
      {guides.map((g, i) => {
        if (g.axis === "x") {
          // Vertical guide line at x = g.pos, spanning g.extent on y.
          return (
            <line
              key={`x-${i}-${g.pos}`}
              x1={g.pos}
              x2={g.pos}
              y1={g.extent[0]}
              y2={g.extent[1]}
              stroke={GUIDE_COLOR}
              strokeWidth={GUIDE_WIDTH}
              shapeRendering="crispEdges"
            />
          );
        }
        // Horizontal guide at y = g.pos, spanning g.extent on x.
        return (
          <line
            key={`y-${i}-${g.pos}`}
            x1={g.extent[0]}
            x2={g.extent[1]}
            y1={g.pos}
            y2={g.pos}
            stroke={GUIDE_COLOR}
            strokeWidth={GUIDE_WIDTH}
            shapeRendering="crispEdges"
          />
        );
      })}
    </svg>
  );
}
