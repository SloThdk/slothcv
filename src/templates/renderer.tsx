/**
 * Template renderer — dispatches to the right per-template DOM component
 * given a `TemplateId`. Used by both the live editor preview and the
 * landing-page template thumbnails.
 *
 * Performance-critical: this file is in the critical path of the dashboard
 * gallery (renders 44 templates as scaled-down previews) AND the editor
 * preview (renders ONE template at full size). The earlier eager-import
 * implementation pulled every template module into the initial bundle of
 * any page that touched the renderer — ~30+ KB of JS the user never saw.
 *
 * Strategy: each template is wrapped in `next/dynamic(..., { ssr: false })`
 * so it ships in its own async chunk. The dispatch becomes an indexed
 * lookup against a map keyed by `TemplateId`.
 *
 * Why `ssr: false`:
 *   - The whole app is `output: 'export'` (static HTML at build time) and
 *     the template preview is mounted from `"use client"` parents only.
 *     Disabling SSR on the dynamic component avoids `next build` trying to
 *     render the template into HTML during export — which would re-eager
 *     every module and defeat the split.
 *   - Templates depend on `useEditorStore` indirectly (via section overlay
 *     hooks) and on `window`-scoped CSS variables. Server rendering them
 *     would either no-op or hydration-mismatch.
 *
 * The `skipOverlay` flag is forwarded to every per-template component so
 * the toolshelf overlay only renders inside the live editor, not on the
 * static gallery thumbnails (which mount outside the editor store).
 */

"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ResumeData, TemplateId } from "@/types/resume";

/** Shared shape for every per-template component. The template files all
 *  export a named const matching `<Name>Template`; the dynamic loader
 *  picks that named export and wraps it in a default-export shim so
 *  `next/dynamic` is happy. */
