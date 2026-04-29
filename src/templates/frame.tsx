/**
 * TemplateFrame — the shared "page sheet" that every DOM template uses.
 *
 * Handles the boring stuff:
 *   - A4/Letter/Legal sheet sizing
 *   - Page background + body color + base font
 *   - Page margin
 *
 * Templates pass a `children` callback that receives the resolved design and
 * resume data so it can lay out the body however it wants.
 */

"use client";

import type { ReactNode } from "react";
import { useEditorStore } from "@/lib/store/editor";
import {
  PAGE_DIMENSIONS_MM,
  basePx,
  elementStyle,
  letterSpacingEm,
  marginMm,
  mmToPx,
} from "./shared";
import type { GlobalDesign, ResumeData } from "@/types/resume";
import { CustomElementsLayer } from "./custom-elements-layer";
import { EditableSectionTitle } from "./components";

interface FrameProps {
  data: ResumeData;
  children: ReactNode;
  /**
   * If true, render at intrinsic mm-derived px. If false, fill 100% of the
   * parent (used for the responsive editor preview which scales separately).
   */
  fixedSize?: boolean;
  /**
   * When true, skip rendering the toolshelf overlay (CustomElementsLayer).
   * Used by `<TemplatePreview>` thumbnails on the gallery — those mount
   * outside the editor store and shouldn't subscribe to it.
   */
  skipOverlay?: boolean;
}

export function TemplateFrame({
  data,
  children,
  fixedSize = false,
  skipOverlay = false,
}: FrameProps) {
  const { design } = data;
  const dims = PAGE_DIMENSIONS_MM[design.pageSize];
  const mm = marginMm(design);

  // Inject `--cv-title-font` and `--cv-body-font` CSS variables on the
  // page wrapper so templates that hardcode their identity fonts (e.g.
  // Madison's Lora, Eclipse's Fraunces) can opt-in to the user's
  // typography preset by reading from these vars instead of going
  // straight to `var(--font-lora)`. Templates that haven't been
  // migrated still render their original hardcoded font; templates
  // that opt-in (using `var(--cv-title-font, fallback)`) follow the
  // user's Design → Typography choice.
  const style: React.CSSProperties & Record<string, string | number> = {
    background: design.pageBg,
    color: design.textColor,
    fontFamily: `var(--font-${slugFont(design.bodyFont)}, ${design.bodyFont}), system-ui, sans-serif`,
    fontSize: `${basePx(design)}px`,
    lineHeight: design.lineSpacing,
    letterSpacing: `${letterSpacingEm(design)}em`,
    padding: `${mmToPx(mm)}px`,
    boxSizing: "border-box",
    "--cv-title-font": `var(--font-${slugFont(design.titleFont)}, ${design.titleFont}), system-ui, sans-serif`,
    "--cv-body-font": `var(--font-${slugFont(design.bodyFont)}, ${design.bodyFont}), system-ui, sans-serif`,
  };

  if (fixedSize) {
    style.width = `${mmToPx(dims.w)}px`;
    style.minHeight = `${mmToPx(dims.h)}px`;
  } else {
    style.width = "100%";
    style.minHeight = "100%";
  }

  return (
    <div className="relative overflow-hidden break-words" style={style}>
      {children}
      <Watermark design={design} data={data} />
      {!skipOverlay && <ToolshelfOverlay data={data} />}
    </div>
  );
}

/** Thin wrapper around CustomElementsLayer that pulls `selectedElementId`
 *  from the store so the renderer doesn't have to care about the source.
 *  Kept as a separate component so TemplatePreview (which mounts outside
 *  the editor) can avoid the store dependency via `skipOverlay`. */
function ToolshelfOverlay({ data }: { data: ResumeData }) {
  const selectedId = useEditorStore((s) => s.selectedElementId);
  return <CustomElementsLayer data={data} selectedId={selectedId} />;
}

/**
 * Watermark — oversized branding text positioned absolutely in one of the
 * four corners. Rendered LAST so it sits on top of the page background but
 * stays under the content visually due to low opacity.
 *
 * Draggable + inline-editable in the visual editor. Carries the canonical
 * `design.watermark` element-id so users can free-drag the corner letters
 * (e.g. "CV") wherever they want and double-click to inline-edit the text.
 * `elementStyle` applies the saved offset so positions survive reload.
 *
 * Hidden when `watermarkPosition === "off"` or `watermarkText` is empty.
 */
