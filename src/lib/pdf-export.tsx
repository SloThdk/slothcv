/**
 * Client-side PDF export — true pixel-perfect WYSIWYG via the
 * browser's native print engine.
 *
 * # Why this approach beats html2canvas
 *
 * The previous html2canvas-pro path rasterised the editor's DOM into
 * a PNG using its own canvas-based text rendering. Two intractable
 * problems:
 *   1. **Subpixel font drift.** html2canvas measures glyph widths via
 *      `CanvasRenderingContext2D.measureText()` whose values disagree
 *      with the browser's own layout engine by ~0-2 subpixels per
 *      glyph. Across a wide line of text this accumulates into 1-2 px
 *      of word-position shift. Users experience this as "text moves /
 *      breaks differently in the export than on screen".
 *   2. **Independent CSS support.** html2canvas re-implements parts of
 *      CSS (clip-path, backdrop-filter, mix-blend-mode, modern color
 *      functions) and lags the live browser. Anything it doesn't
 *      support silently produces wrong output.
 *
 * The browser's PRINT engine doesn't have either problem — it's the
 * same code path that renders the editor on screen. If the editor
 * shows the user's CV at intrinsic CSS pixels, the print engine
 * reproduces that exact layout at the chosen page size. There is no
 * separate measurement, no separate CSS support gap.
 *
 * Tradeoff: the user sees the system print dialog, picks "Save as
 * PDF", chooses a destination. One extra interaction vs html2canvas's
 * one-click download — but in exchange they get:
 *   - Pixel-identical output (no drift)
 *   - SELECTABLE TEXT in the resulting PDF (ATS systems can parse it)
 *   - Smaller file size (vector text vs rasterised PNG)
 *   - The user's preferred PDF destination (cloud, local, send-to-app)
 *
 * # How it works
 *
 *   1. Clone the live `[data-pdf-page-content="true"]` div into a
 *      brand-new `<div id="slothcv-print-container">` mounted at
 *      `<body>` root.
 *   2. Inject an inline `<style>` with `@page { size }` set to the
 *      user's chosen page size in millimetres so the printed PDF is
 *      sized correctly.
 *   3. Set `document.title` to the CV's filename — this becomes the
 *      default filename suggestion in the system print dialog.
 *   4. Call `window.print()`. The browser shows its native dialog;
 *      the user picks Save as PDF.
 *   5. Listen for `afterprint` (fires whether the user saved or
 *      cancelled) and clean up: remove the clone, remove the style
 *      tag, restore `document.title`.
 *
 * The @media print rules in `globals.css` handle the rest: hiding
 * every body child except the clone, stripping editor chrome inside
 * the clone (resize handles, hover rings, italic placeholders),
 * and resetting the cloned page-content's transform so glyphs print
 * at intrinsic CSS pixel size.
 */

"use client";

import { useEditorStore } from "@/lib/store/editor";
import { TranslatableError } from "@/lib/translatable-error";
import type { ResumeData } from "@/types/resume";

/** A4 / Letter / Legal sizes in millimetres. Same source-of-truth the
 *  live editor uses (`PAGE_DIMENSIONS_MM` in templates/shared.ts);
 *  duplicated here so the export module stays import-light and can be
 *  lazy-loaded without dragging the templates module in. */
const PAGE_MM: Record<ResumeData["design"]["pageSize"], { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  Letter: { w: 215.9, h: 279.4 },
  Legal: { w: 215.9, h: 355.6 },
};

/** Resolve immediately if `document.fonts` is unavailable (older
 *  browsers / non-browser environments). Otherwise wait for every
 *  registered @font-face rule to finish loading so the printed
 *  document lands in the right typography. The browser's print
 *  engine will use whatever fonts are loaded at print time, so a
 *  partially-loaded font would print in a fallback. */
async function awaitFontsReady(): Promise<void> {
  const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } })
    .fonts;
  if (!fonts || !fonts.ready) return;
  await fonts.ready;
}

/** Wait for every <img> inside a root element to finish loading.
 *  An image still loading at print time prints as a broken-image
 *  rectangle. Per-image safety timeout of 8 s — beyond that we
 *  proceed anyway and accept whatever's there. */
async function awaitImagesLoaded(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => {
          img.removeEventListener("load", done);
          img.removeEventListener("error", done);
          resolve();
        };
        img.addEventListener("load", done);
        img.addEventListener("error", done);
        setTimeout(done, 8000);
      });
    }),
  );
}

