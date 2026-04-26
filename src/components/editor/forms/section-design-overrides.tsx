/**
 * SectionDesignOverrides — collapsible panel under each section's editor
 * that lets the user tweak design tokens FOR THAT SECTION ONLY.
 *
 * The data model already supports this via `Section.overrides?: Partial<GlobalDesign>`.
 * This component just exposes a UI surface for it.
 *
 * Currently exposes the most-impactful tokens (others fall back to global):
 *   - Accent color override (with picker + presets)
 *   - Header style override
 *   - Bullet style override
 *   - Skill bar style override (only meaningful for skills sections)
 *
 * "Reset to global" clears the override entry entirely.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Move, Sparkles, RotateCcw } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { useEditorStore } from "@/lib/store/editor";
import type {
  BulletStyle,
  GlobalDesign,
  HeaderStyle,
  Section,
  SkillBarStyle,
} from "@/types/resume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ACCENT_PRESETS = [
  "#0f172a",
  "#1e3a8a",
  "#2563eb",
  "#0ea5e9",
  "#0d9488",
  "#16a34a",
  "#65a30d",
  "#ca8a04",
  "#ea580c",
  "#dc2626",
  "#e11d48",
  "#db2777",
  "#9333ea",
  "#7c3aed",
  "#4338ca",
  "#475569",
];

export function SectionDesignOverrides({ section }: { section: Section }) {
  const updateSection = useEditorStore((s) => s.updateSection);
  const [open, setOpen] = useState(false);
  const [pickingColor, setPickingColor] = useState(false);
  const ov = section.overrides ?? {};

  /** Patch an override key. Passing `undefined` removes the entry so the
   *  section falls back to the global value. */
  function patch(key: keyof GlobalDesign, value: GlobalDesign[typeof key] | undefined) {
    const next = { ...ov };
    if (value === undefined) {
      delete (next as Record<string, unknown>)[key];
    } else {
      (next as Record<string, unknown>)[key] = value;
    }
    const isEmpty = Object.keys(next).length === 0;
    updateSection(section.id, {
      overrides: isEmpty ? undefined : next,
    });
  }

  const overrideCount = Object.keys(ov).length;

  return (
    <div className="rounded-md border border-border bg-surface-hover">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-fg hover:bg-surface-hover"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-subtle" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-subtle" />
        )}
        <Sparkles className="h-3.5 w-3.5 text-subtle" />
        <span className="flex-1">Style this section</span>
        {overrideCount > 0 && (
          <span className="rounded-full bg-[color:var(--color-text)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--color-bg)]">
            {overrideCount}
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-border p-3">
          {/* Accent color override */}
          <div className="mb-3">
            <div className="flex items-baseline justify-between">
              <Label>Accent (this section only)</Label>
              {ov.accentColor !== undefined && (
                <button
                  type="button"
                  onClick={() => patch("accentColor", undefined)}
                  className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted hover:text-fg"
                >
                  <RotateCcw className="h-3 w-3" />
                  reset
                </button>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPickingColor((v) => !v)}
                className="h-9 w-9 shrink-0 rounded-md border border-strong"
                style={{ background: ov.accentColor ?? "transparent" }}
                aria-label="Open color picker"
              />
              <Input
                value={ov.accentColor ?? ""}
                placeholder="(falls back to global)"
                onChange={(e) =>
                  patch(
                    "accentColor",
                    e.target.value.trim() ? e.target.value : undefined,
                  )
                }
                className="h-9 max-w-[140px] font-mono text-xs"
              />
              <div className="flex flex-wrap gap-1">
                {ACCENT_PRESETS.slice(0, 8).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => patch("accentColor", p)}
                    className="h-5 w-5 rounded border border-strong"
                    style={{ background: p }}
                    aria-label={`Set accent to ${p}`}
                  />
                ))}
              </div>
            </div>
            {pickingColor && (
              <div className="mt-2">
                <HexColorPicker
                  color={ov.accentColor ?? "#000000"}
                  onChange={(v) => patch("accentColor", v)}
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {ACCENT_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => patch("accentColor", p)}
                      className="h-6 w-6 rounded border border-strong"
                      style={{ background: p }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Header style override */}
          <Row label="Header style" present={ov.headerStyle !== undefined} onReset={() => patch("headerStyle", undefined)}>
            <ChipPick
              value={ov.headerStyle}
              options={[
                "uppercase",
                "titlecase",
                "underline",
                "box",
                "accent-block",
              ] as HeaderStyle[]}
              onPick={(v) => patch("headerStyle", v)}
            />
          </Row>

          {/* Bullet style override */}
          <Row label="Bullet style" present={ov.bulletStyle !== undefined} onReset={() => patch("bulletStyle", undefined)}>
            <ChipPick
              value={ov.bulletStyle}
              options={["disc", "dash", "arrow", "square", "none"] as BulletStyle[]}
              onPick={(v) => patch("bulletStyle", v)}
            />
          </Row>

          {/* Skill bar override (only useful for skills sections, but we
              show it everywhere — harmless if unused). */}
          {section.type === "skills" && (
            <Row label="Skill display" present={ov.skillBarStyle !== undefined} onReset={() => patch("skillBarStyle", undefined)}>
              <ChipPick
                value={ov.skillBarStyle}
                options={["bar", "dots", "stars", "circles", "text-only", "pills"] as SkillBarStyle[]}
                onPick={(v) => patch("skillBarStyle", v)}
              />
            </Row>
          )}

          {/* Position — synced 1:1 with the drag handler in the preview
              pane. The user can either drag the section in the preview OR
              tweak these sliders; both write the same `section.position`
              field. Reset returns the section to its template-default
              position. */}
          <PositionRow section={section} updateSection={updateSection} />

          {overrideCount > 0 && (
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => updateSection(section.id, { overrides: undefined })}
                className="text-[11px]"
              >
                <RotateCcw className="h-3 w-3" />
                Reset all overrides
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PositionRow({
  section,
  updateSection,
}: {
  section: Section;
  updateSection: <T extends Section>(id: string, patch: Partial<T>) => void;
}) {
  const pos = section.position ?? { x: 0, y: 0 };
  // Mutable refs for the sliders + their value labels so the preview's
  // drag handler can update them directly during drag — no React rerender,
  // no Zustand churn, no jank. Final state is committed to the store on
  // mouseup via a separate `slothcv:section-drag-end` event.
  const xSlider = useRef<HTMLInputElement | null>(null);
  const ySlider = useRef<HTMLInputElement | null>(null);
  const xLabel = useRef<HTMLSpanElement | null>(null);
  const yLabel = useRef<HTMLSpanElement | null>(null);

  // Subscribe to drag ticks for THIS section. We compare ids before
  // touching the DOM so other sections' drags don't echo into this row.
  useEffect(() => {
    function onTick(e: Event) {
      const d = (e as CustomEvent<{ id: string; x: number; y: number }>).detail;
      if (!d || d.id !== section.id) return;
      // Direct DOM mutation — no React, runs in the same tick as the
      // preview's transform write.
      if (xSlider.current) xSlider.current.value = String(d.x);
      if (ySlider.current) ySlider.current.value = String(d.y);
      if (xLabel.current) xLabel.current.textContent = `${d.x}px`;
      if (yLabel.current) yLabel.current.textContent = `${d.y}px`;
    }
    window.addEventListener("slothcv:section-drag-tick", onTick);
    window.addEventListener("slothcv:section-drag-end", onTick);
    return () => {
      window.removeEventListener("slothcv:section-drag-tick", onTick);
      window.removeEventListener("slothcv:section-drag-end", onTick);
    };
  }, [section.id]);

  const set = (next: { x: number; y: number }) => {
    if (next.x === 0 && next.y === 0) {
      updateSection(section.id, { position: undefined });
    } else {
      updateSection(section.id, { position: next });
    }
  };
  const setRotation = (deg: number) => {
    updateSection(section.id, { rotation: deg === 0 ? undefined : deg });
  };
  const isCustom = pos.x !== 0 || pos.y !== 0;
  const rotation = section.rotation ?? 0;

  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between">
        <Label>
          <span className="inline-flex items-center gap-1">
            <Move className="h-3 w-3" />
            Position &amp; rotate
          </span>
        </Label>
        {(isCustom || rotation !== 0) && (
          <button
            type="button"
            onClick={() => {
              set({ x: 0, y: 0 });
              setRotation(0);
            }}
            className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted hover:text-fg"
          >
            <RotateCcw className="h-3 w-3" />
            reset
          </button>
        )}
      </div>
      <div className="mt-1 grid grid-cols-2 gap-3">
        <div>
          <div className="mb-0.5 text-[11px] text-muted">
            X (← →) <span ref={xLabel}>{pos.x}px</span>
          </div>
          <input
            ref={xSlider}
            type="range"
            min={-200}
            max={200}
            step={1}
            defaultValue={pos.x}
            onChange={(e) => set({ x: Number(e.target.value), y: pos.y })}
            className="w-full"
          />
        </div>
        <div>
          <div className="mb-0.5 text-[11px] text-muted">
            Y (↑ ↓) <span ref={yLabel}>{pos.y}px</span>
          </div>
          <input
            ref={ySlider}
            type="range"
            min={-200}
            max={200}
            step={1}
            defaultValue={pos.y}
            onChange={(e) => set({ x: pos.x, y: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>
      <div className="mt-2">
        <div className="mb-0.5 text-[11px] text-muted">
          Rotate <span>{rotation}°</span>
        </div>
        <input
          type="range"
          min={-180}
          max={180}
          step={1}
          value={rotation}
          onChange={(e) => setRotation(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <p className="mt-1 text-[10px] text-subtle">
        Drag the section in the preview to move it. Rotate spins it around
        its center. Sliders + drag stay synced through the saved state.
      </p>
    </div>
  );
}

function Row({
  label,
  present,
  onReset,
  children,
}: {
  label: string;
  present: boolean;
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        {present && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted hover:text-fg"
          >
            <RotateCcw className="h-3 w-3" />
            reset
          </button>
        )}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function ChipPick<T extends string>({
  value,
  options,
  onPick,
}: {
  value: T | undefined;
  options: T[];
  onPick: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <Button
          key={o}
          type="button"
          variant={value === o ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => onPick(o)}
        >
          {o}
        </Button>
      ))}
    </div>
  );
}
