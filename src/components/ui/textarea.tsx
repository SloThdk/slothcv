/**
 * Textarea — minimal shadcn-style multiline input.
 *
 * Mirrors `Input` styling for consistency. Defaults to a 3-row height; pages
 * can override with `rows` or `className`.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 3, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "flex min-h-[88px] w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-fg placeholder:text-subtle transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2 hover:border-strong disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
