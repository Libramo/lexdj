import type { CollectionConfig } from "payload";

// Editorial overlay on top of the scraper-owned `laws` table — never the
// table itself. Payload owns this collection's schema/migrations fully (as
// it's designed to); the scraper never reads or writes it, and `laws` is
// never mutated by anything in here. See context/architecture.md for the
// full read-side merge design ("does a correction exist for this
// source_url? prefer it; otherwise use the scraped row").
//
// `sourceUrl` is the join key back to `laws.source_url` — deliberately a
// plain text field, not a Payload `relationship`, since the related row
// lives in a table Payload doesn't manage and can't validate against.
export const LawCorrections: CollectionConfig = {
  slug: "law-corrections",
  admin: {
    useAsTitle: "sourceUrl",
  },
  // Full version history — every save is a diffable, revertable snapshot.
  // This is the actual point of this collection: corrections are additive
  // and audited, never a silent in-place overwrite of the scraped text.
  versions: {
    maxPerDoc: 100,
  },
  access: {
    // Public content — the site's read path (Local API, in-process) needs
    // this readable; there's nothing sensitive in a published legal
    // correction.
    read: () => true,
    create: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  fields: [
    {
      name: "sourceUrl",
      type: "text",
      required: true,
      unique: true,
      index: true,
      label: "URL source (correspond à laws.source_url)",
    },
    {
      // Plain textarea, not richText — must stay in the exact plain-text
      // convention lib/utils.ts's parseText() tokenizer expects (the same
      // "Article 1er :", "VU", "–" bullet markers as the original scraped
      // full_text). A rich text editor would produce structured JSON the
      // tokenizer can't read, breaking the renderer for corrected laws.
      name: "fullText",
      type: "textarea",
      label: "Texte corrigé",
    },
    {
      // hasMany text, not an array of objects — matches the shape of the
      // existing `laws.topics` text[] column exactly.
      name: "topics",
      type: "text",
      hasMany: true,
      label: "Thèmes",
    },
    {
      name: "notes",
      type: "textarea",
      label: "Notes de correction (usage interne, non publié)",
    },
  ],
};
