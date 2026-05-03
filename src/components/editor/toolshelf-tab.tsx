/**
 * ToolshelfTab — the editor's "Add" panel. Two modes:
 *
 *   1. **Shelf** (no selection): vertical list of "Add X" buttons —
 *      Rectangle, Ellipse, Line, Text, Image. One click drops a default
 *      element on the canvas at (80, 80) and selects it.
 *
 *   2. **Inspector** (selection set): controls for the currently-selected
 *      custom element — position (x/y, sliders), size (w/h), color/fill,
 *      text content, font size/weight, layer up/down, hide, delete.
 *
 * Both modes coexist in this single tab so the user never has to hunt
 * across panels: select an element → controls appear; click empty paper
 * → shelf returns. Same UX as Canva's left rail.
 *
 * Sliders mirror live drag via `slothcv:custom-drag-tick` events
 * (dispatched from preview.tsx) — the inspector listens, writes input.value
 * directly via refs, no React rerender during drag.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Box,
  Circle,
  Diamond,
  Eye,
  EyeOff,
  Heart,
  Hexagon,
  Image as ImageIcon,
  Link2,
  Minus,
  Octagon,
  Plus as PlusIcon,
  RotateCcw,
  Sparkles,
  Star,
  Trash2,
  Triangle,
  Type,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useEditorStore } from "@/lib/store/editor";
import { uploadCustomElementImage } from "@/lib/profile";
import { translateError } from "@/lib/translatable-error";
import {
  SOCIAL_ICONS,
  SOCIAL_ICONS_BY_NAME,
  isSocialIconName,
  type SocialIconName,
} from "@/lib/social-icons";
import { Button } from "@/components/ui/button";
import { ColorPickerPopover } from "@/components/ui/color-picker-popover";
import { useConfirm } from "@/components/ui/confirm-modal";
import { Label } from "@/components/ui/label";
import { UrlInput } from "@/components/ui/url-input";
import type {
  CustomElement,
  CustomElementKind,
  EllipseElement,
  IconElement,
  ImageElement,
  LineElement,
  RectElement,
  TextElement,
} from "@/types/resume";

export function ToolshelfTab() {
  const selectedElementId = useEditorStore((s) => s.selectedElementId);
  const data = useEditorStore((s) => s.data);
  const selected =
    selectedElementId
      ? (data.customElements ?? []).find((e) => e.id === selectedElementId)
      : null;

  return (
    <div className="space-y-3">
      {selected ? (
        // key on the inspector forces a fresh mount whenever the user
        // selects a different element. The slider inputs are uncontrolled
        // (defaultValue) for live drag-syncing performance — without the
        // key, switching selection would NOT reset the slider DOM values
        // and the user would see the previous element's settings.
        <Inspector key={selected.id} element={selected} />
      ) : (
        <Shelf />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shelf — primitive cards that drop new shapes on the canvas
// ---------------------------------------------------------------------------

const SHELF_ITEMS: {
  kind: CustomElementKind;
  label: string;
  hint: string;
  /** Lucide icon used as a small "logo" badge in the corner of the card. */
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { kind: "text", label: "Text", hint: "Headline, paragraph, label", Icon: Type },
  { kind: "rect", label: "Rectangle", hint: "Block, divider band", Icon: Box },
  { kind: "ellipse", label: "Ellipse", hint: "Circle, accent dot", Icon: Circle },
  { kind: "line", label: "Line", hint: "Divider, rule", Icon: Minus },
  { kind: "triangle", label: "Triangle", hint: "Geometric accent", Icon: Triangle },
  { kind: "star", label: "Star", hint: "Highlight, rating", Icon: Star },
  { kind: "hexagon", label: "Hexagon", hint: "Tile, badge", Icon: Hexagon },
  { kind: "octagon", label: "Octagon", hint: "Stop, badge", Icon: Octagon },
  { kind: "diamond", label: "Diamond", hint: "Accent, gemstone", Icon: Diamond },
  { kind: "heart", label: "Heart", hint: "Like, passion", Icon: Heart },
  { kind: "cross", label: "Cross", hint: "Plus, medical", Icon: PlusIcon },
  { kind: "sparkle", label: "Sparkle", hint: "Glitter, highlight", Icon: Sparkles },
  { kind: "arrow", label: "Arrow", hint: "Pointer, callout", Icon: ArrowRight },
  { kind: "image", label: "Image", hint: "Photo, logo, screenshot", Icon: ImageIcon },
];

/** Mini render of the SHAPE THE CARD WILL SPAWN. Reads the same default
 *  styling as `defaultCustomElement()` so the user sees a 1:1 preview of
 *  what they'll drop on the canvas. Constrained to ~48×40 so the cards
 *  stay compact in the sidebar. SVG-based shapes use the same paths as
 *  the actual render, so what users see IS what they get. */
