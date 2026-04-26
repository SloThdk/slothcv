/**
 * Landing page.
 *
 * Single-screen hero on mobile (390px target), with three placeholder
 * template cards below. The CTA points to /dashboard; middleware will bounce
 * anonymous visitors to /login first, so the same button works for both.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Phase 1 templates are visual placeholders only. Phase 2 will replace these
// with real, openable templates plus a "Use this template" CTA.
const TEMPLATES = [
  {
    name: "Minimal",
    accent: "from-neutral-100 to-neutral-200",
    description: "Clean, single-column. Lets the content speak.",
  },
  {
    name: "Modern",
    accent: "from-amber-50 to-orange-100",
    description: "Two-column with a confident accent bar.",
  },
  {
    name: "Editorial",
    accent: "from-emerald-50 to-teal-100",
    description: "Magazine-style with display typography.",
  },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-6xl">
            Free, beautiful CVs.
            <br />
            <span className="text-neutral-500">No signup walls, no watermarks.</span>
          </h1>
          <p className="mt-6 text-base text-neutral-600 sm:text-lg">
            Drag, drop, design. Export to PDF. Your work auto-saves so you can
            pick up exactly where you left off.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                Start building
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Template gallery (Phase 1 placeholders) */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Templates to start from
          </h2>
          <p className="text-sm text-neutral-500">
            More templates landing in Phase 2.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((tpl) => (
            <Card key={tpl.name} className="overflow-hidden">
              {/*
                Visual placeholder — gradient stand-in for an eventual
                generated preview thumbnail. aspect-[3/4] mimics A4-ish.
              */}
              <div
                className={`aspect-[3/4] w-full bg-gradient-to-br ${tpl.accent}`}
                aria-hidden
              />
              <CardContent className="pt-5">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {tpl.name}
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  {tpl.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
