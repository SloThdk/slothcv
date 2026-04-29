/**
 * Landing page — SlothCV marketing front door.
 *
 * Mobile-first hero, then a feature trio, then a clickable template gallery.
 * Every clickable card is a real <Link> to /dashboard?template=<id>; the
 * AuthGate inside /dashboard either bounces unauthenticated visitors to
 * /login or auto-creates a CV with the chosen template and pushes the user
 * into the editor.
 *
 * All copy comes through `useLanguage().t(...)` so DA/EN flips in one toggle.
 * All chrome surfaces use CSS variables so dark / light theme flips
 * everywhere at once.
 */

"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileDown,
  Lock,
  Sparkles,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { TEMPLATES } from "@/templates/registry";
import { TemplatePreview } from "@/components/editor/template-preview";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  EASE,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";

/**
 * Hero entrance variants — separate from the global staggerItem so the
 * landing's first impression has its own pacing. Generic body items use
 * 250 ms / 10 px rise; hero items use 600 ms / 24 px rise. The longer
 * duration + expo ease produces the "luxurious settle" feel the user
 * asked for.
 */
const HERO_ITEM = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE.out },
  },
};

/** Headline gets an extra 0.98 → 1 scale so its emphasis is unmistakable. */
const HERO_HEADLINE = {
  initial: { opacity: 0, y: 28, scale: 0.985 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: EASE.out },
  },
};