function ShapePreview({ kind }: { kind: CustomElementKind }) {
  switch (kind) {
    case "rect":
      return <div className="h-7 w-12 rounded-md" style={{ background: "#2563eb" }} />;
    case "ellipse":
      return <div className="h-9 w-9 rounded-full" style={{ background: "#2563eb" }} />;
    case "line":
      return (
        <div className="grid h-9 w-12 place-items-center">
          <div className="h-0.5 w-full rounded" style={{ background: "#0f172a" }} />
        </div>
      );
    case "triangle":
      return (
        <svg viewBox="0 0 100 100" className="h-9 w-9">
          <path d="M 50 0 L 100 100 L 0 100 Z" fill="#2563eb" />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 100 100" className="h-9 w-9">
          <path
            d="M 50 2 L 60.567 36.180 L 95.106 36.180 L 67.270 56.180 L 77.836 90.361 L 50 70.361 L 22.164 90.361 L 32.730 56.180 L 4.894 36.180 L 39.433 36.180 Z"
            fill="#f59e0b"
          />
        </svg>
      );
    case "hexagon":
      return (
        <svg viewBox="0 0 100 100" className="h-9 w-9">
          <path
            d="M 50 2 L 91.569 26 L 91.569 74 L 50 98 L 8.431 74 L 8.431 26 Z"
            fill="#10b981"
          />
        </svg>
      );
    case "arrow":
      return (
        <svg viewBox="0 0 200 100" className="h-7 w-12">
          <path
            d="M 0 35 L 130 35 L 130 10 L 200 50 L 130 90 L 130 65 L 0 65 Z"
            fill="#0f172a"
          />
        </svg>
      );
    case "heart":
      return (
        <svg viewBox="0 0 100 95" className="h-9 w-9">
          <path
            d="M 50 15 C 30 -5, -5 5, 5 35 C 12 60, 30 75, 50 92 C 70 75, 88 60, 95 35 C 105 5, 70 -5, 50 15 Z"
            fill="#ef4444"
          />
        </svg>
      );
    case "diamond":
      return (
        <svg viewBox="0 0 100 100" className="h-9 w-9">
          <path d="M 50 0 L 100 50 L 50 100 L 0 50 Z" fill="#0ea5e9" />
        </svg>
      );
    case "octagon":
      return (
        <svg viewBox="0 0 100 100" className="h-9 w-9">
          <path
            d="M 30 0 L 70 0 L 100 30 L 100 70 L 70 100 L 30 100 L 0 70 L 0 30 Z"
            fill="#6366f1"
          />
        </svg>
      );
    case "cross":
      return (
        <svg viewBox="0 0 100 100" className="h-9 w-9">
          <path
            d="M 35 0 L 65 0 L 65 35 L 100 35 L 100 65 L 65 65 L 65 100 L 35 100 L 35 65 L 0 65 L 0 35 L 35 35 Z"
            fill="#dc2626"
          />
        </svg>
      );
    case "sparkle":
      return (
        <svg viewBox="0 0 100 100" className="h-9 w-9">
          <path
            d="M 50 0 L 56 44 L 100 50 L 56 56 L 50 100 L 44 56 L 0 50 L 44 44 Z"
            fill="#f59e0b"
          />
        </svg>
      );
    case "text":
      return (
        <div className="grid h-9 w-12 place-items-center">
          <span
            className="text-2xl leading-none font-semibold"
            style={{ color: "#0f172a", fontFamily: "var(--font-inter)" }}
          >
            T
          </span>
        </div>
      );
    case "image":
      return (
        <div
          className="grid h-7 w-12 place-items-center overflow-hidden rounded-md ring-1 ring-border"
          style={{
            background:
              "linear-gradient(135deg, #93c5fd 0%, #f9a8d4 50%, #fcd34d 100%)",
          }}
        >
          <ImageIcon className="h-3.5 w-3.5 text-white drop-shadow" />
        </div>
      );
    case "icon":
      // Defensive: ShapePreview is only called from SHELF_ITEMS (which
      // doesn't include "icon" — social icons live in their own palette
      // with `<SocialIconPreview>`), so this branch is unreachable in
      // practice. Kept for exhaustiveness so a future refactor that
      // routes "icon" through SHELF_ITEMS doesn't render a blank thumb.
      return <SocialIconPreview name="linkedin" />;
  }
}

/** Mini SVG-glyph preview rendered inside each social-icon shelf card.
 *  Reads from the same registry the live canvas uses, so what users
 *  see in the shelf is exactly what drops onto the page. Sized to
 *  match the geometric ShapePreview thumbnails (~36 px) so the two
 *  shelf sections share visual rhythm. */
function SocialIconPreview({ name }: { name: SocialIconName }) {
  const def = SOCIAL_ICONS_BY_NAME[name];
  return (
    <svg
      viewBox={def.viewBox}
      className="h-9 w-9"
      role="img"
      aria-label={def.label}
    >
      <path d={def.path} fill={def.defaultColor} />
    </svg>
  );
}

