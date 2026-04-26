/**
 * Label — minimal label primitive. Encapsulates the "small uppercase tracking"
 * pattern used throughout the editor forms so it's centrally tweakable.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "block text-xs font-medium uppercase tracking-wider text-muted mb-1.5",
        className,
      )}
      {...props}
    />
  ),
);
Label.displayName = "Label";