export default function LandingPage() {
  const { t } = useLanguage();
  // Router is used by the template gallery cards. We deliberately route
  // programmatically instead of wrapping each card in a <Link>, because
  // the rendered <TemplatePreview> contains its own <a> tags for the
  // personal contact links — nesting them inside a Link's anchor causes
  // a hydration error ("<a> cannot be a descendant of <a>").
  const router = useRouter();
  // Refs + useInView for sections that should animate when scrolled into
  // view (feature trio + template gallery). once:true so the animation
  // runs exactly the first time the section enters the viewport. margin
  // pulls the trigger 80px before the section's top edge so the user
  // sees motion completing as the section settles, not after.
  const featuresRef = useRef<HTMLDivElement>(null);
  const featuresInView = useInView(featuresRef, {
    once: true,
    margin: "0px 0px -80px 0px",
  });
  const galleryRef = useRef<HTMLDivElement>(null);
  const galleryInView = useInView(galleryRef, {
    once: true,
    margin: "0px 0px -80px 0px",
  });

  return (
    <div className="bg-[color:var(--color-bg)] text-[color:var(--color-text)] transition-colors">
      {/* ---------------- Hero ----------------
          First-impression entrance: a 400ms fade+rise on every element
          so the headline + subhead + CTAs settle in sequence. Slightly
          slower than the rest of the site because hero is the moment
          the user decides whether they're staying. */}
      <section className="relative mx-auto max-w-6xl px-4 pt-10 pb-12 sm:pt-24 sm:pb-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_10%,rgba(15,23,42,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_10%,rgba(255,255,255,0.05),transparent_50%)]"
        />
        {/* Hero entrance — custom variants override the default staggerItem
            so this entrance feels MORE pronounced than the rest of the
            page (24 px rise, 600 ms duration, expo-out). The headline
            also gets a tiny scale-in (0.98 → 1) and a subtle filter:blur
            wipe so the typography reads as "settling" rather than
            "popping". Stagger spacing of 130 ms lets each element have
            its own moment without dragging the total too long. */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer(0.13, 0.05)}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.p
            variants={HERO_ITEM}
            className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1 text-xs font-medium text-[color:var(--color-text-muted)]"
          >
            <Sparkles className="h-3 w-3" />
            {t("landing.eyebrow")}
          </motion.p>
          <motion.h1
            variants={HERO_HEADLINE}
            className="text-balance text-3xl font-semibold tracking-tight text-[color:var(--color-text)] sm:text-5xl md:text-6xl"
          >
            {t("landing.headlineA")}
            <br />
            <span className="text-[color:var(--color-text-muted)]">
              {t("landing.headlineB")}
            </span>
          </motion.h1>
          <motion.p
            variants={HERO_ITEM}
            className="mx-auto mt-6 max-w-xl text-pretty text-base text-[color:var(--color-text-muted)] sm:text-lg"
          >
            {t("landing.body")}
          </motion.p>
          <motion.div
            variants={HERO_ITEM}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                {t("landing.startBuilding")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                {t("landing.signIn")}
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ---------------- Feature trio ----------------
          Staggers on scroll-into-view via useInView. Trigger fires once
          per page load — the user shouldn't see the same animation
          again if they scroll back up. */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:pb-20">
        <motion.div
          ref={featuresRef}
          variants={staggerContainer(0.08)}
          initial="initial"
          animate={featuresInView ? "animate" : "initial"}
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <FeatureTile
            icon={FileDown}
            title={t("features.pdfTitle")}
            body={t("features.pdfBody")}
          />
          <FeatureTile
            icon={Lock}
            title={t("features.dataTitle")}
            body={t("features.dataBody")}
          />
          <FeatureTile
            icon={CheckCircle2}
            title={t("features.watermarkTitle")}
            body={t("features.watermarkBody")}
          />
        </motion.div>
      </section>

      {/* ---------------- Template gallery ---------------- */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--color-text)] sm:text-3xl">
              {t("templates.title")}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
              {TEMPLATES.length} {t("templates.body")}
            </p>
          </div>
        </div>
        {/* Gallery cascade — 30ms apart, slightly faster than the
            features stagger because there are many more cards. */}
        <motion.div
          ref={galleryRef}
          variants={staggerContainer(0.03)}
          initial="initial"
          animate={galleryInView ? "animate" : "initial"}
          // grid-cols-1 is load-bearing on mobile: without an explicit track,
          // the implicit grid sizes columns to content, and the 794px-wide
          // (A4 @96dpi) template stage inside each TemplatePreview blows out
          // the column past the 375px viewport — even with overflow-hidden
          // clipping the visual, the grid track is still 794px so users
          // get horizontal page-scroll. `minmax(0, 1fr)` (what Tailwind's
          // grid-cols-1 expands to) breaks that inflation.
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {TEMPLATES.map((tpl) => (
            <motion.div
              key={tpl.id}
              variants={staggerItem}
              // Hover lift via Framer transform so the underlying CSS
              // class rules don't fight the entrance translate. Pure
              // transform — no layout impact.
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.2, ease: EASE.out }}
            >
              {/* Card uses <button> instead of <Link> because the inner
                  <TemplatePreview> emits <a> elements for the personal
                  contact links, and nested anchors are an HTML invariant
                  that React flags as a hydration error. The pointer-events-
                  none on the preview wrapper stops the inner anchors from
                  intercepting clicks — the whole card routes via onClick. */}
              <button
                type="button"
                onClick={() => router.push(`/dashboard?template=${tpl.id}`)}
                aria-label={tpl.name}
                className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-left shadow-sm transition-shadow duration-200 hover:border-[color:var(--color-border-strong)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2 cursor-pointer"
              >
                <div className="pointer-events-none border-b border-[color:var(--color-border)]">
                  <TemplatePreview id={tpl.id} />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-semibold text-[color:var(--color-text)]">
                      {tpl.name}
                    </h3>
                    <span className="text-xs font-medium text-[color:var(--color-text-subtle)] transition-colors group-hover:text-[color:var(--color-text)]">
                      {t("templates.use")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
                    {tpl.blurb}
                  </p>
                </div>
              </button>
            </motion.div>
          ))}
        </motion.div>
        <div className="mt-12 flex justify-center">
          <Link href="/dashboard">
            <Button size="lg">
              {t("templates.openDashboard")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

/** FeatureTile — wraps the static feature copy in a motion.div so the
 *  parent staggerContainer can drive its entrance. Hover lift comes from
 *  whileHover (transform-only so it doesn't fight the entrance variant
 *  the way the previous CSS hover:-translate-y-px did). */
function FeatureTile({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: EASE.out }}
      className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 transition-shadow duration-200 hover:border-[color:var(--color-border-strong)] hover:shadow-md"
    >
      <Icon className="h-5 w-5 text-[color:var(--color-text)]" />
      <h3 className="mt-3 text-sm font-semibold text-[color:var(--color-text)]">
        {title}
      </h3>
      <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">{body}</p>
    </motion.div>
  );
}