function Watermark({ design, data }: { design: GlobalDesign; data: ResumeData }) {
  const text = (design.watermarkText ?? "").trim();
  const pos = design.watermarkPosition ?? "off";
  if (!text || pos === "off") return null;
  const color =
    (design.watermarkColor ?? "").trim() || design.accentColor;
  const cornerClass =
    pos === "bottom-left"
      ? "left-3 bottom-3"
      : pos === "bottom-right"
        ? "right-3 bottom-3"
        : pos === "top-left"
          ? "left-3 top-3"
          : "right-3 top-3";
  const id = "design.watermark";
  return (
    <div
      data-element-id={id}
      // Hover-ring uses the watermark's own colour at 35 % so it stays
      // visible on every page background (dark Aurora / Onyx / Midnight
      // get a tinted ring; light Helsinki / Berlin get the accent).
      // `--tw-ring-color` is the underlying CSS variable Tailwind v4
      // resolves for `ring-*` utilities; setting it inline lets the
      // ring colour adapt per template without static class lookups.
      className={`absolute ${cornerClass} cursor-text select-none rounded-sm transition-shadow hover:ring-2 hover:ring-offset-2 hover:ring-offset-transparent`}
      style={{
        color,
        fontWeight: 800,
        fontSize: "5.5em",
        lineHeight: 1,
        letterSpacing: "0.04em",
        opacity: 0.85,
        ["--tw-ring-color" as string]: `${color}59`,
        ...elementStyle(data, id),
      }}
    >
      {text}
    </div>
  );
}

/**
 * Convert a font display name to its CSS variable suffix. Mirrors the slugs
 * defined in `src/lib/fonts.ts`. Falls back to body sans-serif.
 */
function slugFont(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** Header-decoration helper used by many templates.
 *
 *  When `sectionId` and `data` are provided (the common case from inside
 *  a template that knows which section it's rendering), the heading text
 *  is wrapped in `<EditableSectionTitle>` so users can double-click the
 *  rendered "EXPERIENCE" / "Skills" etc. and inline-edit the underlying
 *  raw `section.title` string. The visible transformation
 *  (uppercase/titlecase/box/etc.) stays as designed — the lens reads
 *  and writes the raw value, the template still renders the styled
 *  output. Both props are optional so legacy callers that just want a
 *  decorated heading without the inline-edit hook still work. */
export function SectionHeader({
  text,
  design,
  withDivider = true,
  sectionId,
  data,
}: {
  text: string;
  design: GlobalDesign;
  withDivider?: boolean;
  sectionId?: string;
  data?: ResumeData;
}) {
  const transformed =
    design.headerStyle === "uppercase"
      ? text.toUpperCase()
      : design.headerStyle === "titlecase"
        ? text.replace(
            /\w\S*/g,
            (w) => w[0].toUpperCase() + w.slice(1).toLowerCase(),
          )
        : text;

  // The rendered text — wrapped with EditableSectionTitle when we have
  // the section identity to write back to. Inline-edit lens reads and
  // writes the RAW `section.title` string (not the transformed display),
  // so toggling between uppercase / titlecase / etc. stays a design
  // setting and never mangles the user's raw label.
  const editableTextNode =
    sectionId && data ? (
      <EditableSectionTitle sid={sectionId} data={data}>
        {transformed}
      </EditableSectionTitle>
    ) : (
      transformed
    );

  let inner: React.ReactNode = editableTextNode;

  if (design.headerStyle === "box") {
    inner = (
      <span
        className="inline-block rounded px-2 py-0.5 text-[0.95em]"
        style={{
          background: `${design.accentColor}1a`,
          color: design.accentColor,
        }}
      >
        {editableTextNode}
      </span>
    );
  } else if (design.headerStyle === "accent-block") {
    inner = (
      <span className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-1 rounded"
          style={{ background: design.accentColor }}
        />
        <span style={{ color: design.accentColor }}>{editableTextNode}</span>
      </span>
    );
  } else if (design.headerStyle === "underline") {
    inner = (
      <span
        className="inline-block border-b-2 pb-0.5"
        style={{ borderColor: design.accentColor, color: design.accentColor }}
      >
        {editableTextNode}
      </span>
    );
  } else {
    inner = (
      <span style={{ color: design.accentColor }}>{editableTextNode}</span>
    );
  }

  return (
    <div className="mb-2">
      <h2 className="text-[1.1em] font-semibold tracking-wider">{inner}</h2>
      {withDivider && <Divider design={design} />}
    </div>
  );
}

/** Renders the configured divider style under section headers. */
export function Divider({ design }: { design: GlobalDesign }) {
  if (design.dividerStyle === "none") return null;
  if (design.dividerStyle === "accent-bar") {
    return (
      <div
        className="mt-1 h-0.5 w-8 rounded-full"
        style={{ background: design.accentColor }}
      />
    );
  }
  return (
    <div
      className="mt-1 h-px w-full"
      style={{
        background:
          design.dividerStyle === "dashed"
            ? `repeating-linear-gradient(90deg, ${design.accentColor}55 0 4px, transparent 4px 8px)`
            : design.dividerStyle === "dotted"
              ? `repeating-linear-gradient(90deg, ${design.accentColor}55 0 1.5px, transparent 1.5px 4px)`
              : `${design.accentColor}55`,
      }}
    />
  );
}
