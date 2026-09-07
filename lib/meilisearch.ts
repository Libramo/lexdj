import { Meilisearch } from "meilisearch";

// Single `host` URL, unlike Typesense's separate host/port/protocol
// fields — collapse those into MEILI_HOST (e.g. "http://meilisearch:7700").
// The master key is used directly as the app's API key because this
// service stays loopback-bound on the VPS, same trust model as the
// former Typesense setup — if Meilisearch is ever exposed beyond the
// Docker network, switch to a scoped key (search/documents.add only)
// for the app and keep the master key for indexing scripts only.
export const meiliClient = new Meilisearch({
  host: process.env.MEILI_HOST!,
  apiKey: process.env.MEILI_MASTER_KEY!,
});
