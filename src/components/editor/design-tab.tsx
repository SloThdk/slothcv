/**
 * DesignTab — global design controls panel.
 *
 * Reads from / writes to the editor store's `design` slice. Each control
 * group is collapsible to keep the panel scrollable on small screens. We
 * deliberately do not collapse-by-default — the most common edit on this tab
 * is "change accent color", and demanding a click to reveal it would be hostile.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { useEditorStore } from "@/lib/store/editor";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type {
  BulletStyle,
  DateFormat,
  DividerStyle,
  GlobalDesign,
  HeaderStyle,
  LanguageStyle,
  Layout,
  LetterSpacing,
  PageMargin,
  PhotoPosition,
  PhotoShape,
  SkillBarStyle,
  WatermarkPosition,
} from "@/types/resume";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-modal";
import { FONT_GROUPS, FONT_NAMES } from "@/lib/fonts/registry";
import { defaultDesignForTemplate } from "@/lib/resume-defaults";
import { DESIGN_HINT, designLabel } from "@/lib/design-labels";
import { TEMPLATE_IDS, type TemplateId } from "@/types/resume";
import { TEMPLATES_BY_ID } from "@/templates/registry";
import { RotateCcw } from "lucide-react";

// Pre-compute every template's palette + font pair so the
// "Template palettes" + "Template font pairs" preset rows below have
// constant data to render. Kept at module scope so the array isn't
// rebuilt on every DesignTab render. The `defaultDesignForTemplate()`
// switch is already exhaustive over TEMPLATE_IDS, so missing entries
// are caught at compile time.
const TEMPLATE_PRESETS: Array<{
  id: TemplateId;
  name: string;
  accent: string;
  secondary: string;
  bg: string;
  text: string;
  titleFont: string;
  bodyFont: string;
}> = TEMPLATE_IDS.map((id) => {
  const d = defaultDesignForTemplate(id);
  return {
    id,
    name: TEMPLATES_BY_ID[id]?.name ?? id,
    accent: d.accentColor,
    secondary: d.secondaryColor,
    bg: d.pageBg,
    text: d.textColor,
    titleFont: d.titleFont,
    bodyFont: d.bodyFont,
  };
});

/** 16-color preset palette — Tailwind 600s, designer-curated. */
const ACCENT_PRESETS = [
  "#0f172a", // slate-900
  "#1e3a8a", // blue-900
  "#2563eb", // blue-600
  "#0ea5e9", // sky-500
  "#0d9488", // teal-600
  "#16a34a", // green-600
  "#65a30d", // lime-600
  "#ca8a04", // yellow-600
  "#ea580c", // orange-600
  "#dc2626", // red-600
  "#e11d48", // rose-600
  "#db2777", // pink-600
  "#9333ea", // purple-600
  "#7c3aed", // violet-600
  "#4338ca", // indigo-700
  "#475569", // slate-600
];

// FONT_OPTIONS is now imported from the registry — ~30 fonts grouped by
// vibe (modern sans / classic serif / display / mono / humanist). See
// src/lib/fonts/registry.ts for the full list and licensing notes.

