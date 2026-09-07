import path from "path";
import { fileURLToPath } from "url";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor, FixedToolbarFeature } from "@payloadcms/richtext-lexical";
import { nestedDocsPlugin } from "@payloadcms/plugin-nested-docs";

import { Users } from "./collections/Users";
import { LawCorrections } from "./collections/LawCorrections";
import { Codes } from "./collections/Codes";
import { CodeSections } from "./collections/CodeSections";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  // Mounted at /cms and /cms-api (see app/(payload)/) rather than the
  // defaults — this app already has an extensive /api/* surface
  // (chat, suggest, pdf, v1/*), so Payload's own API gets its own
  // namespace instead of colliding with it.
  routes: {
    admin: "/cms",
    api: "/cms-api",
  },
  collections: [Users, LawCorrections, Codes, CodeSections],
  // Adds `parent`-tree bookkeeping to code-sections — `code-sections`
  // already hand-defines its own `parent` field (for `code`-scoped
  // filterOptions), so this only contributes the `breadcrumbs` field and
  // the cascade-update hooks; see collections/CodeSections.ts.
  plugins: [
    nestedDocsPlugin({
      collections: ["code-sections"],
      parentFieldSlug: "parent",
      generateLabel: (_docs, doc) => (doc.title as string) ?? String(doc.id),
      generateURL: (docs) => docs.map((doc) => String(doc.slug)).join("/"),
    }),
  ],
  // Default features (defaultEditorFeatures) already include headings,
  // lists, links, blockquote, indent/align, upload, etc. — only
  // InlineToolbarFeature (selection-triggered popup) ships by default,
  // not FixedToolbarFeature (a persistent bar), so options were only ever
  // visible after selecting text. Adding it on top of, not instead of,
  // the defaults.
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures,
      FixedToolbarFeature(),
    ],
  }),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  // Same Postgres database as the rest of the app (DATABASE_URL) — Payload
  // creates and owns its own tables in it (`users`, `law_corrections`,
  // `codes`, `code_sections`, `payload_*`), alongside but never touching
  // the scraper-owned `laws`/`issues`/`scrape_logs` tables. See
  // context/architecture.md.
  //
  // push: false is required, not optional, in this setup: Payload's dev
  // schema push reconciles against every table it finds in the connected
  // database, not just its own — left at its default (true outside
  // production) it will prompt to DROP the scraper-owned `laws`/`issues`
  // tables the moment it doesn't recognize them, since this DB is shared
  // rather than Payload-exclusive. Real migrations (migrations/) are the
  // only sanctioned way to change Payload's schema now that they exist —
  // see context/ai-workflow-rules.md's Protected Files.
  db: postgresAdapter({
    push: false,
    pool: {
      connectionString: process.env.DATABASE_URL || "",
    },
  }),
});
