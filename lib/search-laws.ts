import { meiliClient } from "./meilisearch";
import { LAWS_INDEX } from "./meilisearch-schema";

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
  const results = await meiliClient.index(LAWS_INDEX).search(query, {
    limit: 3,
    attributesToCrop: ["full_text"],
    cropLength: 20,
  });

  return (results.hits ?? []).map((hit: any) => ({
    id: hit.id,
    title: hit.title,
    reference_number: hit.reference_number,
    doc_type: hit.doc_type,
    ministry: hit.ministry,
    publication_date: hit.publication_date,
    // cropped by Meilisearch; fall back to a hard slice as a safety cap
    full_text: hit._formatted?.full_text ?? hit.full_text?.slice(0, 1500) ?? "",
    source_url: hit.source_url,
  }));
}
