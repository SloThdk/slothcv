/**
 * Blank — a totally clean A4 sheet with NO baked-in chrome. Designed for
 * users who want a pure visual-designer experience: open the toolshelf,
 * drag in shapes / lines / text / images, and build their own CV from
 * scratch on a paper canvas.
 *
 * This template renders no personal block, no sections, no watermark —
 * only the toolshelf overlay (CustomElementsLayer) wired through
 * `<TemplateFrame>`. Everything the user sees is something they placed
 * via the toolshelf.
 *
 * Why a separate template instead of just a flag? It changes the user's
 * mental model — "I'm in design mode" vs "I'm filling out a CV with
 * decoration on top". The toolshelf is *available* on every template;
 * Blank is the one where the toolshelf is *all there is*.
 */

"use client";

import { TemplateFrame } from "./frame";
import type { ResumeData } from "@/types/resume";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function BlankTemplate({ data, fixedSize, skipOverlay }: Props) {
  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* No baked content. Empty-state hint encourages users to open the
          toolshelf — disappears as soon as they place anything. */}
      {(!data.customElements || data.customElements.length === 0) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-lg border border-dashed border-strong px-6 py-4 text-center text-sm text-muted">
            <div className="font-semibold text-fg">Blank canvas</div>
            <div className="mt-0.5 text-xs">
              Open the “Add” tab on the left → drop in shapes, lines, text,
              and images.
            </div>
          </div>
        </div>
      )}
    </TemplateFrame>
  );
}