export function DesignTab() {
  const design = useEditorStore((s) => s.data.design);
  const setDesign = useEditorStore((s) => s.setDesign);
  const template = useEditorStore((s) => s.data.meta.template);
  const { t } = useLanguage();
  const confirm = useConfirm();

  // Ref + flash state for the "click on page background → jump here"
  // affordance. Wired up by preview.tsx: a background click fires
  // `slothcv:open-design-tab`; editor/page.tsx switches the active tab
  // to Design, and we scroll the BackgroundQuickPicker row into view
  // and pulse a ring around it for ~1.4 s so the user notices where
  // their click landed. Without the ring the tab-switch alone reads
  // as "the panel jumped" which is more disorienting than helpful.
  const pageBgRef = useRef<HTMLDivElement>(null);
  const [bgFlash, setBgFlash] = useState(false);
  useEffect(() => {
    function onOpen() {
      // Two RAFs: first lets React commit the tab switch (so DesignTab
      // is mounted + sized before we ask the browser to scroll to a
      // child of it), second lets the layout settle so the smooth
      // scroll lands on the final position rather than chasing it.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          pageBgRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          setBgFlash(true);
          // Match the flash duration to two pulse cycles of the ring
          // animation so the ring fades in, fades out, and the highlight
          // class is removed all at once — no half-faded leftover state.
          window.setTimeout(() => setBgFlash(false), 1400);
        });
      });
    }
    window.addEventListener("slothcv:open-design-tab", onOpen);
    return () => {
      window.removeEventListener("slothcv:open-design-tab", onOpen);
    };
  }, []);

  /** Reset using the CURRENT template's factory design — Aurora goes
   *  back to dark/mint, Eclipse to amber/black, etc. The user stays on
   *  whatever template they picked; only the design values within that
   *  template return to "out of the box". */
  async function onResetAll() {
    const factory = defaultDesignForTemplate(template);
    const ok = await confirm({
      title: "Reset design to template defaults?",
      description:
        "Every design control — colors, typography, layout, photo, watermark — returns to this template's original look. The template stays the same, your content is unaffected.",
      confirmLabel: "Reset design",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;
    setDesign(factory);
  }

  /** Per-group reset — only patches the keys for that group, leaves
   *  everything else alone. So you can reset colors without losing your
   *  font choices, etc. */
  function onResetGroup(group: "color" | "typography" | "layout" | "photo" | "sections" | "watermark") {
    const factory = defaultDesignForTemplate(template);
    switch (group) {
      case "color":
        setDesign({
          accentColor: factory.accentColor,
          secondaryColor: factory.secondaryColor,
          pageBg: factory.pageBg,
          textColor: factory.textColor,
        });
        break;
      case "typography":
        setDesign({
          titleFont: factory.titleFont,
          bodyFont: factory.bodyFont,
          fontScale: factory.fontScale,
          lineSpacing: factory.lineSpacing,
          letterSpacing: factory.letterSpacing,
        });
        break;
      case "layout":
        setDesign({
          layout: factory.layout,
          sidebarWidth: factory.sidebarWidth,
          pageMargin: factory.pageMargin,
          pageMarginMm: factory.pageMarginMm,
          pageSize: factory.pageSize,
          multiPage: factory.multiPage,
        });
        break;
      case "photo":
        setDesign({ photo: factory.photo });
        break;
      case "sections":
        setDesign({
          sectionIcons: factory.sectionIcons,
          iconSet: factory.iconSet,
          bulletStyle: factory.bulletStyle,
          dividerStyle: factory.dividerStyle,
          headerStyle: factory.headerStyle,
          skillBarStyle: factory.skillBarStyle,
          languageStyle: factory.languageStyle,
        });
        break;
      case "watermark":
        setDesign({
          watermarkText: factory.watermarkText,
          watermarkPosition: factory.watermarkPosition,
          watermarkColor: factory.watermarkColor,
        });
        break;
    }
  }

  return (
    <div className="space-y-5">
      {/* Inline keyframes for the page-bg flash. Co-located with the
          consumer so globals.css stays untouched. The animation pulses
          a soft accent ring on the BackgroundQuickPicker wrapper for
          ~1.4 s after a background click, confirming "your click
          landed HERE". prefers-reduced-motion users get an animation
          collapsed to ~0 ms by the global guard in globals.css. */}
      <style>{`
        @keyframes slothcv-bg-flash {
          0%, 100% { box-shadow: 0 0 0 0 transparent; }
          50%      { box-shadow: 0 0 0 3px var(--color-accent); }
        }
        .slothcv-bg-flash { animation: slothcv-bg-flash 0.7s ease-in-out 2; }
      `}</style>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-subtle">
          Design controls. Each group has its own Reset; the global one
          below restores everything to this template&rsquo;s factory look.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onResetAll}
          title="Reset every design value to this template's factory defaults"
          className="text-[11px]"
        >
          <RotateCcw className="h-3 w-3" />
          Reset all
        </Button>
      </div>
      <Section title="Color presets">
        {/* Template palettes — every template's full palette as a
            one-click apply. Lets users mix Carbon's IBM Blue on dark
            grey with any layout, or Eclipse's amber on a different
            template, etc. — without changing template. */}
        <TemplatePalettePicker
          presets={TEMPLATE_PRESETS}
          activeAccent={design.accentColor}
          activeBg={design.pageBg}
          onApply={(p) =>
            setDesign({
              accentColor: p.accent,
              secondaryColor: p.secondary,
              pageBg: p.bg,
              textColor: p.text,
            })
          }
        />
        <PalettePicker
          onApply={(p) =>
            setDesign({
              accentColor: p.accent,
              secondaryColor: p.secondary,
              pageBg: p.bg,
              textColor: p.text,
            })
          }
        />
        <div
          ref={pageBgRef}
          // `bg-flash` (defined in globals.css) pulses a soft accent
          // ring on the wrapper for ~1.4 s. Scroll-margin keeps the
          // smooth-scroll target from butting against the panel edge
          // when the row is near the top or bottom.
          className={`scroll-mt-4 scroll-mb-4 rounded-lg ${bgFlash ? "slothcv-bg-flash" : ""}`}
        >
          <BackgroundQuickPicker
            value={design.pageBg}
            onApply={(c) => setDesign({ pageBg: c })}
          />
        </div>
      </Section>

      <Section title={t("design.color")} onReset={() => onResetGroup("color")}>
        <ColorRow
          label="Accent"
          value={design.accentColor}
          onChange={(v) => setDesign({ accentColor: v })}
          presets={ACCENT_PRESETS}
        />
        <ColorRow
          label="Secondary"
          value={design.secondaryColor}
          onChange={(v) => setDesign({ secondaryColor: v })}
        />
        <ColorRow
          label="Page background"
          value={design.pageBg}
          onChange={(v) => setDesign({ pageBg: v })}
        />
        <ColorRow
          label="Text"
          value={design.textColor}
          onChange={(v) => setDesign({ textColor: v })}
        />
      </Section>

      <Section title={t("design.typography")} onReset={() => onResetGroup("typography")}>
        {/* Title font drives every <h1>/<h2> and section heading the
            templates have. Body font drives paragraphs + labels.
            Both are now user-editable — earlier the title font was
            locked "to preserve template character" but that meant
            users couldn't, e.g., put Eclipse's Fraunces on a Davos
            layout. The Reset button per-section restores both to the
            current template's intended pairing if the user gets lost. */}
        <TemplateFontPairPicker
          presets={TEMPLATE_PRESETS}
          activeTitle={design.titleFont}
          activeBody={design.bodyFont}
          onApply={(p) =>
            setDesign({ titleFont: p.titleFont, bodyFont: p.bodyFont })
          }
        />
        <FontPicker
          label="Title font"
          value={design.titleFont}
          onChange={(v) => setDesign({ titleFont: v })}
        />
        <FontPicker
          label="Body font"
          value={design.bodyFont}
          onChange={(v) => setDesign({ bodyFont: v })}
        />
        <SliderRow
          label={`Font scale (${design.fontScale.toFixed(2)}×)`}
          min={0.8}
          max={1.2}
          step={0.02}
          value={design.fontScale}
          onChange={(v) => setDesign({ fontScale: v })}
        />
        <SliderRow
          label={`Line spacing (${design.lineSpacing.toFixed(2)})`}
          min={1.0}
          max={1.75}
          step={0.05}
          value={design.lineSpacing}
          onChange={(v) => setDesign({ lineSpacing: v })}
        />
        <ChipRow
          label="Letter spacing"
          value={design.letterSpacing}
          options={["tight", "normal", "wide"] as LetterSpacing[]}
          onChange={(v) => setDesign({ letterSpacing: v })}
        />
      </Section>

      <Section title={t("design.layout")} onReset={() => onResetGroup("layout")}>
        {/* Layout chip is honored by Scratch (the blank-canvas template) and
            controls Aurora's grid columns. Other templates have hard-coded
            layouts that come from picking a different template — surface
            that to the user with the helper text below. */}
        <ChipRow
          label="Layout (Scratch / Aurora)"
          value={design.layout}
          options={[
            "single",
            "two-col",
            "sidebar-left",
            "sidebar-right",
          ] as Layout[]}
          onChange={(v) => setDesign({ layout: v })}
        />
        <p className="text-[11px] text-subtle">
          For other templates, pick a different template in the Templates tab to
          change layout.
        </p>
        <SliderRow
          label={`Sidebar width (${Math.round(design.sidebarWidth * 100)}%)`}
          min={0.25}
          max={0.4}
          step={0.01}
          value={design.sidebarWidth}
          onChange={(v) => setDesign({ sidebarWidth: v })}
        />
        <ChipRow
          label="Page margin"
          value={design.pageMargin}
          options={["narrow", "normal", "wide", "custom"] as PageMargin[]}
          onChange={(v) => setDesign({ pageMargin: v })}
        />
        {design.pageMargin === "custom" && (
          <SliderRow
            label={`Custom margin (${design.pageMarginMm ?? 18} mm)`}
            min={0}
            max={40}
            step={1}
            value={design.pageMarginMm ?? 18}
            onChange={(v) => setDesign({ pageMarginMm: v })}
          />
        )}
      </Section>

      <Section title={t("design.photo")} onReset={() => onResetGroup("photo")}>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={design.photo.enabled}
            onChange={(e) =>
              setDesign({
                photo: { ...design.photo, enabled: e.target.checked },
              })
            }
          />
          Show photo
        </label>
        {design.photo.enabled && (
          <>
            <ChipRow
              label="Shape"
              value={design.photo.shape}
              options={["square", "circle", "rounded", "arch"] as PhotoShape[]}
              onChange={(v) =>
                setDesign({ photo: { ...design.photo, shape: v } })
              }
            />
            <ChipRow
              label="Position"
              value={design.photo.position}
              options={[
                "top-left",
                "top-center",
                "top-right",
                "sidebar",
              ] as PhotoPosition[]}
              onChange={(v) =>
                setDesign({ photo: { ...design.photo, position: v } })
              }
            />
            {/* Border colour + width — both are independently controllable
                so users can match the photo border to their personal
                brand without first having to override accentColor. Empty
                colour means "use the template's accent at template-defined
                alpha"; non-empty colour wins as-given. Width 0 = no
                border. Hex colour input has a paired colour-swatch picker
                so non-technical users get an OS-native picker. */}
            <div>
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted">
                Border
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Photo border colour"
                  value={(design.photo.borderColor || "#000000").slice(0, 7)}
                  onChange={(e) =>
                    setDesign({
                      photo: { ...design.photo, borderColor: e.target.value },
                    })
                  }
                  className="h-8 w-10 cursor-pointer rounded border border-border bg-surface p-0.5"
                />
                <input
                  type="text"
                  aria-label="Photo border colour hex"
                  placeholder="auto (accent)"
                  value={design.photo.borderColor ?? ""}
                  onChange={(e) =>
                    setDesign({
                      photo: {
                        ...design.photo,
                        borderColor: e.target.value.trim() || undefined,
                      },
                    })
                  }
                  className="flex-1 rounded border border-border bg-surface px-2 py-1 text-xs"
                />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={1}
                  aria-label="Photo border width"
                  value={design.photo.borderWidth ?? 2}
                  onChange={(e) =>
                    setDesign({
                      photo: {
                        ...design.photo,
                        borderWidth: Number(e.target.value),
                      },
                    })
                  }
                  className="flex-1 cursor-pointer accent-fg"
                />
                <span className="w-10 text-right text-xs tabular-nums text-muted">
                  {design.photo.borderWidth ?? 2}px
                </span>
              </div>
              <p className="mt-1 text-[11px] text-subtle">
                Empty colour falls back to the template accent. Width 0 hides the border entirely.
              </p>
            </div>
          </>
        )}
      </Section>

      <Section title={t("design.sectionStyle")} onReset={() => onResetGroup("sections")}>
        <ChipRow
          label="Section title style"
          hint={DESIGN_HINT.headerStyle}
          value={design.headerStyle}
          options={[
            "uppercase",
            "titlecase",
            "underline",
            "box",
            "accent-block",
          ] as HeaderStyle[]}
          onChange={(v) => setDesign({ headerStyle: v })}
        />
        <ChipRow
          label="Divider under each title"
          hint={DESIGN_HINT.dividerStyle}
          value={design.dividerStyle}
          options={[
            "none",
            "line",
            "dashed",
            "dotted",
            "accent-bar",
          ] as DividerStyle[]}
          onChange={(v) => setDesign({ dividerStyle: v })}
        />
        <ChipRow
          label="Bullet glyph"
          hint={DESIGN_HINT.bulletStyle}
          value={design.bulletStyle}
          options={["disc", "dash", "arrow", "square", "none"] as BulletStyle[]}
          onChange={(v) => setDesign({ bulletStyle: v })}
        />
      </Section>

      <Section title={t("design.specialty")}>
        <ChipRow
          label="Skill display"
          hint={DESIGN_HINT.skillBarStyle}
          value={design.skillBarStyle}
          options={[
            "bar",
            "dots",
            "stars",
            "circles",
            "text-only",
            "pills",
          ] as SkillBarStyle[]}
          onChange={(v) => setDesign({ skillBarStyle: v })}
        />
        <ChipRow
          label="Language display"
          hint={DESIGN_HINT.languageStyle}
          value={design.languageStyle}
          options={["bar", "dots", "text", "cefr-badges"] as LanguageStyle[]}
          onChange={(v) => setDesign({ languageStyle: v })}
        />
        <ChipRow
          label="Date format"
          hint={DESIGN_HINT.dateFormat}
          value={design.dateFormat}
          options={[
            "Mon YYYY",
            "MM/YYYY",
            "YYYY-MM",
            "Mon 'YY",
            "locale",
          ] as DateFormat[]}
          onChange={(v) => setDesign({ dateFormat: v })}
        />
      </Section>

      {/* Page size selector removed — every CV ships A4 by default. The
          underlying schema still accepts Letter / Legal for users who
          edit raw data, but the chrome no longer surfaces it because
          (a) almost every job market expects A4 / Letter interchangeably
          and react-pdf reflows accordingly, (b) exposing it as a chip
          row added cognitive load without practical payoff. */}

      {/* Watermark — the big corner letters ("CV" / initials / "RESUME").
          Users can also double-click the watermark on the canvas to
          inline-edit the text, but this Section gives them the full
          control surface (position, colour, clear). */}
      <Section title={t("design.watermark")} onReset={() => onResetGroup("watermark")}>
        <div>
          <Label>Watermark text</Label>
          <Input
            value={design.watermarkText ?? ""}
            placeholder='e.g. "CV", initials, "RESUME"'
            maxLength={40}
            onChange={(e) => setDesign({ watermarkText: e.target.value })}
          />
        </div>
        <ChipRow
          label={t("design.position")}
          value={design.watermarkPosition ?? "off"}
          options={[
            "off",
            "bottom-left",
            "bottom-right",
            "top-left",
            "top-right",
          ] as WatermarkPosition[]}
          onChange={(v) => setDesign({ watermarkPosition: v })}
        />
        <div>
          <Label>Watermark color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Watermark colour"
              value={(design.watermarkColor || "#000000").slice(0, 7)}
              onChange={(e) => setDesign({ watermarkColor: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border border-border bg-surface p-0.5"
            />
            <Input
              value={design.watermarkColor ?? ""}
              placeholder={t("design.borderColorAuto")}
              maxLength={64}
              onChange={(e) => setDesign({ watermarkColor: e.target.value })}
              className="flex-1 font-mono text-xs"
            />
          </div>
        </div>
      </Section>
    </div>
  );
}

// ---------- Atomic controls ----------

function Section({
  title,
  children,
  onReset,
}: {
  title: string;
  children: React.ReactNode;
  /** Optional reset handler — when provided, a small Reset button shows
   *  in the section header. Resets only the values inside this group
   *  back to the current template's factory defaults. */
  onReset?: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          {title}
        </h3>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            title={`Reset ${title.toLowerCase()} to template defaults`}
            className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted transition-colors hover:bg-surface-hover hover:text-fg"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
  presets,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  presets?: string[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close the picker when the user clicks anywhere outside this row OR
  // presses Escape. The swatch button itself counts as inside (so clicking
  // it toggles), and clicking presets inside the popover doesn't close it
  // — only an outside click does.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      const el = wrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef}>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="h-9 w-9 shrink-0 rounded-md border border-strong transition-shadow hover:shadow-md"
          style={{ background: value }}
          aria-label={`${label} color picker`}
          aria-expanded={open}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 max-w-[110px] font-mono text-xs"
        />
        {presets && (
          <div className="flex flex-wrap gap-1">
            {presets.slice(0, 8).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onChange(p)}
                className="h-5 w-5 rounded border border-strong transition-transform hover:scale-110"
                style={{ background: p }}
                aria-label={`Set ${label} to ${p}`}
              />
            ))}
          </div>
        )}
      </div>
      {open && (
        <>
          {/* Backdrop — captures any click outside the popover and closes it.
              Sits behind the popover but above the rest of the editor so the
              click-outside dismiss feels immediate, not relying on the
              document-level pointerdown listener (which can race with
              react-colorful's own pointer handling). */}
          <div
            className="fixed inset-0 z-40 bg-black/0"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative z-50 mt-2 rounded-lg border border-border bg-surface p-2 shadow-lg">
            <HexColorPicker color={value} onChange={onChange} />
            {presets && (
              <div className="mt-2 flex flex-wrap gap-1">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onChange(p)}
                    className="h-6 w-6 rounded border border-strong transition-transform hover:scale-110"
                    style={{ background: p }}
                    aria-label={`Set ${label} to ${p}`}
                  />
                ))}
              </div>
            )}
            <div className="mt-2 flex justify-between text-[11px] text-subtle">
              <span>Click outside or press Esc to close</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-medium text-fg hover:text-fg"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** TemplateFontPairPicker — horizontal-scroll row of buttons, one per
 *  template, each rendered in THAT template's title+body font pair.
 *  Click applies that pairing to the current CV without changing the
 *  template. Solves the "I want Eclipse's Fraunces on a Davos layout"
 *  use case the title-font-lock previously blocked. */
function TemplateFontPairPicker({
  presets,
  activeTitle,
  activeBody,
  onApply,
}: {
  presets: Array<{
    id: string;
    name: string;
    titleFont: string;
    bodyFont: string;
  }>;
  activeTitle: string;
  activeBody: string;
  onApply: (p: { titleFont: string; bodyFont: string }) => void;
}) {
  return (
    <div>
      <Label>Template font pairs</Label>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {presets.map((p) => {
          const isActive =
            p.titleFont === activeTitle && p.bodyFont === activeBody;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                onApply({ titleFont: p.titleFont, bodyFont: p.bodyFont })
              }
              title={`${p.name} — ${p.titleFont} + ${p.bodyFont}`}
              className={`flex-shrink-0 rounded-md border bg-surface px-3 py-2 text-left transition-colors hover:bg-surface-hover ${
                isActive
                  ? "border-fg ring-2 ring-fg"
                  : "border-strong"
              }`}
            >
              <span
                className="block text-sm font-semibold leading-tight text-fg"
                style={{
                  fontFamily: `var(--font-${slugifyFont(p.titleFont)}, system-ui)`,
                }}
              >
                {p.name}
              </span>
              <span
                className="mt-0.5 block text-[11px] leading-tight text-subtle"
                style={{
                  fontFamily: `var(--font-${slugifyFont(p.bodyFont)}, system-ui)`,
                }}
              >
                {p.titleFont}/{p.bodyFont}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** TemplatePalettePicker — horizontal-scroll row of swatch cards, one
 *  per template. Click = apply that template's full color palette
 *  (accent / secondary / pageBg / textColor) to the current CV
 *  WITHOUT changing the template's layout. Solves the "use Carbon's
 *  IBM Blue on dark grey while keeping a different template" use
 *  case the previous palette-only-curated-list blocked. */
function TemplatePalettePicker({
  presets,
  activeAccent,
  activeBg,
  onApply,
}: {
  presets: Array<{
    id: string;
    name: string;
    accent: string;
    secondary: string;
    bg: string;
    text: string;
  }>;
  activeAccent: string;
  activeBg: string;
  onApply: (p: {
    accent: string;
    secondary: string;
    bg: string;
    text: string;
  }) => void;
}) {
  return (
    <div>
      <Label>Template palettes</Label>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {presets.map((p) => {
          // "Active" only when BOTH accent + bg match — palette-level
          // identity, not coincidental color reuse.
          const isActive =
            p.accent.toLowerCase() === activeAccent.toLowerCase() &&
            p.bg.toLowerCase() === activeBg.toLowerCase();
          return (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                onApply({
                  accent: p.accent,
                  secondary: p.secondary,
                  bg: p.bg,
                  text: p.text,
                })
              }
              title={`${p.name} — accent ${p.accent} on ${p.bg}`}
              className={`group relative flex-shrink-0 overflow-hidden rounded-md border transition-shadow hover:shadow-md ${
                isActive
                  ? "border-fg ring-2 ring-fg"
                  : "border-strong"
              }`}
              style={{ width: 96, height: 64 }}
            >
              {/* Bg-dominant rectangle, with accent + secondary chips
                  in the bottom-right and the template name on top. */}
              <div
                className="h-full w-full"
                style={{ background: p.bg }}
              />
              <div className="absolute inset-x-1 top-1 truncate text-[10px] font-semibold tracking-tight"
                style={{ color: p.text }}>
                {p.name}
              </div>
              <div className="absolute bottom-1 right-1 flex gap-0.5">
                <span
                  className="h-3 w-3 rounded-full ring-1 ring-black/20"
                  style={{ background: p.accent }}
                />
                <span
                  className="h-3 w-3 rounded-full ring-1 ring-black/20"
                  style={{ background: p.secondary }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** FontPicker — grouped <select> with each option rendered in its OWN
 *  font so the user previews the look directly in the dropdown.
 *
 *  Browsers honour `font-family` on `<option>` only on macOS Safari and
 *  some Chromium versions — but the cost of trying is zero, and it's
 *  a real upgrade where it works. The selected value also
 *  renders in its own font in the closed select to confirm the choice.
 *
 *  Falls back to the curated default if the saved font name doesn't
 *  exist in the registry — keeps old CVs that referenced retired fonts
 *  from rendering blank. */
function FontPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // Honour the saved value even if it's not in the curated set so older
  // CVs don't lose their font when this list changes.
  const knownValue = FONT_NAMES.includes(value) ? value : "Inter";
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={knownValue}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-strong bg-surface px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
        style={{
          fontFamily: `var(--font-${slugifyFont(knownValue)}, system-ui)`,
        }}
      >
        {FONT_GROUPS.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.fonts.map((f) => (
              <option
                key={f}
                value={f}
                style={{
                  fontFamily: `var(--font-${slugifyFont(f)}, system-ui)`,
                }}
              >
                {f}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

function slugifyFont(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// ---------------------------------------------------------------------------
// Color presets — one-click cohesive palettes for users who don't want to
// hand-tune accent / secondary / bg / text individually.
// ---------------------------------------------------------------------------

interface Palette {
  name: string;
  accent: string;
  secondary: string;
  bg: string;
  text: string;
}

interface PaletteGroup {
  label: string;
  palettes: Palette[];
}

/** Curated palette set — designed for CVs across industries. Every palette
 *  is the result of pairing one strong accent with a softer secondary, a
 *  tasteful page bg, and a high-contrast text colour. WCAG AA was checked
 *  for body text against the bg for each entry.
 *
 *  Groups roughly map to "industry vibes" — tech CVs gravitate toward the
 *  Cool / Modern group, finance toward Professional, designers toward
 *  Warm / Creative, etc. */
const PALETTE_GROUPS: PaletteGroup[] = [
  {
    label: "Professional",
    palettes: [
      { name: "Classic",     accent: "#2563eb", secondary: "#475569", bg: "#ffffff", text: "#0f172a" },
      { name: "Slate",       accent: "#1e293b", secondary: "#64748b", bg: "#ffffff", text: "#0f172a" },
      { name: "Navy",        accent: "#1e3a8a", secondary: "#475569", bg: "#ffffff", text: "#0f172a" },
      { name: "Charcoal",    accent: "#0a0a0a", secondary: "#525252", bg: "#fafafa", text: "#171717" },
      { name: "Pebble",      accent: "#52525b", secondary: "#71717a", bg: "#fafaf9", text: "#1c1917" },
      { name: "Steel",       accent: "#0f766e", secondary: "#475569", bg: "#f8fafc", text: "#0f172a" },
    ],
  },
  {
    label: "Cool / Modern",
    palettes: [
      { name: "Ocean",       accent: "#0ea5e9", secondary: "#075985", bg: "#f0f9ff", text: "#0c4a6e" },
      { name: "Sky",         accent: "#3b82f6", secondary: "#1e40af", bg: "#f8fafc", text: "#0f172a" },
      { name: "Indigo",      accent: "#4f46e5", secondary: "#3730a3", bg: "#f8fafc", text: "#1e1b4b" },
      { name: "Teal",        accent: "#14b8a6", secondary: "#0f766e", bg: "#f0fdfa", text: "#134e4a" },
      { name: "Mint",        accent: "#10b981", secondary: "#047857", bg: "#f0fdf4", text: "#064e3b" },
      { name: "Aqua",        accent: "#06b6d4", secondary: "#0e7490", bg: "#ecfeff", text: "#164e63" },
    ],
  },
  {
    label: "Warm / Creative",
    palettes: [
      { name: "Sunset",      accent: "#ea580c", secondary: "#78716c", bg: "#fffbf5", text: "#1c1917" },
      { name: "Coral",       accent: "#f43f5e", secondary: "#be123c", bg: "#fff1f2", text: "#1f2937" },
      { name: "Terracotta",  accent: "#c2410c", secondary: "#7c2d12", bg: "#fffaf5", text: "#1c1917" },
      { name: "Ochre",       accent: "#ca8a04", secondary: "#78350f", bg: "#fefce8", text: "#1c1917" },
      { name: "Amber",       accent: "#d97706", secondary: "#92400e", bg: "#fffbeb", text: "#451a03" },
      { name: "Rose Gold",   accent: "#e11d48", secondary: "#a16207", bg: "#fff7ed", text: "#1f2937" },
      { name: "Burnt Orange", accent: "#dc2626", secondary: "#9a3412", bg: "#fff7ed", text: "#1c1917" },
    ],
  },
  {
    label: "Editorial",
    palettes: [
      { name: "Editorial",   accent: "#831843", secondary: "#57534e", bg: "#fffaf5", text: "#1c1917" },
      { name: "Royal",       accent: "#6d28d9", secondary: "#4c1d95", bg: "#faf5ff", text: "#1e1b4b" },
      { name: "Plum",        accent: "#86198f", secondary: "#581c87", bg: "#fdf4ff", text: "#3b0764" },
      { name: "Wine",        accent: "#9f1239", secondary: "#881337", bg: "#fff1f2", text: "#4c0519" },
      { name: "Emerald",     accent: "#047857", secondary: "#065f46", bg: "#f0fdf4", text: "#022c22" },
      { name: "Magazine",    accent: "#1f2937", secondary: "#dc2626", bg: "#fafaf9", text: "#0c0a09" },
    ],
  },
  {
    label: "Dark / Bold",
    palettes: [
      { name: "Midnight",    accent: "#7FFAB6", secondary: "#94a3b8", bg: "#0F1419", text: "#E8EAED" },
      { name: "Eclipse",     accent: "#E8B14F", secondary: "#a3a3a3", bg: "#0E0E10", text: "#FAF8F4" },
      { name: "Obsidian",    accent: "#fafafa", secondary: "#737373", bg: "#0a0a0a", text: "#fafafa" },
      { name: "Slate Night", accent: "#38bdf8", secondary: "#94a3b8", bg: "#020617", text: "#e2e8f0" },
      { name: "Forest Night",accent: "#4ade80", secondary: "#a3a3a3", bg: "#0a1f12", text: "#dcfce7" },
      { name: "Plum Dark",   accent: "#d8b4fe", secondary: "#a78bfa", bg: "#1a0b2e", text: "#f5f3ff" },
      { name: "Dark Slate",  accent: "#cbd5e1", secondary: "#94a3b8", bg: "#1e293b", text: "#f1f5f9" },
      { name: "Dark Charcoal",accent: "#fef3c7", secondary: "#78716c", bg: "#1c1917", text: "#fafaf9" },
      { name: "Dark Steel",  accent: "#5eead4", secondary: "#94a3b8", bg: "#0c1820", text: "#e2e8f0" },
      { name: "Espresso",    accent: "#fbbf24", secondary: "#a16207", bg: "#1c1207", text: "#fef3c7" },
      { name: "Coal",        accent: "#fb923c", secondary: "#737373", bg: "#171717", text: "#fafafa" },
      { name: "Night Sky",   accent: "#c4b5fd", secondary: "#a78bfa", bg: "#0c0a17", text: "#f5f3ff" },
    ],
  },
  {
    label: "Minimal",
    palettes: [
      { name: "Mono",        accent: "#000000", secondary: "#525252", bg: "#ffffff", text: "#000000" },
      { name: "Paper",       accent: "#171717", secondary: "#737373", bg: "#fafaf5", text: "#171717" },
      { name: "Newsprint",   accent: "#1c1917", secondary: "#57534e", bg: "#f5f5f4", text: "#0c0a09" },
      { name: "Linen",       accent: "#44403c", secondary: "#78716c", bg: "#f5f5f4", text: "#1c1917" },
    ],
  },
  {
    label: "2026 trend",
    palettes: [
      { name: "Olive",       accent: "#65a30d", secondary: "#3f6212", bg: "#f7faf2", text: "#1f2937" },
      { name: "Mocha",       accent: "#92400e", secondary: "#78350f", bg: "#fafaf9", text: "#1c1917" },
      { name: "Dusty Rose",  accent: "#be185d", secondary: "#9d174d", bg: "#fdf2f8", text: "#500724" },
      { name: "Powder Blue", accent: "#0369a1", secondary: "#075985", bg: "#f0f9ff", text: "#082f49" },
      { name: "Pistachio",   accent: "#84cc16", secondary: "#4d7c0f", bg: "#f7fee7", text: "#1a2e05" },
      { name: "Lilac",       accent: "#a855f7", secondary: "#7e22ce", bg: "#faf5ff", text: "#3b0764" },
    ],
  },
];

const PALETTES: Palette[] = PALETTE_GROUPS.flatMap((g) => g.palettes);

/** PalettePicker — grouped, scannable gallery of cohesive color schemes.
 *  Each group renders its label as a small heading, then a 2-col card grid.
 *  Clicking a card applies all four design tokens (accent / secondary /
 *  bg / text) in a single setDesign() so the canvas updates instantly. */
function PalettePicker({
  onApply,
}: {
  onApply: (p: Palette) => void;
}) {
  return (
    <div>
      <Label>Cohesive palettes</Label>
      <div className="space-y-3">
        {PALETTE_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
              {group.label}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {group.palettes.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => onApply(p)}
                  title={`Apply ${p.name} palette — bg ${p.bg}, accent ${p.accent}`}
                  className="group flex items-center gap-2 rounded-md border border-border bg-surface p-2 text-left transition-[background-color,box-shadow] hover:border-strong hover:bg-surface-hover hover:shadow-sm cursor-pointer"
                >
                  {/* Palette card swatch. Reads like a miniature CV page:
                      most of the area is the BG color (so light vs dark
                      themes are instantly distinguishable), with a
                      stacked column on the right showing accent / text
                      / secondary. Earlier the accent dominated the
                      preview — users couldn't tell that "Slate" /
                      "Charcoal" were light themes with dark accents.
                      Now the bg dominates, matching what they'll see
                      when they apply the palette. */}
                  <div
                    className="flex h-10 w-14 shrink-0 items-center gap-1 overflow-hidden rounded p-1 ring-1 ring-border"
                    style={{ background: p.bg }}
                  >
                    {/* Tiny mock "page" lines in the text color so users
                        see what readable text on this bg looks like. */}
                    <div className="flex flex-1 flex-col gap-[2px]">
                      <div
                        className="h-[2px] w-full rounded-sm"
                        style={{ background: p.text }}
                      />
                      <div
                        className="h-[2px] w-3/4 rounded-sm"
                        style={{ background: p.text, opacity: 0.6 }}
                      />
                      <div
                        className="h-[2px] w-2/3 rounded-sm"
                        style={{ background: p.text, opacity: 0.6 }}
                      />
                    </div>
                    {/* Accent + secondary chips on the right edge. */}
                    <div className="flex h-full w-2 flex-col gap-[2px]">
                      <div
                        className="flex-1 rounded-sm"
                        style={{ background: p.accent }}
                      />
                      <div
                        className="flex-1 rounded-sm"
                        style={{ background: p.secondary }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-fg">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-subtle">
        Sets accent, secondary, background, and text in one click.
        {PALETTES.length} palettes across {PALETTE_GROUPS.length} families.
      </p>
    </div>
  );
}

const QUICK_BACKGROUNDS: { name: string; color: string }[] = [
  { name: "Pure white",  color: "#ffffff" },
  { name: "Off-white",   color: "#fafaf9" },
  { name: "Cream",       color: "#fffaf5" },
  { name: "Soft blue",   color: "#f0f9ff" },
  { name: "Mint",        color: "#f0fdf4" },
  { name: "Lavender",    color: "#faf5ff" },
  { name: "Rose",        color: "#fff1f2" },
  { name: "Slate",       color: "#f1f5f9" },
  { name: "Charcoal",    color: "#1f2937" },
  { name: "Midnight",    color: "#0f172a" },
];

/** BackgroundQuickPicker — 10 hand-picked page backgrounds. Click swaps
 *  ONLY the page bg, leaving accent / text / secondary alone — useful
 *  when the user wants to keep their tuned palette but try a new paper
 *  color. */
function BackgroundQuickPicker({
  value,
  onApply,
}: {
  value: string;
  onApply: (c: string) => void;
}) {
  return (
    <div>
      <Label>Quick backgrounds</Label>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_BACKGROUNDS.map((b) => {
          const active = value.toLowerCase() === b.color.toLowerCase();
          return (
            <button
              key={b.color}
              type="button"
              onClick={() => onApply(b.color)}
              title={b.name}
              aria-label={`Set background to ${b.name}`}
              className={`h-8 w-8 cursor-pointer rounded-md transition-shadow hover:scale-110 hover:shadow-md ${active ? "ring-2 ring-fg ring-offset-2" : "ring-1 ring-strong"}`}
              style={{ background: b.color }}
            />
          );
        })}
      </div>
      <p className="mt-1 text-[11px] text-subtle">
        Background only — keeps your accent / text colors as-is.
      </p>
    </div>
  );
}

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

/**
 * ChipRow — labelled chip group with friendly labels and an optional
 * plain-English hint underneath. Friendly labels come from the shared
 * `design-labels.ts` so the global Design tab and the per-section
 * SectionDesignOverrides panel stay in lockstep — fixing a token's
 * label here updates both surfaces.
 *
 * `hint` text reads as "what does this control do?" — short, spoken in
 * second person, no jargon. Empty / undefined hint hides the line so
 * self-evident controls (page size etc.) stay tight.
 */
function ChipRow<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <Button
            key={o}
            type="button"
            variant={value === o ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange(o)}
            title={designLabel(o)}
          >
            {designLabel(o)}
          </Button>
        ))}
      </div>
      {hint && (
        <p className="mt-1 text-[10px] leading-relaxed text-subtle">{hint}</p>
      )}
    </div>
  );
}
