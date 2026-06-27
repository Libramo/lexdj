import { typesenseClient } from "./typesense";

export type LawResult = {
  id: string;
  title: string;
  reference_number: string;
  doc_type: string;
  ministry: string;
  publication_date: string;
  full_text: string;
  source_url: string;
};

export async function searchLaws(query: string): Promise<LawResult[]> {
  const results = await typesenseClient.collections("laws").documents().search({
    q: query,
    query_by: "title,full_text,reference_number,ministry",
    per_page: 3,
    snippet_threshold: 20,
  });

  return (results.hits ?? []).map((hit) => {
    const doc = hit.document as LawResult;
    return {
      id: doc.id,
      title: doc.title,
      reference_number: doc.reference_number,
      doc_type: doc.doc_type,
      ministry: doc.ministry,
      publication_date: doc.publication_date,
      full_text: doc.full_text?.slice(0, 1500) ?? "", // cap to avoid huge prompts
      source_url: doc.source_url,
    };
  });
}
