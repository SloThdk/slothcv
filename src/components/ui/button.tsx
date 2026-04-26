/**
 * Button — a shadcn-flavoured button primitive.
 *
 * Hand-written instead of using the shadcn CLI so we don't pull in the
 * full `cmdk`/`tw-animate-css` graph for the Phase 1 surface. Variants
 * mirror the standard shadcn API so swapping in the CLI version later is
 * a one-file replace.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base styles. Theme-aware via CSS variables — auto-flips for dark mode.
  // `cursor-pointer` is explicit (not relying on the user agent) because
  // some browsers inherit `cursor: default` from a parent flex container
  // and the inheritance trumps the native `<button>` cursor on Windows
  // Chromium builds. Setting it here guarantees the hand cursor anywhere
  // a Button is rendered. Disabled state restores the not-allowed cursor.
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-120 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97] hover:-translate-y-px min-h-[44px]",
  {
    variants: {
      variant: {
        // Solid — primary CTA. Inverted bg/fg so it always pops against the
        // page background (dark in light mode, light in dark mode).
        default:
          "bg-[color:var(--color-text)] text-[color:var(--color-bg)] shadow-sm hover:opacity-90 hover:shadow-md active:opacity-100",
        // Outline — secondary CTA. Surface bg, fg text, themed border.
        outline:
          "border border-strong bg-surface text-fg shadow-xs hover:bg-surface-hover hover:shadow-md hover:border-fg active:bg-surface-hover",
        // Ghost — tertiary. Hover: subtle surface-hover tint.
        ghost:
          "text-fg hover:bg-surface-hover hover:shadow-sm active:bg-surface-hover",
        // Destructive — semantic red, kept stable across themes (red is red).
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-500 hover:shadow-md hover:shadow-red-900/30 active:bg-red-800",
        // Link — underlined text. No min-h, no transform.
        link: "text-fg underline-offset-4 hover:underline min-h-0 hover:translate-y-0 active:scale-100",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-10 px-3 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
