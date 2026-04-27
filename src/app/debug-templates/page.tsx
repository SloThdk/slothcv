/**
 * Local-dev-only debug route — renders every registered template with
 * its corresponding sample data so we can eyeball which ones render
 * correctly without going through the auth-gated editor.
 *
 * NOT a long-term feature. This file exists to bisect the per-template
 * rendering bugs Philip reported on 2026-04-27 ("many templates don't
 * load correctly"). Once the bugs are root-caused and the templates
 * are fixed, delete this file.
 */
"use client";

import { TemplateRenderer } from "@/templates/renderer";
import { TEMPLATES } from "@/templates/registry";
import { sampleResumeData } from "@/templates/sample-data";
import { TEMPLATE_IDS } from "@/types/resume";
import Link from "next/link";

export default function DebugTemplatesPage() {
  return (
    <div className="bg-neutral-100 p-6 text-neutral-900">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Template render audit</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Renders each of the {TEMPLATES.length} registered templates with
          its sample data. If a template card below is empty or wrong,
          that template's renderer or seed data is broken.
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {TEMPLATE_IDS.map((id) => {
          let data;
          let err: string | null = null;
          try {
            data = sampleResumeData(id);
          } catch (e) {
            err = e instanceof Error ? e.message : String(e);
          }
          return (
            <div
              key={id}
              className="overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs">
                <span className="font-mono font-semibold">{id}</span>
                <Link
                  className="text-blue-600 underline"
                  href={`/dashboard?template=${id}`}
                  target="_blank"
                >
                  open in flow
                </Link>
              </div>
              {err ? (
                <div className="p-4 text-sm text-red-600">SEED ERROR: {err}</div>
              ) : (
                <div
                  className="relative w-full overflow-hidden bg-white"
                  style={{ aspectRatio: "210 / 297" }}
                >
                  <div
                    className="pointer-events-none origin-top-left"
                    style={{ width: "793.7", transform: "scale(0.32)" }}
                  >
                    {data ? (
                      <TemplateRenderer
                        data={data}
                        fixedSize
                        skipOverlay
                      />
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
