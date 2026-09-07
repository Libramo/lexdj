import type { CollectionConfig } from "payload";
import { slugify, uniqueSlug } from "@/lib/slugify";

// Top-level container for a consolidated legal code (e.g. "Code du
// travail"). Flat, no hierarchy of its own — the hierarchy lives in
// CodeSections, each scoped back to one of these via its `code`
// relationship field. Manually curated (not scraped) — see
// context/project-overview.md for why this exists alongside `laws`.
export const Codes: CollectionConfig = {
  slug: "codes",
  admin: {
    useAsTitle: "title",
  },
  access: {
    read: () => true,
    create: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  // Same auto-slug pattern as CodeSections (see that file) — fills `slug`
  // from `title` only when left blank, never overwrites one already set.
  hooks: {
    beforeValidate: [
      async ({ data, req, originalDoc }) => {
        if (!data || data.slug || !data.title) return data;
        data.slug = await uniqueSlug(
          req.payload,
          "codes",
          slugify(String(data.title)),
          originalDoc?.id,
        );
        return data;
      },
    ],
  },
  fields: [
    {
      // Not required — see the beforeValidate hook above.
      name: "slug",
      type: "text",
      unique: true,
      index: true,
      label: "Slug (URL)",
      admin: {
        description:
          "Généré automatiquement à partir du titre si laissé vide — modifiable pour lever un conflit.",
      },
    },
    {
      name: "title",
      type: "text",
      required: true,
      label: "Titre",
    },
    {
      name: "description",
      type: "textarea",
      label: "Description",
    },
  ],
};
