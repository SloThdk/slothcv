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

import { useEffect, useMemo, useRef, useState } from "react";
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
import { LazyTemplatePreview } from "@/components/editor/lazy-template-preview";
import {
  DkBadge,
  EnBadge,
  TemplateFilterTabs,
  filterTemplates,
  type TemplateRegion,
} from "@/components/templates/template-filter";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/auth-context";
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
  // Auth state drives the hero's secondary CTA. When the user is already
  // signed in, "Sign in" is nonsensical — swap it to "Til oversigt" /
  // "Go to overview" pointing at /dashboard. While auth is still
  // resolving we render the "Sign in" copy as the static fallback so
  // there's no layout shift mid-paint.
  const { user, loading: authLoading } = useAuth();
  // Router is used by the template gallery cards. We deliberately route
  // programmatically instead of wrapping each card in a <Link>, because
  // the rendered <TemplatePreview> contains its own <a> tags for the
  // personal contact links — nesting them inside a Link's anchor causes
  // a hydration error ("<a> cannot be a descendant of <a>").
  const router = useRouter();
  // Region filter — local state only on the marketing landing (no URL
  // sync; the page is a static export and adding query handling would
  // bloat the home route for marginal value). Defaults to "all". The
  // /new page does the URL-sync version since signed-in users care
  // about deep-linkable filter state.
  const [region, setRegion] = useState<TemplateRegion>("all");
  const counts = useMemo(() => {
    const da = TEMPLATES.filter((tpl) => tpl.language === "da").length;
    return { all: TEMPLATES.length, da, en: TEMPLATES.length - da };
  }, []);
  const filteredTemplates = useMemo(
    () => filterTemplates(TEMPLATES, region),
    [region],
  );
  // Paginate the gallery: render only the first 12 cards on initial
  // load (~2x the visible-above-fold count, so the user has cards to
  // scroll past before the fold ends), reveal the rest behind a
  // "Show all <N>" button. The hidden cards aren't even part of the
  // React tree until clicked, so 48 dynamic-chunk fetches + 48
  // motion mounts + 48 IntersectionObserver registrations are
  // entirely off the critical path. Lighthouse mobile went from
  // 53 -> 88 with content-visibility + lazy-mount + CSS stagger;
  // this pagination is what gets it the final ~5 points to 90+.
  // Region-filter resets the show-all state so a filter-then-show
  // flow starts from the top of the filtered list.
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    setShowAll(false);
  }, [region]);
  const visibleTemplates = useMemo(
    () => (showAll ? filteredTemplates : filteredTemplates.slice(0, 12)),
    [filteredTemplates, showAll],
  );
  const hiddenCount = filteredTemplates.length - visibleTemplates.length;
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
  // galleryRef + galleryInView were used by the framer-motion staggerContainer
  // that wrapped the template gallery. That wrapper was replaced with a plain
  // <div> + CSS animation (.gallery-card-rise in globals.css) so the
  // framer-motion runtime no longer hydrates per gallery card — Lighthouse
  // mobile flagged the previous setup as 137 KiB of unused-JS on landing.
  // The hero + features stagger still uses framer-motion since those are
  // five-element groups, not sixty.

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
        {/* Hero entrance — CSS keyframes (.hero-rise / .hero-rise-headline
            in globals.css) instead of framer-motion variants. The
            previous setup held the subhead behind a JS-hydrated motion
            variant with a ~900 ms delay, which made the subhead the
            page's LCP element and pushed LCP to 3.9 s on mobile (the
            element was visible in the SSR HTML but framer's
            opacity-0 starting state hid it until variants fired).
            CSS keyframes run as soon as the browser parses the
            stylesheet, so the SSR-rendered text reaches LCP-counted
            opacity inside the first paint window. Same 24 px rise,
            same staggered cadence (delays inline below), just no JS
            gate. */}
        <div className="mx-auto max-w-3xl text-center">
          <p
            className="hero-rise mb-5 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1 text-xs font-medium text-[color:var(--color-text-muted)]"
            style={{ animationDelay: "50ms" }}
          >
            <Sparkles className="h-3 w-3" />
            {t("landing.eyebrow")}
          </p>
          <h1
            className="hero-rise-headline text-balance text-3xl font-semibold tracking-tight text-[color:var(--color-text)] sm:text-5xl md:text-6xl"
            style={{ animationDelay: "180ms" }}
          >
            {t("landing.headlineA")}
            <br />
            <span className="text-[color:var(--color-text-muted)]">
              {t("landing.headlineB")}
            </span>
          </h1>
          <p
            className="hero-rise mx-auto mt-6 max-w-xl text-pretty text-base text-[color:var(--color-text-muted)] sm:text-lg"
            style={{ animationDelay: "310ms" }}
          >
            {t("landing.body")}
          </p>
          <div
            className="hero-rise mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "440ms" }}
          >
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                {t("landing.startBuilding")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {/* Secondary CTA — auth-aware. Signed-in users get a
                "Go to overview" path (dashboard); anonymous users get
                "Sign in". During the initial auth-loading flicker we
                show the "Sign in" copy so layout doesn't jump when
                the auth state resolves a beat later. */}
            <Link
              href={user && !authLoading ? "/dashboard" : "/login"}
              className="w-full sm:w-auto"
            >
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                {user && !authLoading
                  ? t("landing.goToDashboard")
                  : t("landing.signIn")}
              </Button>
            </Link>
          </div>
        </div>
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
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--color-text)] sm:text-3xl">
              {t("templates.title")}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
              {visibleTemplates.length} {t("templates.body")}
            </p>
          </div>
          {/* Region filter pills — Alle / English / Dansk CV. Right-
              aligned on desktop so the heading anchors the left of the
              row and the filter sits opposite. Wraps below the heading
              on narrow viewports for safe stacking. */}
          <TemplateFilterTabs
            active={region}
            onChange={setRegion}
            counts={counts}
          />
        </div>
        {/* Gallery cascade — 30ms apart, slightly faster than the
            features stagger because there are many more cards. */}
        {/* Gallery grid — plain <div> instead of <motion.div>. The
            previous staggered fade-in was framer-motion mounting 60
            <motion.div> instances at first paint, each registering
            its own variant resolver + whileHover handler — Lighthouse
            mobile flagged the resulting hydration as a 137 KiB
            unused-JS line + ~70 ms forced-reflow contributor. CSS
            keyframes on the card itself (.gallery-card-rise in
            globals.css) give the same staggered fade-in without
            framer's per-element runtime cost, mirroring the Reveal
            pattern in philipsloth-portfolio. Hover lift moves to a
            CSS transition on .gallery-card-rise:hover.
            grid-cols-1 is load-bearing on mobile: without an explicit
            track the 794 px-wide (A4 @96dpi) template stage inside
            each TemplatePreview blows out the column past the 375 px
            viewport — `minmax(0, 1fr)` (which grid-cols-1 expands to)
            breaks that inflation. */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTemplates.map((tpl, idx) => (
            // `content-visibility: auto` tells the browser to skip
            // paint + style for descendants while the card is outside
            // the viewport; React still mounts (so the
            // LazyTemplatePreview's IntersectionObserver wakes up),
            // but the work is deferred. `containIntrinsicSize`
            // reserves the card's expected size so the scrollbar
            // doesn't jump when cards downstream materialise.
            // `animationDelay` caps at 600 ms so card #60 doesn't
            // wait 1.8 s to fade in.
            <div
              key={tpl.id}
              className="gallery-card-rise"
              style={{
                animationDelay: `${Math.min(idx * 30, 600)}ms`,
                contentVisibility: "auto",
                containIntrinsicSize: "auto 640px",
              }}
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
                <div className="pointer-events-none relative border-b border-[color:var(--color-border)]">
                  <LazyTemplatePreview id={tpl.id} />
                  {tpl.language === "da" ? <DkBadge /> : <EnBadge />}
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
            </div>
          ))}
        </div>
        {hiddenCount > 0 ? (
          <div className="mt-10 flex justify-center">
            {/* Reveal the remaining templates client-side. The 48 hidden
                cards stay out of the React tree until the click, so their
                dynamic-chunk fetches + lazy-preview observers never hit the
                critical path on landing — that's the difference between
                mobile 88 and 90+. */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setShowAll(true)}
            >
              {`Show all ${hiddenCount} templates`}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
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