interface TemplateComponentProps {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

/** Tiny placeholder rendered while the per-template chunk is in flight.
 *  Sized to the parent container — a blank A4 sheet. The wrapping
 *  thumbnail / preview already shows a frame, so we deliberately avoid
 *  any spinner / skeleton flicker; the chunk loads fast enough that
 *  most users never see this. */
function TemplateLoading() {
  return <div className="h-full w-full bg-white" aria-hidden />;
}

/** Helper to build a `next/dynamic` component from a lazy import that
 *  returns a NAMED export. Each entry below uses this so the per-file
 *  noise stays minimal. */
function lazyTemplate(
  loader: () => Promise<{ [key: string]: ComponentType<TemplateComponentProps> }>,
  exportName: string,
): ComponentType<TemplateComponentProps> {
  return dynamic(
    () =>
      loader().then((mod) => ({
        default: mod[exportName],
      })),
    {
      ssr: false,
      loading: () => <TemplateLoading />,
    },
  );
}

/**
 * Map of `TemplateId` → lazy-loaded component. The template id arrives
 * from `data.meta.template`; we look it up here and render. Adding a
 * new template = add an entry here + a registry row + the template
 * file. Each entry costs zero bytes on the initial bundle until the
 * runtime requests it.
 */
const TEMPLATES: Record<TemplateId, ComponentType<TemplateComponentProps>> = {
  scratch: lazyTemplate(() => import("./scratch"), "ScratchTemplate"),
  berlin: lazyTemplate(() => import("./berlin"), "BerlinTemplate"),
  helsinki: lazyTemplate(() => import("./helsinki"), "HelsinkiTemplate"),
  tokyo: lazyTemplate(() => import("./tokyo"), "TokyoTemplate"),
  oslo: lazyTemplate(() => import("./oslo"), "OsloTemplate"),
  madrid: lazyTemplate(() => import("./madrid"), "MadridTemplate"),
  reykjavik: lazyTemplate(() => import("./reykjavik"), "ReykjavikTemplate"),
  aurora: lazyTemplate(() => import("./aurora"), "AuroraTemplate"),
  eclipse: lazyTemplate(() => import("./eclipse"), "EclipseTemplate"),
  copenhagen: lazyTemplate(() => import("./copenhagen"), "CopenhagenTemplate"),
  vienna: lazyTemplate(() => import("./vienna"), "ViennaTemplate"),
  manhattan: lazyTemplate(() => import("./manhattan"), "ManhattanTemplate"),
  cambridge: lazyTemplate(() => import("./cambridge"), "CambridgeTemplate"),
  blank: lazyTemplate(() => import("./blank"), "BlankTemplate"),
  // ── Mid-2026 expansion: 30 new templates ──────────────
  helvetica: lazyTemplate(() => import("./helvetica"), "HelveticaTemplate"),
  geist: lazyTemplate(() => import("./geist"), "GeistTemplate"),
  notion: lazyTemplate(() => import("./notion"), "NotionTemplate"),
  linear: lazyTemplate(() => import("./linear"), "LinearTemplate"),
  stripe: lazyTemplate(() => import("./stripe"), "StripeTemplate"),
  obsidian: lazyTemplate(() => import("./obsidian"), "ObsidianTemplate"),
  carbon: lazyTemplate(() => import("./carbon"), "CarbonTemplate"),
  midnight: lazyTemplate(() => import("./midnight"), "MidnightTemplate"),
  onyx: lazyTemplate(() => import("./onyx"), "OnyxTemplate"),
  graphite: lazyTemplate(() => import("./graphite"), "GraphiteTemplate"),
  geneva: lazyTemplate(() => import("./geneva"), "GenevaTemplate"),
  zurich: lazyTemplate(() => import("./zurich"), "ZurichTemplate"),
  frankfurt: lazyTemplate(() => import("./frankfurt"), "FrankfurtTemplate"),
  singapore: lazyTemplate(() => import("./singapore"), "SingaporeTemplate"),
  dubai: lazyTemplate(() => import("./dubai"), "DubaiTemplate"),
  bento: lazyTemplate(() => import("./bento"), "BentoTemplate"),
  mosaic: lazyTemplate(() => import("./mosaic"), "MosaicTemplate"),
  dashboard: lazyTemplate(() => import("./dashboard"), "DashboardTemplate"),
  atlas: lazyTemplate(() => import("./atlas"), "AtlasTemplate"),
  heidelberg: lazyTemplate(() => import("./heidelberg"), "HeidelbergTemplate"),
  boston: lazyTemplate(() => import("./boston"), "BostonTemplate"),
  stanford: lazyTemplate(() => import("./stanford"), "StanfordTemplate"),
  madison: lazyTemplate(() => import("./madison"), "MadisonTemplate"),
  mayfair: lazyTemplate(() => import("./mayfair"), "MayfairTemplate"),
  davos: lazyTemplate(() => import("./davos"), "DavosTemplate"),
  atelier: lazyTemplate(() => import("./atelier"), "AtelierTemplate"),
  studio: lazyTemplate(() => import("./studio"), "StudioTemplate"),
  canvas: lazyTemplate(() => import("./canvas"), "CanvasTemplate"),
  scrubs: lazyTemplate(() => import("./scrubs"), "ScrubsTemplate"),
  founder: lazyTemplate(() => import("./founder"), "FounderTemplate"),
  // ── Visual / executive expansion (late 2026) ──────────────────────
  capitol: lazyTemplate(() => import("./capitol"), "CapitolTemplate"),
  vesterbro: lazyTemplate(() => import("./vesterbro"), "VesterbroTemplate"),
  marina: lazyTemplate(() => import("./marina"), "MarinaTemplate"),
};

interface RendererProps {
  data: ResumeData;
  /** Render at intrinsic page size (true) vs fill parent (false). The editor
   *  preview uses fixedSize=true and scales the wrapper. */
  fixedSize?: boolean;
  /** Skip the toolshelf overlay — gallery thumbnails set this. */
  skipOverlay?: boolean;
}

/** Resolve `data.meta.template` to a renderable component, falling back to
 *  Berlin if the saved id no longer exists in the registry (e.g. after
 *  removing a template). */
export function TemplateRenderer({
  data,
  fixedSize = true,
  skipOverlay = false,
}: RendererProps) {
  const id = data.meta.template as TemplateId;
  const Component = TEMPLATES[id] ?? TEMPLATES.berlin;
  return (
    <Component
      data={data}
      fixedSize={fixedSize}
      skipOverlay={skipOverlay}
    />
  );
}
