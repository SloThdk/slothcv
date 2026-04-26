/**
 * UrlInput — auto-growing textarea-as-input for URL fields.
 *
 * Why a textarea, not an `<input>`? Browsers scroll long URLs horizontally
 * inside `<input>`, so the user only sees ~30 characters even when the
 * actual value is much longer. Switching to a `<textarea rows={1}>` with
 * `field-sizing: content` makes the control GROW with its content — the
 * full URL stays visible, the surrounding container reflows to make room.
 *
 * On top of that we add lightweight URL validation. Anything obviously
 * malformed (spaces, no dot, dangerous schemes) marks the field as
 * invalid — red ring + a small helper line — without blocking the user
 * from typing. Save still happens; the warning is only a hint.
 *
 * `field-sizing: content` works in Chrome 123+, Edge 123+, Safari 17.4+.
 * For older browsers a small JS fallback resizes via scrollHeight.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface Props
  extends Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    "rows" | "style"
  > {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** Show validation state. Defaults to true for the URL flavor. */
  validate?: boolean;
}

/**
 * Validate a URL the way slothcv accepts them. Permissive on purpose —
 * users paste bare domains, mailto:, tel:, full URLs. We reject only
 * obviously broken entries.
 *
 * Returns null if valid, an error key (mapped to translation later) if not.
 */
export function validateUrl(raw: string): null | "url.empty" | "url.spaces" | "url.scheme" | "url.shape" {
  const v = raw.trim();
  if (!v) return null; // empty is fine — field is optional
  // No spaces allowed in URLs (whitespace breaks every parser).
  if (/\s/.test(v)) return "url.spaces";
  const lower = v.toLowerCase();
  // Reject dangerous schemes outright — same allowlist as the Zod
  // safeUrlSchema in lib/schemas/resume.ts.
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("file:"))
    return "url.scheme";
  // Allow common useful schemes.
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:")
  ) {
    return null;
  }
  // Bare domain: must have at least one dot and a TLD-like suffix.
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(v)) return null;
  // Otherwise it doesn't look like a URL.
  return "url.shape";
}

export const UrlInput = React.forwardRef<HTMLTextAreaElement, Props>(
  ({ className, value, onChange, validate = true, ...props }, ref) => {
    const inner = React.useRef<HTMLTextAreaElement | null>(null);
    React.useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement);

    // JS fallback for browsers without `field-sizing: content` support.
    // Resize the textarea to fit its scrollHeight on every change.
    React.useEffect(() => {
      const el = inner.current;
      if (!el) return;
      // Skip the JS path when the browser already auto-sizes.
      const supportsFieldSizing =
        typeof CSS !== "undefined" && CSS.supports?.("field-sizing", "content");
      if (supportsFieldSizing) return;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }, [value]);

    const err = validate ? validateUrl(value) : null;
    const messageById: Record<string, string> = {
      "url.spaces": "URLs can't contain spaces.",
      "url.scheme": "That URL scheme isn't allowed.",
      "url.shape": "That doesn't look like a URL — try https://example.com",
      "url.empty": "",
    };

    return (
      <div className="w-full">
        <textarea
          ref={inner}
          rows={1}
          value={value}
          onChange={onChange}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          // `field-sizing: content` is the native auto-grow CSS — no JS,
          // no jank. Inline so we don't need a Tailwind utility for it.
          style={{ fieldSizing: "content" } as React.CSSProperties}
          className={cn(
            "block w-full resize-none rounded-md border bg-surface px-3 py-2 text-base text-fg placeholder:text-subtle transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            // Allow long URLs to wrap visually instead of clipping or
            // scrolling horizontally. Word-break is the lever.
            "break-all whitespace-pre-wrap",
            // Validation state.
            err
              ? "border-red-500 focus-visible:ring-red-500/40"
              : "border-border hover:border-strong",
            className,
          )}
          {...props}
        />
        {err && (
          <p className="mt-1 text-[11px] text-red-600">
            {messageById[err]}
          </p>
        )}
      </div>
    );
  },
);
UrlInput.displayName = "UrlInput";
