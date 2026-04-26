/**
 * OpenNext Cloudflare adapter config.
 *
 * Phase 1 keeps the runtime minimal:
 *   - `dummy` incremental cache: no R2 bucket needed. We have no ISR routes
 *     yet; everything is either Server Component (per-request) or Server
 *     Action. Phase 2 may switch to the R2 cache when we add ISR'd PDF
 *     previews, but adding it now would just be operational debt.
 *   - Default node-runtime worker output (`.open-next/worker.js`).
 */

import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// `dummy` is the no-op cache. It satisfies the OpenNext interface but never
// actually caches anything — perfect for Phase 1 where we have no ISR.
import dummyIncrementalCache from "@opennextjs/aws/overrides/incrementalCache/dummy";

export default defineCloudflareConfig({
  incrementalCache: dummyIncrementalCache,
});
