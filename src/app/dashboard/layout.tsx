/**
 * /dashboard segment layout — applies the full template-font palette.
 *
 * Mirrors `/editor/layout.tsx`. The dashboard shows live thumbnails
 * of every CV the user owns; each thumbnail renders the template
 * with the template's actual font. See `/editor/layout.tsx` for the
 * full rationale.
 */
import { NON_INTER_FONT_VARIABLE_CLASSES } from "@/lib/fonts/registry";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={NON_INTER_FONT_VARIABLE_CLASSES}>{children}</div>;
}
