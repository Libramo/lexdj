export const LAWS_COLLECTION = "laws";

export const LAWS_SCHEMA = {
  name: LAWS_COLLECTION,
  token_separators: ["/", "-", "(", ")", "."],
  fields: [
    { name: "id", type: "int32" },
    { name: "title", type: "string", optional: true, locale: "fr" },
    { name: "reference_number", type: "string", optional: true },
    { name: "intro_text", type: "string", optional: true, locale: "fr" },
    { name: "full_text", type: "string", optional: true, locale: "fr" },
    { name: "doc_type", type: "string", optional: true, facet: true },
    { name: "ministry", type: "string", optional: true, facet: true },
    {
      name: "ministry_normalized",
      type: "string",
      optional: true,
      facet: true,
    },
    { name: "period", type: "string", optional: true, facet: true },
    { name: "mesure", type: "string", optional: true, facet: true },
    { name: "topics", type: "string[]", optional: true, facet: true },
    { name: "issue_number", type: "string", optional: true, index: false },
    { name: "publication_date", type: "string", optional: true, sort: true },
    { name: "pub_year", type: "int32", sort: true },
    { name: "source_url", type: "string", optional: true, index: false },
  ],
  default_sorting_field: "pub_year",
} as const;
