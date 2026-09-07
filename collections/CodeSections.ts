import type { CollectionConfig, Where } from "payload";
import { slugify, uniqueSlug } from "@/lib/slugify";

// One node in a code's hierarchy (Livre/Titre/Chapitre/Section/Article —
// depth varies per code). Self-referential via `parent`, hand-defined
// below rather than left to the nested-docs plugin's default so
// `filterOptions` can scope the picker to siblings within the same
// `code` (see payload.config.ts's plugin wiring — since this field
// already exists, the plugin only adds its `breadcrumbs` field on top).
//
// Content is hand-authored via Lexical richText, never the scraped-JO
// plain-text convention `lib/utils.ts`'s parseText() tokenizer expects —
// this is a deliberately separate rendering pipeline from LawTextRenderer
// (see components/public/code-content.tsx). See context/code-standards.md.
export const CodeSections: CollectionConfig = {
  slug: "code-sections",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "type", "code", "order"],
  },
  // Full version history — this is load-bearing legal text, mirrors
  // LawCorrections' one existing precedent.
  versions: {
    maxPerDoc: 100,
  },
  access: {
    read: () => true,
    create: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
  // Auto-generates `slug` from the parent Code's own slug + this section's
  // title (or article number) whenever it's left blank — manual typing was
  // the actual source of the "Dispositions générales" collision risk the
  // field's own hint used to warn about, since a heading like that repeats
  // across many codes. Only fills it in when empty, so an editor can still
  // override it by hand for a genuine disambiguation case, and an
  // already-set slug is never silently rewritten on a later title edit.
  hooks: {
    beforeValidate: [
      async ({ data, req, originalDoc }) => {
        if (!data || data.slug || !data.title) return data;
        const codeId =
          data.code && typeof data.code === "object"
            ? (data.code as { id?: unknown }).id
            : data.code;
        if (!codeId) return data;
        const codeDoc = await req.payload.findByID({
          collection: "codes",
          id: codeId as number | string,
          depth: 0,
        });
        const base =
          data.type === "article" && data.articleNumber
            ? `art-${data.articleNumber}`
            : data.title;
        const candidate = `${codeDoc.slug}-${slugify(String(base))}`;
        data.slug = await uniqueSlug(
          req.payload,
          "code-sections",
          candidate,
          originalDoc?.id,
        );
        return data;
      },
    ],
  },
  fields: [
    {
      name: "code",
      type: "relationship",
      relationTo: "codes",
      required: true,
      index: true,
      label: "Code",
    },
    {
      name: "parent",
      type: "relationship",
      relationTo: "code-sections",
      hasMany: false,
      admin: {
        position: "sidebar",
      },
      // Scopes the picker to the same `code`, on top of the nested-docs
      // plugin's own default cycle-prevention (exclude self + exclude any
      // node whose `breadcrumbs.doc` already contains this id, i.e. its
      // descendants) — reproduced by hand here because defining
      // `filterOptions` on this field at all stops the plugin from
      // applying its own default (see nestedDocsPlugin's `if
      // (!existingParentField.filterOptions)` check).
      filterOptions: ({ id, siblingData }) => {
        const codeId = (siblingData as { code?: unknown } | undefined)?.code;
        const clauses: Where[] = [];
        if (codeId) clauses.push({ code: { equals: codeId } });
        if (id) {
          clauses.push({ id: { not_equals: id } });
          clauses.push({ "breadcrumbs.doc": { not_in: [id] } });
        }
        return clauses.length > 0 ? { and: clauses } : true;
      },
    },
    {
      name: "type",
      type: "select",
      required: true,
      label: "Type",
      options: [
        { label: "Livre", value: "livre" },
        { label: "Titre", value: "titre" },
        { label: "Chapitre", value: "chapitre" },
        { label: "Section", value: "section" },
        { label: "Sous-section", value: "sous-section" },
        { label: "Article", value: "article" },
      ],
    },
    {
      name: "title",
      type: "text",
      required: true,
      label: "Titre / intitulé",
    },
    {
      name: "articleNumber",
      type: "text",
      label: "Numéro d'article",
      admin: {
        condition: (_, siblingData) => siblingData?.type === "article",
      },
    },
    {
      name: "content",
      type: "richText",
      label: "Contenu (article uniquement)",
      admin: {
        condition: (_, siblingData) => siblingData?.type === "article",
      },
      validate: (value, { siblingData }) => {
        const data = siblingData as { type?: string } | undefined;
        if (data?.type === "article" && !value) {
          return "Le contenu est requis pour un article.";
        }
        return true;
      },
    },
    {
      // Not `required: true` — the beforeValidate hook above always fills
      // this in from `code` + `title`/`articleNumber` when left blank, so
      // requiring manual entry would just reintroduce the typo/collision
      // risk this hook exists to remove. Still editable, for the rare case
      // the generated value collides and needs disambiguating by hand.
      name: "slug",
      type: "text",
      unique: true,
      index: true,
      label: "Slug (URL)",
      admin: {
        description:
          "Généré automatiquement à partir du code et du titre (ou du numéro d'article) si laissé vide. Doit rester unique sur tout le site — modifiable pour lever un conflit.",
      },
    },
    {
      name: "order",
      type: "number",
      required: true,
      defaultValue: 0,
      label: "Ordre parmi les éléments de même niveau",
    },
  ],
};