/** Wait one animation frame so any newly-applied DOM mutation has
 *  flushed to the next paint. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Generate a PDF of the user's CV via the browser's native print
 * engine. Pops the system print dialog. The user picks "Save as PDF"
 * (or another destination); cleanup runs on `afterprint`.
 *
 * @param data       Full CV — used to read pageSize.
 * @param rawTitle   CV title; sanitised + used as filename suggestion
 *                   in the print dialog.
 */
export async function exportPdf(
  data: ResumeData,
  rawTitle: string,
): Promise<void> {
  const innerEl = document.querySelector<HTMLElement>(
    '[data-pdf-page-content="true"]',
  );
  if (!innerEl) {
    throw new TranslatableError("errors.pdfPageNotFound");
  }

  // Neutralise any in-progress editor interaction so the printed
  // document is the steady-state output, not a half-edited state.
  // Same three cases the previous implementation handled:
  //   1. selected custom element → blue ring + handles
  //   2. inline-editing → dashed outline + caret
  //   3. focused text input → caret/selection rectangle
  const editorStore = useEditorStore.getState();
  if (editorStore.selectedElementId) editorStore.selectElement(null);
  if (editorStore.editingElementId) editorStore.setEditingElementId(null);
  if (
    typeof document !== "undefined" &&
    document.activeElement instanceof HTMLElement
  ) {
    document.activeElement.blur();
  }
  await nextFrame();

  // Capture the original's COMPUTED styles BEFORE we touch the DOM.
  // The clone inherits CSS via document-level stylesheets, but
  // any class-based font-family / font-size / line-height set on
  // ANCESTORS of the original (e.g. the editor's two-pane wrapper)
  // doesn't propagate to the clone when we move it to body root —
  // its new parent is `<body>` which has different inheritance.
  // Reading computed styles here and stamping them inline on the
  // clone forces the clone to render in the exact same typography
  // the user saw on screen, regardless of where it lives in the
  // DOM tree.
  const innerComputed = window.getComputedStyle(innerEl);
  const inheritedFont = {
    fontFamily: innerComputed.fontFamily,
    fontSize: innerComputed.fontSize,
    fontWeight: innerComputed.fontWeight,
    lineHeight: innerComputed.lineHeight,
    letterSpacing: innerComputed.letterSpacing,
    color: innerComputed.color,
  };
  // Page-size mm constants are needed BEFORE we pin the clone width
  // (we want clone.style.width in mm so the browser does one
  // consistent mm -> device-units conversion across @page and the
  // content box — see below). Hoisted from its later position so
  // it's defined when we set clone.style.width.
  const mm = PAGE_MM[data.design.pageSize] ?? PAGE_MM.A4;

  // Clone the page-content into a NEW top-level container at body
  // root. Cloning rather than re-parenting keeps the live editor
  // intact — React's bindings on the original element survive
  // unchanged, and the print clone is an inert snapshot we can
  // freely delete after printing.
  const clone = innerEl.cloneNode(true) as HTMLElement;
  // Reset the clone's transform inline so the print-mode CSS rule
  // doesn't have to fight specificity against the editor's inline
  // style. The CSS in globals.css sets transform: none too, but
  // setting it inline as well is belt-and-braces — guarantees that
  // even if the !important specificity loses to some future
  // template inline style, the clone still prints unscaled.
  clone.style.transform = "none";
  clone.style.transformOrigin = "top left";
  // Pin the clone width in mm — identical to the @page width below.
  //
  // The earlier approach used `${innerEl.offsetWidth}px` which is
  // INTEGER-rounded by the browser (A4: editor renders at the float
  // `mmToPx(210) = 793.7008px`, but offsetWidth returns 794). The
  // clone was then 0.3px wider than the @page (`210mm = 793.7008px`)
  // and the browser had to either scale-to-fit (0.04% horizontal
  // shrink — broke pixel-perfect 1:1 alignment between editor and
  // PDF) or surface a phantom horizontal scrollbar in print preview.
  //
  // Setting the width in mm directly means the browser does ONE
  // conversion (mm -> device units) and both the clone and the @page
  // resolve to the exact same physical width. Shapes positioned at
  // CSS px inside the clone then map to the same mm position the
  // editor renders at, modulo zero subpixel drift.
  //
  // The CSS-spec 96 DPI ratio means the column-wrap engine still
  // measures glyphs against the same intrinsic mm width the user
  // authored in the editor — line-break decisions are identical.
  clone.style.width = `${mm.w}mm`;
  // Apply the original's computed font properties to the clone so
  // descendant text inherits IDENTICAL metrics to what was rendered
  // on screen. Each descendant element keeps its own class-based
  // overrides (template headers etc.) — these inline values just
  // set the inheritance starting point.
  clone.style.fontFamily = inheritedFont.fontFamily;
  clone.style.fontSize = inheritedFont.fontSize;
  clone.style.fontWeight = inheritedFont.fontWeight;
  clone.style.lineHeight = inheritedFont.lineHeight;
  clone.style.letterSpacing = inheritedFont.letterSpacing;
  clone.style.color = inheritedFont.color;

  const printContainer = document.createElement("div");
  printContainer.id = "slothcv-print-container";
  // Mirror the same computed font on the container so the clone's
  // body context inherits matching values. Belt-and-braces.
  printContainer.style.fontFamily = inheritedFont.fontFamily;
  printContainer.style.fontSize = inheritedFont.fontSize;
  printContainer.style.lineHeight = inheritedFont.lineHeight;
  printContainer.appendChild(clone);
  document.body.appendChild(printContainer);

  // Inject the @page size rule. We can't put this in globals.css
  // because the user's page size is dynamic — A4 / Letter / Legal /
  // future custom — and @page doesn't accept CSS custom properties.
  // The style tag is removed in the afterprint cleanup so the
  // editor's screen render isn't permanently affected (none of the
  // rules below have `@media screen` so they wouldn't paint
  // anyway, but keeping the head clean is good hygiene).
  //
  // The HEIGHT is patched again below once we've measured the
  // clone's natural content extent — the initial value is a
  // placeholder so the style tag exists in the DOM at the right
  // place in the cascade. (`mm` is hoisted above the clone-creation
  // block since clone.style.width also needs it.)
  const styleEl = document.createElement("style");
  styleEl.id = "slothcv-print-style";
  styleEl.textContent = `
    @page {
      size: ${mm.w}mm ${mm.h}mm;
      margin: 0;
    }
  `;
  document.head.appendChild(styleEl);

  // Set the document title to the desired filename — print dialogs
  // pre-fill this as the default filename suggestion. Without this
  // the user gets "<host> - <route>.pdf" which is rarely what they
  // want. Restored in the afterprint cleanup so the editor's tab
  // title comes back.
  const oldTitle = document.title;
  document.title = safeFilename(rawTitle);

  // Cleanup runs on afterprint — fires whether the user clicked
  // Save or Cancel. Self-removes the listener so a subsequent
  // Export creates a fresh closure with its own clone references.
  const cleanup = () => {
    try {
      printContainer.remove();
      styleEl.remove();
      document.title = oldTitle;
    } finally {
      window.removeEventListener("afterprint", cleanup);
    }
  };
  window.addEventListener("afterprint", cleanup);

  // Wait for fonts + every image inside the cloned page-content
  // before triggering print. The cloned <img> nodes share the
  // browser's image cache with the originals, but a cold-cached
  // image (first time the user loaded the avatar) might still be
  // in-flight. The 8 s per-image safety in `awaitImagesLoaded`
  // means a slow CDN won't hang the export indefinitely.
  await awaitFontsReady();
  await awaitImagesLoaded(printContainer);
  // Two RAFs for layout to settle after the clone mounts and the
  // afore styles + image-loads cascade.
  await nextFrame();
  await nextFrame();

  // Trim the @page height to the clone's actual content extent so
  // a short CV doesn't print onto a full A4 sheet with half the
  // page blank.
  //
  // # Why this is more involved than `height: auto`
  //
  // Two layers pin the printed sheet to full A4 height:
  //   1. The page-content div in preview.tsx sets `height:
  //      mmToPx(dims.h)` so the editor preview always shows a
  //      recognisable A4 rectangle.
  //   2. TemplateFrame's outer wrapper (frame.tsx, `fixedSize=true`
  //      path) sets `style.minHeight = mmToPx(dims.h) + "px"` —
  //      this is what every premade template is mounted inside.
  //
  // Only zero-ing (1) is not enough. The clone's
  // `getBoundingClientRect().height` still measures ≥ A4 because
  // TemplateFrame's `min-height` inline style props it up. So we
  // walk every descendant of the clone, zero any inline pixel
  // min-height at or above the full-page threshold (see Phase 1
  // below — calibrated so legitimate template-design min-heights
  // like marina's 180/420 are NOT touched), record them, then
  // measure. After measurement we expand those same elements back
  // to `maxBottomPx` — that's load-bearing for absolute-positioned
  // descendants like the custom-elements layer and corner
  // watermark, which size to TemplateFrame's box. If we leave
  // TemplateFrame collapsed to flow content while a user placed a
  // custom shape at y = 900px, the custom would be visually
  // clipped by TemplateFrame's `overflow: hidden`.
  //
  // # What counts as "content"
  //
  // `clone.getBoundingClientRect().height` after the collapse =
  // natural flow content (top padding + flowing children + bottom
  // padding from `marginMm`). Absolute-positioned descendants
  // (user-placed customs, watermark) don't add to the parent's
  // intrinsic height, so we sweep them separately and take the max
  // bottom edge. The blank/scratch template has zero flow content
  // and only customs — same code path handles it: maxBottomPx =
  // lowest custom's bottom edge.
  clone.style.height = "auto";
  clone.style.minHeight = "0";

  // Phase 1: collapse the forced template wrapper min-height so
  // measurement reflects natural content. Track what we touched
  // so we can restore those exact elements after measurement.
  //
  // Threshold = 1000 px. This is calibrated to ONLY catch
  // TemplateFrame's full-page `mmToPx(dims.h)` inline minHeight
  // (A4 ≈ 1122 px, Letter ≈ 1056 px, Legal ≈ 1344 px — all > 1000)
  // while leaving template-design min-heights untouched
  // (e.g. marina header band `minHeight: 180`, marina body grid
  // `minHeight: 420` — both legitimate visual constraints set by
  // template authors to maintain proportion when content is
  // sparse). Zeroing those would distort the template's look in
  // the export.
  const PAGE_MIN_HEIGHT_THRESHOLD_PX = 1000;
  const collapsedEls: HTMLElement[] = [];
  clone.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const mh = el.style.minHeight;
    if (!mh || !mh.endsWith("px")) return;
    const v = parseFloat(mh);
    if (!Number.isFinite(v) || v < PAGE_MIN_HEIGHT_THRESHOLD_PX) return;
    el.style.minHeight = "0";
    collapsedEls.push(el);
  });

  await nextFrame();

  // Phase 2: measure natural content height + any absolute custom
  // positions.
  const cloneRect = clone.getBoundingClientRect();
  let maxBottomPx = cloneRect.height;
  const absoluteSelector =
    '[data-element-id^="custom."], [data-element-id="design.watermark"]';
  const absoluteEls = clone.querySelectorAll<HTMLElement>(absoluteSelector);
  absoluteEls.forEach((el) => {
    const r = el.getBoundingClientRect();
    const bottomRelativeToClone = r.bottom - cloneRect.top;
    if (bottomRelativeToClone > maxBottomPx) {
      maxBottomPx = bottomRelativeToClone;
    }
  });

  // px → mm at the CSS-spec 96 DPI used throughout slothcv
  // (matches `mmToPx` in templates/shared.ts; inversing the same
  // ratio keeps round-trip exact). `Math.ceil` so we never crop a
  // fractional glyph row at the page edge.
  const contentHeightMm = Math.ceil((maxBottomPx / 96) * 25.4);

  // Page-shape floor: clamp trimmed height so the printed page
  // never reads as a wide rectangle / landscape banner. Without
  // this, a sparse CV (e.g. partly-filled template defaults at
  // ~180mm of content) trims A4 to 210x180 — wider than tall —
  // and the result no longer looks like a CV. 85% of the natural
  // page height empirically keeps a portrait shape (A4 floors at
  // ~252mm, ratio 1:1.20) while still allowing a meaningful trim
  // when content nearly fills the page (a 280mm CV still trims
  // to 280mm, removing the 17mm blank bottom).
  const PORTRAIT_FLOOR_RATIO = 0.85;
  const portraitFloorMm = Math.round(mm.h * PORTRAIT_FLOOR_RATIO);

  // Multi-page split logic: if content fits inside ONE standard
  // page, trim @page to content (subject to the portrait floor
  // above). Otherwise keep standard page size so the browser
  // paginates naturally — handing a single "very tall page" to
  // the print engine produces a single huge PDF page that won't
  // fit on real paper or scale well in PDF readers, so multi-page
  // CVs keep A4/Letter/Legal. (Last-page-partial trim is harder
  // — separate follow-up.)
  const finalPageHeightMm =
    contentHeightMm > 0 && contentHeightMm < mm.h
      ? Math.max(contentHeightMm, portraitFloorMm)
      : mm.h;

  styleEl.textContent = `
    @page {
      size: ${mm.w}mm ${finalPageHeightMm}mm;
      margin: 0;
    }
  `;

  // Phase 3: re-expand the elements we collapsed to the FINAL page
  // height — which may be larger than `maxBottomPx` when the portrait
  // floor clamps a sparse CV. Two reasons to use the page height,
  // not the content extent:
  //   1. TemplateFrame paints `design.pageBg` on its own box. If we
  //      restore only to content extent, the area between content
  //      and page bottom shows whatever's underneath — body bg in
  //      print, which is `var(--color-bg)` and goes dark when the
  //      editor is in dark mode. Visible as a black footer band on
  //      every trimmed-with-floor export. Restoring to page height
  //      makes TemplateFrame paint the user's chosen pageBg across
  //      the full sheet, no matter what theme the editor is in.
  //   2. Absolute-positioned descendants (watermark in bottom-X
  //      corner, atlas's continent backdrop, etc.) lay out against
  //      the box dimensions. The watermark in bottom-right should
  //      sit at the visible bottom of the printed page, not at the
  //      bottom of the flow content. Restoring to page height puts
  //      it where the user expects.
  // Two unit-paths depending on single-page vs multi-page:
  //
  //   Single-page (content fits inside one printed sheet, including
  //   the portrait-floor case where the floor exceeds content):
  //     Use mm directly. The browser converts `${finalPageHeightMm}mm`
  //     via the same 96 DPI ratio it applies to `@page { size: ... }`,
  //     so TemplateFrame's min-height resolves to EXACTLY the printed
  //     page height. Setting in px instead means `Math.ceil` rounds
  //     up sub-pixel — finalPageHeightPx for 252mm is 952.44, ceil is
  //     953 — and TemplateFrame ends up 0.56px taller than the @page,
  //     which can trigger a phantom second page in some print engines.
  //     mm units side-step the rounding entirely.
  //
  //   Multi-page (`maxBottomPx > one printed page`): TemplateFrame
  //   MUST exceed the page so the browser paginates content naturally
  //   across multiple sheets. Use px (`ceil(maxBottomPx)`) so the
  //   restored height matches the content's actual extent in the
  //   coordinate space shapes are positioned in. (Last-page-partial
  //   trim is a separate scope.)
  //
  // Same 96-DPI ratio as `mmToPx` in templates/shared.ts.
  const finalPageHeightPx = (finalPageHeightMm / 25.4) * 96;
  const restoredHeight =
    maxBottomPx > finalPageHeightPx
      ? `${Math.ceil(maxBottomPx)}px`
      : `${finalPageHeightMm}mm`;
  collapsedEls.forEach((el) => {
    el.style.minHeight = restoredHeight;
  });

  // One more frame so the @page change + min-height restore
  // settle before print().
  await nextFrame();

  // Pop the print dialog. window.print() blocks the JS thread
  // until the dialog is dismissed (or, in some browsers, returns
  // immediately and the dialog is non-modal — in that case
  // afterprint still fires once the user is done).
  window.print();

  // Defensive: some browsers don't fire afterprint reliably. If
  // the cleanup hasn't run within 60 s, force it. (Cleanup is
  // idempotent — listener self-removes on first run; if it ran
  // already, this no-op-removes everything and the second call
  // exits the try-finally cleanly.)
  setTimeout(() => {
    if (document.getElementById("slothcv-print-container")) {
      cleanup();
    }
  }, 60000);
}

/** Strip filesystem-unfriendly characters from a user-supplied
 *  title. Falls back to "resume" for empty / fully-stripped strings
 *  so the print dialog always has a sensible filename suggestion. */
function safeFilename(s: string): string {
  return (
    (s || "resume")
      .replace(/[^a-z0-9-_ ]+/gi, "_")
      .replace(/\s+/g, "_")
      .slice(0, 60) || "resume"
  );
}
