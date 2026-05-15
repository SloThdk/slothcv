/**
 * /editor segment layout — applies the full template-font palette
 * scoped to this route segment.
 *
 * Why this exists: the root layout (src/app/layout.tsx) only sets
 * the Inter font variable on <html> so the landing page's critical
 * path doesn't trigger the 8-woff2 @font-face cascade (Lighthouse
 * mobile audit on slothcv.pages.dev was at 53 / desktop 74 with
 * those fonts blocking LCP). The editor genuinely needs the full
 * font palette — that's the live preview the user is paying for —
 * so we re-apply the rest of the font variables HERE, on this
 * segment alone. Same trick for `/new` and `/dashboard`.
 *
 * Implementation note: this is a pass-through layout. We don't
 * render <html>/<body> (the root layout owns those); we just wrap
 * children in a div that adds the CSS-variable classes so descendants
 * resolve `var(--font-lora)` etc. correctly.
 */
import { NON_INTER_FONT_VARIABLE_CLASSES } from "@/lib/fonts/registry";

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={NON_INTER_FONT_VARIABLE_CLASSES}>{children}</div>;
}
