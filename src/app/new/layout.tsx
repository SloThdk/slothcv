/**
 * /new segment layout — applies the full template-font palette.
 *
 * Mirrors `/editor/layout.tsx`. The "create a new CV" flow renders
 * a real TemplatePreview for the selected template, which needs the
 * template's actual font; landing-page Inter fallback is not the
 * right behaviour here because the user is about to commit to a
 * design. See `/editor/layout.tsx` for the full rationale.
 */
import { NON_INTER_FONT_VARIABLE_CLASSES } from "@/lib/fonts/registry";

export default function NewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={NON_INTER_FONT_VARIABLE_CLASSES}>{children}</div>;
}
