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
  // Base: tap target meets the >=48px floor on mobile; focus ring is visible
  // for keyboard users; transition is fast enough to feel responsive.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[44px]",
  {
    variants: {
      variant: {
        default:
          "bg-neutral-900 text-neutral-50 hover:bg-neutral-800 active:bg-neutral-950",
        outline:
          "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 active:bg-neutral-200",
        ghost: "text-neutral-900 hover:bg-neutral-100 active:bg-neutral-200",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
        link: "text-neutral-900 underline-offset-4 hover:underline min-h-0",
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
