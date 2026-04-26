/**
 * RouteTransition — fade + tiny rise on route mount.
 *
 * Mounted around <main> in the root layout. The motion.div is keyed on
 * pathname so a route change unmounts/remounts and re-runs the entrance.
 * Exits aren't wrapped in <AnimatePresence> because Next 16 swaps the tree
 * synchronously on navigation — pure entrance is enough to give the site
 * the "settled in" feel, and chasing exit transitions in app-router
 * adds bug surface (async route preloads, parallel routes) for very
 * marginal polish.
 *
 * Reduced-motion: when the user has `prefers-reduced-motion: reduce`,
 * we skip the y-translation and shorten the fade to ~10ms (effectively
 * instant). The CSS guard in globals.css also collapses any leftover
 * transition the framer-motion runtime might emit.
 */

"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { DUR, EASE, useReducedMotion } from "@/lib/motion";

export function RouteTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={pathname}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{
        duration: reduce ? 0.01 : DUR.base,
        ease: EASE.out,
      }}
      // The wrapper has no semantic meaning — it just hosts the transform.
      // No paint impact: opacity + transform only.
      className="will-change-transform"
    >
      {children}
    </motion.div>
  );
}
