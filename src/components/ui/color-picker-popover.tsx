/**
 * ColorPickerPopover — Photoshop-grade color picker for the editor.
 *
 * Three layers, in priority order of how they're typically used:
 *
 *   1. **Native EyeDropper API** (Chrome/Edge 95+, Opera) — picks a
 *      color from anywhere on the SCREEN, not just the document. The
 *      gold-standard Photoshop "I" tool. Feature-detected; the button
 *      hides on browsers that don't support it. The Eyedropper Specs
 *      WICG draft says the picker is OS-level and consequently exempt
 *      from the document's transform/zoom — wherever the user clicks
 *      lands the pixel.
 *
 *   2. **react-colorful HexColorPicker** — square SV picker + hue +
 *      hex input. Already in the bundle (used by design-tab.tsx).
 *
 *   3. **Recent colors** — last 16 picks, FIFO, persisted to
 *      `localStorage` so the user's palette survives reloads. Click a
 *      swatch to apply.
 *
 * Optional: `presets` for brand-canonical colors (the design-tab
 * accent presets, or a per-CV brand kit). Renders BELOW the recent
 * row so brand colors stay visually anchored.
 *
 * The popover is portal-free — it lives at the bottom of the trigger's
 * parent wrapper, with a fixed-positioned backdrop that captures
 * outside clicks. Same pattern design-tab uses; deduplicating into one
 * component once we've validated the toolshelf integration.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Pipette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RECENT_COLORS_KEY = "slothcv:recent-colors";
const RECENT_COLORS_MAX = 16;

/** Read the recent-colors list from localStorage. Defensive: returns
 *  empty array on parse error so a malformed entry doesn't crash the
 *  picker. */
function readRecentColors(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_COLORS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c): c is string => typeof c === "string" && /^#[0-9a-f]{3,8}$/i.test(c))
      .slice(0, RECENT_COLORS_MAX);
  } catch {
    return [];
  }
}

/** Push a new color to the front of the recent-colors list (dedup,
 *  cap at RECENT_COLORS_MAX) and persist to localStorage. */
function pushRecentColor(color: string): string[] {
  if (typeof window === "undefined") return [];
  if (!/^#[0-9a-f]{3,8}$/i.test(color)) return readRecentColors();
  const list = readRecentColors();
  const dedupe = list.filter((c) => c.toLowerCase() !== color.toLowerCase());
  const next = [color, ...dedupe].slice(0, RECENT_COLORS_MAX);
  try {
    window.localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(next));
  } catch {
    // localStorage may be unavailable (private mode); fall through.
  }
  return next;
}

/** Wrapped EyeDropper API call. Returns the picked sRGB hex on
 *  success, null on cancel / unsupported / error. */
async function pickWithEyedropper(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  // The API surface is `new window.EyeDropper().open()`. Not yet in
  // lib.dom.d.ts on older TS, so we cast through unknown.
  const w = window as unknown as {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
  };
  if (!w.EyeDropper) return null;
  try {
    const result = await new w.EyeDropper().open();
    return result.sRGBHex;
  } catch {
    // User pressed Esc / cancelled. Not an error worth surfacing.
    return null;
  }
}

interface Props {
  /** Hex color, e.g. "#0A66C2". The initial value of the picker. */
  value: string;
  onChange: (color: string) => void;
  /** Field label rendered above the swatch + hex input. */
  label: string;
  /** Optional brand / design preset palette to expose alongside recent. */
  presets?: string[];
}

export function ColorPickerPopover({ value, onChange, label, presets }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => readRecentColors());
  // EyeDropper feature detection happens once on mount — avoids a
  // window-access during SSR. The button is hidden when unsupported.
  const [supportsEyedropper, setSupportsEyedropper] = useState(false);
  useEffect(() => {
    setSupportsEyedropper(
      typeof window !== "undefined" &&
        typeof (window as unknown as { EyeDropper?: unknown }).EyeDropper ===
          "function",
    );
  }, []);

  // Click-outside + Esc-to-close. Mirrors design-tab.tsx's pattern so
  // the two pickers feel identical to the user.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
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

  // Whenever a new color is committed (via picker / hex input / preset
  // / eyedropper / recent), push it to the recent stack so the next
  // open shows it. Skipped while the user drags inside the SV square
  // to avoid spamming the recents with intermediate hues.
  function commit(color: string) {
    onChange(color);
    setRecent(pushRecentColor(color));
  }

  async function onPickFromScreen() {
    const picked = await pickWithEyedropper();
    if (picked) commit(picked);
  }

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
          title="Click to open color picker"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            // Push to recents only when the user FINISHES editing the
            // hex input — not on every keystroke. Keeps the recent
            // stack clean ("typed #0a66c2" should be one entry, not
            // 7).
            if (/^#[0-9a-f]{3,8}$/i.test(e.target.value)) {
              setRecent(pushRecentColor(e.target.value));
            }
          }}
          placeholder="#000000 or transparent"
          className="h-9 flex-1 font-mono text-xs"
        />
        {supportsEyedropper && (
          <button
            type="button"
            onClick={onPickFromScreen}
            className="h-9 w-9 shrink-0 rounded-md border border-border bg-surface text-muted hover:bg-surface-hover hover:text-fg"
            aria-label="Pick color from screen"
            title="Pick color from screen (Eyedropper)"
          >
            <Pipette className="mx-auto h-4 w-4" />
          </button>
        )}
      </div>
      {open && (
        <>
          {/* Backdrop — captures any click outside the popover and closes it.
              Same z-index ladder design-tab uses (40 backdrop, 50 popover). */}
          <div
            className="fixed inset-0 z-40 bg-black/0"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative z-50 mt-2 rounded-lg border border-border bg-surface p-2 shadow-lg">
            <HexColorPicker
              color={value && /^#[0-9a-f]{3,8}$/i.test(value) ? value : "#000000"}
              onChange={onChange}
              // Commit to recents on mouseup — reading from
              // react-colorful's `onChange` would push every
              // intermediate hue. We approximate "drag finished" by
              // listening for pointerup on the popover.
              onMouseUp={() => commit(value)}
            />
            {presets && presets.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Presets
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => commit(p)}
                      className="h-6 w-6 rounded border border-strong transition-transform hover:scale-110"
                      style={{ background: p }}
                      aria-label={`Set ${label} to ${p}`}
                      title={p}
                    />
                  ))}
                </div>
              </div>
            )}
            {recent.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Recent
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {recent.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => commit(p)}
                      className="h-6 w-6 rounded border border-strong transition-transform hover:scale-110"
                      style={{ background: p }}
                      aria-label={`Apply recent color ${p}`}
                      title={p}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="mt-2 flex justify-between text-[11px] text-subtle">
              <span>
                {supportsEyedropper
                  ? "Tip: pipette icon picks from anywhere on screen."
                  : "Click outside or press Esc to close."}
              </span>
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
