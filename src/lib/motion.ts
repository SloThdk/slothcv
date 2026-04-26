/**
 * Motion primitives — central source for animation tokens used across the
 * app. Goal: every animation pulls from these constants so timing + easing
 * stay coherent (Linear / Vercel / Stripe-grade restraint, not delight-zoo).
 *
 * Rules baked in here:
 *   - We only ever animate `transform` and `opacity`. Anything else
 *     (width, height, top, left, color) triggers layout/paint and reads
 *     janky. Ring/shadow exceptions are allowed in CSS transitions
 *     elsewhere because they're isolated paint, not layout.
 *   - Default duration band is 150–300ms. Slower than 400ms feels
 *     sluggish; faster than 100ms feels jittery.
 *   - Entrances use out-expo (lands soft), exits use in-expo (leaves
 *     fast), movements use in-out-cubic (smooth both ends).
 *   - All timings collapse to a near-zero duration when the user has
 *     `prefers-reduced-motion: reduce` set. We respect that with the
 *     CSS guard in globals.css AND with the `useReducedMotion()` hook
 *     for any motion that needs to be conditionally suppressed.
 *
 * Why a helper module instead of scattering literals: one place to
 * tune the entire site's "feel". Future polish passes only need to
 * adjust these constants — not hunt through 30 components.
 */

// Default duration tokens. Anything not in this set is bespoke and should
// be commented in-place explaining why.
export const DUR = {
  /** Press feedback (button down). Snappy on purpose. */
  press: 0.1,
  /** Hover lift, simple state-toggles. */
  hover: 0.15,
  /** Standard entrance/exit for cards, modals, route fades. */
  base: 0.25,
  /** Slightly slower for first-impression entrances (landing hero). */
  feature: 0.4,
} as const;

// Cubic-bezier tokens. These are the four "named" curves used throughout
// the app. Stick to them — bespoke curves drift the visual language.
export const EASE = {
  /** out-expo: lands soft. Use for entrances. */
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  /** in-expo: leaves fast. Use for exits. */
  in: [0.7, 0, 0.84, 0] as [number, number, number, number],
  /** in-out-cubic: smooth both ends. Use for movements (layoutId slides,
   *  active-indicator transitions, anything that's not pure enter/exit). */
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
} as const;

// Reusable variant sets. Keep these dumb — single transform + opacity
// per state, no chained timelines, no spring physics.

/** Card / panel mount: fade + small rise. */
export const fadeRise = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: DUR.base, ease: EASE.out },
};

/** Modal panel: fade + scale-from-95 + rise-from-8px. */
export const modalPanel = {
  initial: { opacity: 0, scale: 0.95, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 4 },
  transition: { duration: DUR.base, ease: EASE.out },
};

/** Modal backdrop: pure fade. */
export const backdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: EASE.out },
};

/** Stagger container — children inherit `index * 50ms` start delays. */
export const staggerContainer = (stagger = 0.05, delayStart = 0) => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren: stagger,
      delayChildren: delayStart,
    },
  },
});

/** Stagger child — fades + rises into place. */
export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.base, ease: EASE.out },
  },
};

// Re-export the framer hook so component imports are uniform — every
// place that needs to opt out of motion pulls `useReducedMotion` from
// here, not directly from framer-motion.
export { useReducedMotion } from "framer-motion";
