import { Meilisearch } from "meilisearch";

// Single `host` URL, unlike Typesense's separate host/port/protocol
// fields — collapse those into MEILI_HOST (e.g. "http://meilisearch:7700").
// The master key is used directly as the app's API key because this
// service stays loopback-bound on the VPS, same trust model as the
// former Typesense setup — if Meilisearch is ever exposed beyond the
// Docker network, switch to a scoped key (search/documents.add only)
// for the app and keep the master key for indexing scripts only.
// defaultWaitOptions only affects .waitTask()/.waitForTask() calls, which
// only scripts/meilisearch-*-index.ts ever use (grep-confirmed) — no
// public request path calls them, so this has zero effect on live traffic.
// The SDK's own default is a 5s client-side timeout, which a real batch of
// 250 documents (including full full_text, some laws are huge) can exceed
// on a modest VPS even though the task itself keeps processing and
// succeeds server-side — see progress-tracker.md's indexer timeout fix.
export const meiliClient = new Meilisearch({
  host: process.env.MEILI_HOST!,
  apiKey: process.env.MEILI_MASTER_KEY!,
  defaultWaitOptions: { timeout: 120_000 },
});