function Shelf() {
  const addCustomElement = useEditorStore((s) => s.addCustomElement);
  const data = useEditorStore((s) => s.data);
  const removeCustomElement = useEditorStore((s) => s.removeCustomElement);
  const selectElement = useEditorStore((s) => s.selectElement);
  const updateCustomElement = useEditorStore((s) => s.updateCustomElement);
  const { t } = useLanguage();

  const elements = data.customElements ?? [];

  /** Drop a brand-glyph icon onto the canvas with the network's brand
   *  color pre-applied. Single store mutation = single undo entry —
   *  the toolshelf "click LinkedIn" gesture is one logical action,
   *  not "create generic icon" + "set iconName" + "set color". */
  function addSocialIcon(name: SocialIconName) {
    const def = SOCIAL_ICONS_BY_NAME[name];
    addCustomElement("icon", undefined, {
      iconName: name,
      color: def.defaultColor,
    } as Partial<IconElement>);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {t("toolshelf.addToCanvas")}
        </p>
        <p className="mt-0.5 text-[11px] text-subtle">
          {t("toolshelf.addToCanvasHint")}
        </p>
      </div>

      {/* 2-column shape gallery — every card shows a true mini-render of
          the shape it spawns plus its name and a small lucide "logo"
          icon in the corner. HTML5 draggable lets the user drop it
          anywhere on the preview canvas; the canvas listens for
          `application/x-slothcv-element` and converts the screen-space
          drop coordinates into page-relative coords (account for zoom,
          subtract the page origin). */}
      <div className="grid grid-cols-2 gap-2">
        {SHELF_ITEMS.map((it) => {
          const Icon = it.Icon;
          return (
            <button
              key={it.kind}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "copy";
                // Custom MIME type so other drop targets ignore it; the
                // string payload is just the kind discriminator.
                e.dataTransfer.setData(
                  "application/x-slothcv-element",
                  it.kind,
                );
                e.dataTransfer.setData("text/plain", `slothcv:${it.kind}`);
              }}
              onClick={() => addCustomElement(it.kind)}
              onDoubleClick={() => addCustomElement(it.kind)}
              title={`Drag to canvas, double-click, or click to add a ${it.label.toLowerCase()}`}
              className="group relative flex aspect-[4/3] cursor-grab flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-surface p-2 transition-[background-color,box-shadow,transform] hover:-translate-y-px hover:border-strong hover:bg-surface-hover hover:shadow-md active:cursor-grabbing"
            >
              {/* Corner logo badge — small lucide icon so users can scan
                  the rail by glyph as well as by shape preview. */}
              <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded bg-surface-hover text-subtle group-hover:bg-fg group-hover:text-bg">
                <Icon className="h-3 w-3" />
              </span>
              <span className="grid flex-1 place-items-center">
                <ShapePreview kind={it.kind} />
              </span>
              <span className="text-[12px] font-semibold text-fg">
                {it.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Social Icons palette — separate from the geometric shapes
          above so the user reads "shapes" vs "brand glyphs" as
          distinct affordances. Each card stamps a pre-coloured
          IconElement with the network's brand hex; the inspector's
          color picker lets the user retune to match their CV palette
          afterwards. The cards are intentionally tighter (3-col grid
          instead of 2) because brand glyphs are visually denser than
          named shapes — 13 icons fit four rows of three plus one. */}
      <div className="mt-4 border-t border-border pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {t("toolshelf.socialIcons")}
        </p>
        <p className="mt-0.5 text-[11px] text-subtle">
          {t("toolshelf.socialIconsHint")}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {SOCIAL_ICONS.map((it) => (
            <button
              key={it.name}
              type="button"
              draggable
              onDragStart={(e) => {
                // Same MIME type as geometric shapes so the canvas drop
                // handler routes through one code path. The payload is
                // augmented with the iconName — the canvas reads BOTH
                // pieces and calls addCustomElement("icon", at, {iconName, color}).
                e.dataTransfer.effectAllowed = "copy";
                e.dataTransfer.setData(
                  "application/x-slothcv-element",
                  "icon",
                );
                e.dataTransfer.setData(
                  "application/x-slothcv-icon",
                  it.name,
                );
                e.dataTransfer.setData("text/plain", `slothcv:icon:${it.name}`);
              }}
              onClick={() => addSocialIcon(it.name)}
              onDoubleClick={() => addSocialIcon(it.name)}
              title={`Drag to canvas, or click to add ${it.label}`}
              className="group relative flex aspect-square cursor-grab flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface p-1.5 transition-[background-color,box-shadow,transform] hover:-translate-y-px hover:border-strong hover:bg-surface-hover hover:shadow-md active:cursor-grabbing"
            >
              <SocialIconPreview name={it.name} />
              <span className="text-[10px] font-semibold leading-tight text-fg">
                {it.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {elements.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
            {t("toolshelf.layers")} ({elements.length})
          </p>
          <div className="space-y-1">
            {[...elements]
              // Layers panel: top of list = front of canvas (descending z).
              .sort((a, b) => b.z - a.z)
              .map((el) => (
                <LayerRow
                  key={el.id}
                  el={el}
                  onSelect={() => selectElement(el.id)}
                  onToggle={() =>
                    updateCustomElement(el.id, { visible: !el.visible })
                  }
                  onDelete={() => removeCustomElement(el.id)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LayerRow({
  el,
  onSelect,
  onToggle,
  onDelete,
}: {
  el: CustomElement;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const labelMap: Record<CustomElementKind, string> = {
    rect: "Rectangle",
    ellipse: "Ellipse",
    line: "Line",
    triangle: "Triangle",
    star: "Star",
    hexagon: "Hexagon",
    octagon: "Octagon",
    diamond: "Diamond",
    heart: "Heart",
    cross: "Cross",
    sparkle: "Sparkle",
    arrow: "Arrow",
    text: "Text",
    image: "Image",
    icon: "Icon",
  };
  const iconMap: Record<
    CustomElementKind,
    React.ComponentType<{ className?: string }>
  > = {
    rect: Box,
    ellipse: Circle,
    line: Minus,
    triangle: Triangle,
    star: Star,
    hexagon: Hexagon,
    octagon: Octagon,
    diamond: Diamond,
    heart: Heart,
    cross: PlusIcon,
    sparkle: Sparkles,
    arrow: ArrowRight,
    text: Type,
    image: ImageIcon,
    icon: Link2,
  };
  const Icon = iconMap[el.kind];
  // For icon layers, prefer the brand label (LinkedIn / Telegram) over
  // a generic "48×48" — users scanning the layers list want to know
  // WHICH icon, not its dimensions.
  const preview =
    el.kind === "text"
      ? (el as TextElement).text.slice(0, 28) || "(empty)"
      : el.kind === "icon"
        ? isSocialIconName((el as IconElement).iconName)
          ? SOCIAL_ICONS_BY_NAME[(el as IconElement).iconName as SocialIconName]
              .label
          : "Icon"
        : `${Math.round(el.w)}×${Math.round(el.h)}`;
  return (
    <div className="group flex items-center gap-1.5 rounded border border-transparent px-1.5 py-1 hover:border-border hover:bg-surface">
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 items-center gap-2 text-left text-xs cursor-pointer"
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-subtle" />
        <span className="flex flex-col">
          <span className="font-medium text-fg">{labelMap[el.kind]}</span>
          <span className="truncate text-[10px] text-subtle">{preview}</span>
        </span>
      </button>
      <button
        type="button"
        aria-label={el.visible ? "Hide layer" : "Show layer"}
        title={el.visible ? "Hide" : "Show"}
        onClick={onToggle}
        className="rounded p-1 text-subtle opacity-60 hover:bg-surface-hover hover:text-fg group-hover:opacity-100 cursor-pointer"
      >
        {el.visible ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        type="button"
        aria-label="Delete layer"
        title="Delete"
        onClick={onDelete}
        className="rounded p-1 text-subtle opacity-60 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 cursor-pointer"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inspector — controls for the currently-selected element
// ---------------------------------------------------------------------------

function Inspector({ element }: { element: CustomElement }) {
  const updateCustomElement = useEditorStore((s) => s.updateCustomElement);
  const removeCustomElement = useEditorStore((s) => s.removeCustomElement);
  const bringForward = useEditorStore((s) => s.bringForward);
  const sendBackward = useEditorStore((s) => s.sendBackward);
  const selectElement = useEditorStore((s) => s.selectElement);
  const confirm = useConfirm();

  // Live x/y mirrors. Refs + direct DOM mutation when the preview drag
  // dispatches `slothcv:custom-drag-tick`. No React rerender during drag.
  const xInput = useRef<HTMLInputElement | null>(null);
  const yInput = useRef<HTMLInputElement | null>(null);
  const xLabel = useRef<HTMLSpanElement | null>(null);
  const yLabel = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    function onTick(e: Event) {
      const d = (e as CustomEvent<{ id: string; x: number; y: number }>).detail;
      if (!d || d.id !== element.id) return;
      if (xInput.current) xInput.current.value = String(d.x);
      if (yInput.current) yInput.current.value = String(d.y);
      if (xLabel.current) xLabel.current.textContent = `${d.x}px`;
      if (yLabel.current) yLabel.current.textContent = `${d.y}px`;
    }
    window.addEventListener("slothcv:custom-drag-tick", onTick);
    window.addEventListener("slothcv:custom-drag-end", onTick);
    return () => {
      window.removeEventListener("slothcv:custom-drag-tick", onTick);
      window.removeEventListener("slothcv:custom-drag-end", onTick);
    };
  }, [element.id]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {kindLabel(element.kind)} selected
          </p>
          <p className="mt-0.5 text-[11px] text-subtle">
            Drag in the preview to move. Use these controls to fine-tune.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => selectElement(null)}
          title="Close inspector"
        >
          Done
        </Button>
      </div>

      {/* --- Position --- */}
      <Section title="Position">
        <div className="grid grid-cols-2 gap-2">
          <NumField
            label="X"
            id="x"
            value={element.x}
            min={-200}
            max={2000}
            innerRef={xInput}
            valueLabelRef={xLabel}
            onChange={(v) => updateCustomElement(element.id, { x: v })}
          />
          <NumField
            label="Y"
            id="y"
            value={element.y}
            min={-200}
            max={3000}
            innerRef={yInput}
            valueLabelRef={yLabel}
            onChange={(v) => updateCustomElement(element.id, { y: v })}
          />
        </div>
      </Section>

      {/* --- Size --- */}
      <Section title="Size">
        <div className="grid grid-cols-2 gap-2">
          <NumField
            label="W"
            id="w"
            value={element.w}
            min={2}
            max={2000}
            onChange={(v) => updateCustomElement(element.id, { w: v })}
          />
          <NumField
            label="H"
            id="h"
            value={element.h}
            min={0}
            max={3000}
            onChange={(v) => updateCustomElement(element.id, { h: v })}
          />
        </div>
      </Section>

      {/* --- Per-kind controls --- */}
      {element.kind === "rect" && <RectControls element={element} />}
      {element.kind === "ellipse" && <EllipseControls element={element} />}
      {element.kind === "line" && <LineControls element={element} />}
      {/* Polygon-family shapes share the same fill/stroke schema as
          ellipse, so we reuse PolygonControls for the inspector. */}
      {(element.kind === "triangle" ||
        element.kind === "star" ||
        element.kind === "hexagon" ||
        element.kind === "octagon" ||
        element.kind === "diamond" ||
        element.kind === "heart" ||
        element.kind === "cross" ||
        element.kind === "sparkle" ||
        element.kind === "arrow") && (
        <PolygonControls element={element} />
      )}
      {element.kind === "text" && <TextControls element={element} />}
      {element.kind === "image" && <ImageControls element={element} />}
      {element.kind === "icon" && <IconControls element={element} />}

      {/* --- Common: rotation, opacity --- */}
      <Section title="Transform">
        <NumField
          label="Rotate (deg)"
          id="rotate"
          value={element.rotate ?? 0}
          min={-360}
          max={360}
          onChange={(v) => updateCustomElement(element.id, { rotate: v })}
        />
        <NumField
          label="Opacity"
          id="opacity"
          value={Math.round((element.opacity ?? 1) * 100)}
          min={0}
          max={100}
          onChange={(v) =>
            updateCustomElement(element.id, { opacity: v / 100 })
          }
          suffix="%"
        />
      </Section>

      {/* --- Layer + delete --- */}
      <Section title="Layer">
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => bringForward(element.id)}
          >
            <ArrowUp className="h-3.5 w-3.5" />
            Forward
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => sendBackward(element.id)}
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Backward
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              updateCustomElement(element.id, { visible: !element.visible })
            }
          >
            {element.visible ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Hide
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Show
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              updateCustomElement(element.id, {
                rotate: 0,
                opacity: 1,
              })
            }
            title="Reset transform"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </Section>

      <Section title="">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={async () => {
            const ok = await confirm({
              title: `Delete this ${kindLabel(element.kind).toLowerCase()}?`,
              description:
                "The element will be removed from the canvas. Other elements stay where they are.",
              confirmLabel: "Delete",
              cancelLabel: "Cancel",
              variant: "danger",
            });
            if (ok) removeCustomElement(element.id);
          }}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete element
        </Button>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-kind control panels
// ---------------------------------------------------------------------------

function RectControls({ element }: { element: RectElement }) {
  const update = useEditorStore((s) => s.updateCustomElement);
  return (
    <Section title="Fill & stroke">
      <ColorField
        label="Fill"
        value={element.fill}
        onChange={(v) => update(element.id, { fill: v })}
      />
      <ColorField
        label="Stroke"
        value={element.stroke ?? ""}
        onChange={(v) =>
          update(element.id, { stroke: v.trim() ? v : undefined })
        }
      />
      <NumField
        label="Stroke width"
        id="rect-stroke-w"
        value={element.strokeWidth ?? 0}
        min={0}
        max={40}
        onChange={(v) =>
          update(element.id, { strokeWidth: v > 0 ? v : undefined })
        }
      />
      <NumField
        label="Corner radius"
        id="rect-radius"
        value={element.radius ?? 0}
        min={0}
        max={400}
        onChange={(v) => update(element.id, { radius: v })}
      />
    </Section>
  );
}

function EllipseControls({ element }: { element: EllipseElement }) {
  const update = useEditorStore((s) => s.updateCustomElement);
  return (
    <Section title="Fill & stroke">
      <ColorField
        label="Fill"
        value={element.fill}
        onChange={(v) => update(element.id, { fill: v })}
      />
      <ColorField
        label="Stroke"
        value={element.stroke ?? ""}
        onChange={(v) =>
          update(element.id, { stroke: v.trim() ? v : undefined })
        }
      />
      <NumField
        label="Stroke width"
        id="ellipse-stroke-w"
        value={element.strokeWidth ?? 0}
        min={0}
        max={40}
        onChange={(v) =>
          update(element.id, { strokeWidth: v > 0 ? v : undefined })
        }
      />
    </Section>
  );
}

/** Polygon-family shape inspector. Same fill+stroke knobs as ellipse —
 *  kept as a separate component so we can extend it later with
 *  shape-specific controls (e.g. star point count) without touching
 *  ellipse. */
function PolygonControls({
  element,
}: {
  element:
    | import("@/types/resume").TriangleElement
    | import("@/types/resume").StarElement
    | import("@/types/resume").HexagonElement
    | import("@/types/resume").OctagonElement
    | import("@/types/resume").DiamondElement
    | import("@/types/resume").HeartElement
    | import("@/types/resume").CrossElement
    | import("@/types/resume").SparkleElement
    | import("@/types/resume").ArrowElement;
}) {
  const update = useEditorStore((s) => s.updateCustomElement);
  return (
    <Section title="Fill & stroke">
      <ColorField
        label="Fill"
        value={element.fill}
        onChange={(v) => update(element.id, { fill: v })}
      />
      <ColorField
        label="Stroke"
        value={element.stroke ?? ""}
        onChange={(v) =>
          update(element.id, { stroke: v.trim() ? v : undefined })
        }
      />
      <NumField
        label="Stroke width"
        id="polygon-stroke-w"
        value={element.strokeWidth ?? 0}
        min={0}
        max={40}
        onChange={(v) =>
          update(element.id, { strokeWidth: v > 0 ? v : undefined })
        }
      />
    </Section>
  );
}

function LineControls({ element }: { element: LineElement }) {
  const update = useEditorStore((s) => s.updateCustomElement);
  const isDashed = !!(element.dash && element.dash.length > 0);
  return (
    <Section title="Stroke">
      <ColorField
        label="Color"
        value={element.color}
        onChange={(v) => update(element.id, { color: v })}
      />
      <NumField
        label="Thickness"
        id="line-thickness"
        value={element.thickness}
        min={0.5}
        max={40}
        onChange={(v) => update(element.id, { thickness: v })}
      />
      <div className="flex items-center gap-2 text-xs">
        <input
          id="line-dashed"
          type="checkbox"
          checked={isDashed}
          onChange={(e) =>
            update(element.id, { dash: e.target.checked ? [6, 4] : undefined })
          }
        />
        <Label htmlFor="line-dashed" className="!mb-0">
          Dashed
        </Label>
      </div>
    </Section>
  );
}

function TextControls({ element }: { element: TextElement }) {
  const update = useEditorStore((s) => s.updateCustomElement);
  return (
    <Section title="Text">
      <div>
        <Label htmlFor="text-content">Content</Label>
        <textarea
          id="text-content"
          value={element.text}
          onChange={(e) => update(element.id, { text: e.target.value })}
          rows={3}
          className="block w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2"
          placeholder="Type your text…"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="Font size"
          id="text-fs"
          value={element.fontSize}
          min={6}
          max={160}
          onChange={(v) => update(element.id, { fontSize: v })}
        />
        <NumField
          label="Weight"
          id="text-fw"
          value={element.fontWeight}
          min={100}
          max={900}
          step={100}
          onChange={(v) => update(element.id, { fontWeight: v })}
        />
      </div>
      <ColorField
        label="Color"
        value={element.color}
        onChange={(v) => update(element.id, { color: v })}
      />
      <div>
        <Label>Align</Label>
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((a) => (
            <Button
              key={a}
              type="button"
              variant={element.align === a ? "default" : "outline"}
              size="sm"
              className="h-7 flex-1 text-xs capitalize"
              onClick={() => update(element.id, { align: a })}
            >
              {a}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={!!element.italic}
            onChange={(e) =>
              update(element.id, { italic: e.target.checked || undefined })
            }
          />
          Italic
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={!!element.underline}
            onChange={(e) =>
              update(element.id, { underline: e.target.checked || undefined })
            }
          />
          Underline
        </label>
      </div>
    </Section>
  );
}

/** Brand-glyph inspector. Two controls:
 *
 *    - **Brand picker**: a 3-col grid of every registered social icon,
 *      same layout as the shelf palette. Clicking swaps `iconName`
 *      AND resets `color` to that brand's defaultColor — so changing
 *      from Instagram pink to Telegram blue gives a sensible recolour
 *      automatically. The user can fine-tune color afterwards.
 *
 *    - **Color picker**: standard ColorField. Persists to
 *      `IconElement.color` which the renderer plugs into the SVG's
 *      `fill`. No transition — instant retint.
 *
 *  No size / stroke controls — the global Position + Size + Transform
 *  sections above already cover those. Icon glyphs are intentionally
 *  fill-only (no stroke) because brand guidelines vary and a stroke
 *  on a brand glyph generally violates the network's logo policy. */
function IconControls({ element }: { element: IconElement }) {
  const update = useEditorStore((s) => s.updateCustomElement);
  // Suggest a sensible default URL placeholder per brand so the user
  // doesn't have to remember whether LinkedIn is `/in/` or `/company/`.
  // These are HINTS only — the actual stored value is always whatever
  // the user types. Empty / undefined = decorative icon with no link.
  const placeholder =
    element.iconName === "linkedin"
      ? "https://linkedin.com/in/yourname"
      : element.iconName === "github"
        ? "https://github.com/yourname"
        : element.iconName === "x"
          ? "https://x.com/yourhandle"
          : element.iconName === "instagram"
            ? "https://instagram.com/yourhandle"
            : element.iconName === "facebook"
              ? "https://facebook.com/yourname"
              : element.iconName === "youtube"
                ? "https://youtube.com/@yourchannel"
                : element.iconName === "telegram"
                  ? "https://t.me/yourhandle"
                  : element.iconName === "tiktok"
                    ? "https://tiktok.com/@yourhandle"
                    : element.iconName === "discord"
                      ? "https://discord.com/users/yourid"
                      : element.iconName === "behance"
                        ? "https://behance.net/yourname"
                        : element.iconName === "dribbble"
                          ? "https://dribbble.com/yourname"
                          : element.iconName === "mail"
                            ? "mailto:you@example.com"
                            : "https://example.com";
  return (
    <Section title="Icon">
      <div>
        <Label>Brand</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {SOCIAL_ICONS.map((it) => {
            const isActive = element.iconName === it.name;
            return (
              <button
                key={it.name}
                type="button"
                onClick={() =>
                  update(element.id, {
                    iconName: it.name,
                    color: it.defaultColor,
                  })
                }
                title={it.label}
                className={`group flex aspect-square cursor-pointer flex-col items-center justify-center gap-0.5 rounded border bg-surface p-1 text-[9px] font-medium transition-[background-color,box-shadow,border-color] ${
                  isActive
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-950/40 dark:text-blue-300"
                    : "border-border text-fg hover:border-strong hover:bg-surface-hover"
                }`}
              >
                <svg
                  viewBox={it.viewBox}
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path d={it.path} fill={it.defaultColor} />
                </svg>
                <span className="truncate leading-tight">{it.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <ColorField
        label="Color"
        value={element.color}
        onChange={(v) => update(element.id, { color: v })}
      />
      {/* URL field. Optional. When set, the icon becomes a clickable
          link in the exported PDF — recruiters can click LinkedIn/GitHub
          icons to open the profile. Live editor canvas does NOT
          navigate on click (clicks select the element); the URL is
          purely for export. */}
      <div>
        <Label>Link URL</Label>
        <UrlInput
          value={element.url ?? ""}
          onChange={(e) =>
            update(element.id, { url: e.target.value.trim() || undefined })
          }
          placeholder={placeholder}
        />
        <p className="mt-1 text-[10px] text-subtle">
          Optional. When set, the icon becomes a clickable link in the
          exported PDF.
        </p>
      </div>
    </Section>
  );
}

function ImageControls({ element }: { element: ImageElement }) {
  const { t } = useLanguage();
  const update = useEditorStore((s) => s.updateCustomElement);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  async function onPickFile(file: File) {
    // Local blob preview while the upload runs in the background — same
    // pattern as the personal-form photo upload. Swap to the persistent
    // Supabase URL once we have it; revoke the blob in either branch so
    // the browser can reclaim the file bytes.
    const localUrl = URL.createObjectURL(file);
    update(element.id, { url: localUrl });
    setUploading(true);
    try {
      const persistent = await uploadCustomElementImage(file);
      update(element.id, { url: persistent });
      URL.revokeObjectURL(localUrl);
      toast.success(t("editor.toast.imageUploaded"));
    } catch (e) {
      URL.revokeObjectURL(localUrl);
      update(element.id, { url: "" });
      toast.error(translateError(e, t, "editor.toast.imageUploadFailed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Section title="Image">
      <div className="flex items-center gap-2">
        {element.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={element.url}
            alt=""
            className="h-12 w-12 shrink-0 rounded-md object-cover ring-1 ring-border"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-md ring-1 ring-border"
            style={{
              background:
                "repeating-linear-gradient(45deg, var(--color-surface-hover) 0 6px, var(--color-surface) 6px 12px)",
            }}
          >
            <ImageIcon className="h-4 w-4 text-subtle" />
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : element.url ? "Replace" : "Upload image"}
          </Button>
          {element.url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => update(element.id, { url: "" })}
              disabled={uploading}
            >
              Clear
            </Button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onPickFile(f);
          }}
        />
      </div>
      {!showUrl ? (
        <button
          type="button"
          onClick={() => setShowUrl(true)}
          className="text-[11px] text-muted underline-offset-2 hover:underline"
        >
          Paste a URL instead
        </button>
      ) : (
        <div>
          <Label>Image URL</Label>
          <UrlInput
            value={element.url}
            onChange={(e) => update(element.id, { url: e.target.value })}
            placeholder="https://…"
          />
        </div>
      )}
      <div>
        <Label>Fit</Label>
        <div className="flex gap-1">
          {(["cover", "contain", "fill"] as const).map((f) => (
            <Button
              key={f}
              type="button"
              variant={(element.fit ?? "cover") === f ? "default" : "outline"}
              size="sm"
              className="h-7 flex-1 text-xs capitalize"
              onClick={() => update(element.id, { fit: f })}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>
      <NumField
        label="Corner radius"
        id="image-radius"
        value={element.radius ?? 0}
        min={0}
        max={400}
        onChange={(v) => update(element.id, { radius: v })}
      />
      {/* Link URL — separate from `url` (which is the IMAGE source).
          When set, the image becomes a clickable hyperlink in the
          exported PDF. Same UX pattern as the social-icon Link URL
          field above; the IMAGE src and the LINK destination are
          intentionally distinct (e.g. screenshot from Supabase ↔
          Behance case study URL). */}
      <div>
        <Label>Link URL</Label>
        <UrlInput
          value={element.linkUrl ?? ""}
          onChange={(e) =>
            update(element.id, { linkUrl: e.target.value.trim() || undefined })
          }
          placeholder="https://github.com/yourname/project"
        />
        <p className="mt-1 text-[10px] text-subtle">
          Optional. When set, the image becomes a clickable link in the
          exported PDF.
        </p>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-surface p-2.5">
      {title && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function NumField({
  label,
  id,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
  innerRef,
  valueLabelRef,
}: {
  label: string;
  id: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
  innerRef?: React.RefObject<HTMLInputElement | null>;
  valueLabelRef?: React.RefObject<HTMLSpanElement | null>;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px] text-muted">
        <Label htmlFor={id} className="!mb-0">
          {label}
        </Label>
        <span className="font-mono text-[10px]" ref={valueLabelRef ?? null}>
          {Math.round(value)}
          {suffix ?? "px"}
        </span>
      </div>
      <input
        id={id}
        ref={innerRef ?? null}
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        defaultValue={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

/** Brand-canonical preset palette — short curated list of colors that
 *  reliably work on a CV (high-contrast accents, neutral text colors,
 *  and the design system's blue). Surfaces in every inspector
 *  ColorField popover so the user has a sensible starting point
 *  without typing hex codes from memory. */
const INSPECTOR_PRESETS = [
  "#0f172a", // slate-900 — text on light bgs
  "#ffffff", // white
  "#2563eb", // blue-600 — slothcv accent
  "#dc2626", // red-600
  "#ea580c", // orange-600
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#0891b2", // cyan-600
  "#7c3aed", // violet-600
  "#be185d", // pink-700
  "#475569", // slate-600 — secondary text
  "#94a3b8", // slate-400 — muted
];

/** Inspector ColorField — wraps `ColorPickerPopover` so the inspector
 *  surface stays simple. Adds the per-CV preset palette and forwards
 *  the rest of the prop API the inspector callers already use. */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <ColorPickerPopover
      label={label}
      value={value}
      onChange={onChange}
      presets={INSPECTOR_PRESETS}
    />
  );
}

function kindLabel(k: CustomElementKind): string {
  switch (k) {
    case "rect":
      return "Rectangle";
    case "ellipse":
      return "Ellipse";
    case "line":
      return "Line";
    case "triangle":
      return "Triangle";
    case "star":
      return "Star";
    case "hexagon":
      return "Hexagon";
    case "octagon":
      return "Octagon";
    case "diamond":
      return "Diamond";
    case "heart":
      return "Heart";
    case "cross":
      return "Cross";
    case "sparkle":
      return "Sparkle";
    case "arrow":
      return "Arrow";
    case "text":
      return "Text";
    case "image":
      return "Image";
    case "icon":
      return "Icon";
  }
}
