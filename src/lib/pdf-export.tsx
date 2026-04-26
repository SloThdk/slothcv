/**
 * Client-side PDF export.
 *
 * Strategy: lazy-load `@react-pdf/renderer` only when the user clicks Export.
 * The library is heavy (>500KB gzip) and we don't want it on the initial
 * editor bundle.
 *
 * The PDF document mirrors the DOM template visually but is built with
 * react-pdf primitives (Document, Page, Text, View, StyleSheet). We map the
 * `TemplateId` to one of two PDF layouts (sidebar or single-column) plus a
 * shared body — close enough for v1.
 */

"use client";

import type { ResumeData } from "@/types/resume";

/**
 * Generate the PDF, then trigger a browser download.
 * Filename is derived from the CV title; non-safe chars → underscores.
 */
export async function exportPdf(
  data: ResumeData,
  rawTitle: string,
): Promise<void> {
  // Dynamic imports — keeps initial bundle small.
  const [{ pdf }, { ResumePdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./pdf-template"),
  ]);

  const blob = await pdf(<ResumePdf data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFilename(rawTitle)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick — Safari occasionally races the download otherwise.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(s: string): string {
  return (
    (s || "resume")
      .replace(/[^a-z0-9-_ ]+/gi, "_")
      .replace(/\s+/g, "_")
      .slice(0, 60) || "resume"
  );
}
