"use client";

/**
 * VersionGuard — self-healing stale-deploy detector.
 *
 * The paper-cut it kills: a browser (or an intermediary proxy, or a bfcache
 * snapshot, or a battery/data-saver mode that ignores `no-store`) can keep
 * serving an OLD copy of a page's HTML even after a fresh deploy. The user
 * then sees a previous version and the only escape is a manual hard refresh,
 * per page — exactly the bug Philip reported. The server already sends
 * `Cache-Control: no-store` on HTML (public/_headers), but no server header
 * can evict a copy a browser already holds and treats as fresh. This guard is
 * the client-side half: it notices the mismatch and reloads itself once.
 *
 * How it works
 *   - Every build bakes a unique stamp into the bundle as
 *     NEXT_PUBLIC_BUILD_STAMP (next.config sets it to the Next build id).
 *   - scripts/write-version.mjs writes the SAME stamp to out/version.json at
 *     build time; that file is served `no-store`.
 *   - At runtime we fetch the live version.json and compare. If the page we're
 *     running was built from an OLDER deploy than what's live, we force exactly
 *     one reload to pull the current build.
 *
 * Safety (no reload loops, no false reloads)
 *   - Keyed on the LIVE stamp in sessionStorage: we reload at most once per
 *     distinct live build. If a page is somehow stuck serving old HTML even
 *     after reloading, the second check sees "already reloaded for this stamp"
 *     and stops — it can never loop. A genuinely newer deploy later in the
 *     same session has a new stamp, so it still heals.
 *   - Only acts when BOTH stamps are present and genuinely differ. A healthy
 *     client that loaded the latest HTML sees matching stamps and never
 *     reloads — so this costs nothing for everyone who isn't stale.
 *   - All network/storage access is wrapped and fails silent. A missing
 *     version.json (e.g. local `next dev`, where postbuild never ran) is a
 *     no-op.
 *   - Re-checks when the tab regains focus, so a tab left open across a deploy
 *     heals the moment the user comes back to it.
 *
 * Bootstrapping limitation (be honest about it): this guard can only run on a
 * page whose HTML is recent enough to CONTAIN it. A page still serving fully
 * cached pre-guard HTML has to be cleared once (hard refresh / empty cache) to
 * pick the guard up. From then on every future deploy self-heals with no
 * manual refresh ever again.
 */

import { useEffect } from "react";

// Inlined at build time via next.config `env`. Empty string if the build
// somehow ran without it — in which case we simply do nothing (no stamp to
// compare against is safer than guessing).
const BUILD_STAMP = process.env.NEXT_PUBLIC_BUILD_STAMP ?? "";

// sessionStorage key holds the live stamp we last reloaded FOR — not a bare
// boolean — so multiple deploys in one session each get their one reload while
// a stuck page still can't loop.
const RELOAD_KEY = "slothcv:vg-reloaded-for";

export function VersionGuard() {
  useEffect(() => {
    if (!BUILD_STAMP) return; // nothing to compare — skip entirely

    let cancelled = false;

    async function check() {
      try {
        // Unique URL + no-store so no cache layer between us and the origin
        // can hand back a stale version.json (which would defeat the point).
        const res = await fetch(`/version.json?_=${Date.now()}`, {
          cache: "no-store",
        });
        if (cancelled || !res.ok) return;

        const { stamp } = (await res.json()) as { stamp?: string };
        if (!stamp || stamp === BUILD_STAMP) return; // already on the live build

        // The live deploy is newer than the build this page was served from.
        if (sessionStorage.getItem(RELOAD_KEY) === stamp) return; // did this one
        sessionStorage.setItem(RELOAD_KEY, stamp);
        window.location.reload();
      } catch {
        // Offline, version.json absent (dev), or malformed JSON — ignore.
      }
    }

    check();

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
