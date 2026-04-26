import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/laws",
    description: "Liste paginée des textes officiels.",
    params: [
      {
        name: "page",
        type: "integer",
        default: "1",
        description: "Numéro de page",
      },
      {
        name: "limit",
        type: "integer",
        default: "20",
        description: "Résultats par page (max 50)",
      },
      {
        name: "type",
        type: "string",
        default: "—",
        description: "Filtrer par type (Loi, Décret, Arrêté...)",
      },
      {
        name: "ministry",
        type: "string",
        default: "—",
        description: "Filtrer par ministère (valeur exacte)",
      },
      {
        name: "era",
        type: "string",
        default: "—",
        description: "colonial · independence · modern",
      },
    ],
    example: `/api/v1/laws?type=Loi&era=modern&limit=5`,
    response: `{
  "data": [
    {
      "id": 441,
      "title": "Décret n° 2024-008/PR/SES...",
      "doc_type": "Décret",
      "reference_number": "2024-008/PR/SES",
      "ministry": "PRÉSIDENCE DE LA RÉPUBLIQUE",
      "publication_date": "2024-02-01",
      "issue_number": "n° 1 du 15/01/2024",
      "intro_text": "Le Président de la République...",
      "signed_by": "ISMAÏL OMAR GUELLEH",
      "source_url": "/texte-juridique/..."
    }
  ],
  "meta": {
    "page": 1,
    "limit": 5,
    "total": 2528,
    "total_pages": 506,
    "has_next": true,
    "has_prev": false
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/laws/:id",
    description: "Texte complet d'un texte par son identifiant.",
    params: [
      {
        name: "id",
        type: "integer",
        default: "—",
        description: "Identifiant unique du texte",
      },
    ],
    example: `/api/v1/laws/441`,
    response: `{
  "data": {
    "id": 441,
    "title": "Décret n° 2024-008/PR/SES...",
    "doc_type": "Décret",
    "full_text": "Article 1er. — ...",
    "visas_text": "Vu la Constitution...",
    "signed_by": "ISMAÏL OMAR GUELLEH",
    "pdf_links": [],
    ...
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/search",
    description:
      "Recherche plein texte dans les titres, introductions et corps des textes. Résultats classés par pertinence.",
    params: [
      {
        name: "q",
        type: "string",
        default: "—",
        description: "Requête (obligatoire)",
      },
      {
        name: "page",
        type: "integer",
        default: "1",
        description: "Numéro de page",
      },
      {
        name: "limit",
        type: "integer",
        default: "20",
        description: "Résultats par page (max 50)",
      },
      {
        name: "type",
        type: "string",
        default: "—",
        description: "Filtrer par type",
      },
      {
        name: "ministry",
        type: "string",
        default: "—",
        description: "Filtrer par ministère",
      },
      {
        name: "era",
        type: "string",
        default: "—",
        description: "colonial · independence · modern",
      },
    ],
    example: `/api/v1/search?q=nomination+ministre&type=Décret&era=modern`,
    response: `{
  "data": [
    {
      "id": 441,
      "title": "...",
      "relevance": 0.0759,
      ...
    }
  ],
  "meta": {
    "q": "nomination ministre",
    "page": 1,
    "total": 8,
    ...
  }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/issues",
    description: "Liste paginée des numéros du Journal Officiel.",
    params: [
      {
        name: "page",
        type: "integer",
        default: "1",
        description: "Numéro de page",
      },
      {
        name: "limit",
        type: "integer",
        default: "20",
        description: "Résultats par page (max 50)",
      },
      {
        name: "era",
        type: "string",
        default: "—",
        description: "colonial · independence · modern",
      },
      {
        name: "q",
        type: "string",
        default: "—",
        description: "Recherche par numéro ou date",
      },
    ],
    example: `/api/v1/issues?era=modern&limit=10`,
    response: `{
  "data": [
    {
      "issue_number": "n° 5 du 06/04/2026",
      "issue_date": "2026-04-06",
      "text_count": 1
    }
  ],
  "meta": { "page": 1, "total": 967, ... }
}`,
  },
  {
    method: "GET",
    path: "/api/v1/ministries",
    description:
      "Index de tous les ministères et institutions avec le nombre de textes publiés.",
    params: [
      {
        name: "q",
        type: "string",
        default: "—",
        description: "Recherche par nom de ministère",
      },
    ],
    example: `/api/v1/ministries?q=finance`,
    response: `{
  "data": [
    {
      "ministry": "ACTES DU POUVOIR LOCAL",
      "text_count": 26225
    },
    ...
  ],
  "meta": { "total": 47 }
}`,
  },
];

function MethodBadge({ method }: { method: string }) {
  return (
    <span className="text-[11px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-0.5">
      {method}
    </span>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="bg-[#1A3A5C] text-white">
        <div className="max-w-4xl mx-auto px-8 py-14">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors no-underline text-sm mb-8"
          >
            <ArrowLeft size={14} /> Retour à LexDJ
          </Link>
          <p className="text-white/50 text-xs uppercase tracking-widest font-medium mb-3">
            LexDJ · Documentation
          </p>
          <h1 className="font-['Libre_Baskerville'] text-4xl font-normal leading-tight mb-4">
            API <em className="text-[#9DC4E0]">Reference</em>
          </h1>
          <p className="text-white/50 text-sm font-light max-w-lg mb-6">
            Accès programmatique à 53 806 textes officiels du Journal Officiel
            de la République de Djibouti. Gratuit. Pas de clé requise.
          </p>

          {/* Base URL */}
          <div className="bg-white/10 border border-white/10 rounded-xl px-5 py-3 font-mono text-sm text-white/80 inline-block">
            Base URL:{" "}
            <span className="text-white font-semibold">
              https://lexdj.blyanalytics.com
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-12 space-y-6">
        {/* Rate limit notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <p className="text-sm font-semibold text-amber-900 mb-0.5">
            Rate limiting
          </p>
          <p className="text-xs text-amber-700">
            60 requêtes par minute par adresse IP. Les requêtes dépassant cette
            limite retournent un statut{" "}
            <code className="bg-amber-100 px-1 rounded">429</code>.
          </p>
        </div>

        {/* Endpoints */}
        {ENDPOINTS.map((ep, i) => (
          <div
            key={i}
            className="bg-white border border-black/[0.07] rounded-2xl overflow-hidden"
          >
            {/* Endpoint header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-black/[0.06]">
              <MethodBadge method={ep.method} />
              <code className="text-sm font-mono font-semibold text-[#111]">
                {ep.path}
              </code>
            </div>

            <div className="px-6 py-5 space-y-5">
              <p className="text-sm text-[#555] leading-relaxed">
                {ep.description}
              </p>

              {/* Parameters */}
              <div>
                <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-3">
                  Paramètres
                </p>
                <div className="border border-black/[0.07] rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#FAFAF8] border-b border-black/[0.06]">
                        <th className="text-left px-4 py-2 text-[#888] font-medium">
                          Nom
                        </th>
                        <th className="text-left px-4 py-2 text-[#888] font-medium">
                          Type
                        </th>
                        <th className="text-left px-4 py-2 text-[#888] font-medium">
                          Défaut
                        </th>
                        <th className="text-left px-4 py-2 text-[#888] font-medium">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ep.params.map((p, j) => (
                        <tr
                          key={j}
                          className="border-b border-black/[0.04] last:border-0"
                        >
                          <td className="px-4 py-2.5 font-mono text-[#1A3A5C] font-medium">
                            {p.name}
                          </td>
                          <td className="px-4 py-2.5 text-[#888]">{p.type}</td>
                          <td className="px-4 py-2.5 font-mono text-[#AAA]">
                            {p.default}
                          </td>
                          <td className="px-4 py-2.5 text-[#555]">
                            {p.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Example */}
              <div>
                <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-2">
                  Exemple
                </p>
                <div className="bg-[#0D1117] rounded-xl px-4 py-3 font-mono text-xs text-emerald-400 overflow-x-auto">
                  GET https://lexdj.blyanalytics.com{ep.example}
                </div>
              </div>

              {/* Response */}
              <div>
                <p className="text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-2">
                  Réponse
                </p>
                <pre className="bg-[#0D1117] rounded-xl px-4 py-3 font-mono text-xs text-[#E6EDF3] overflow-x-auto leading-relaxed">
                  {ep.response}
                </pre>
              </div>
            </div>
          </div>
        ))}

        {/* Error codes */}
        <div className="bg-white border border-black/[0.07] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-black/[0.06]">
            <p className="text-sm font-semibold text-[#111]">Codes d'erreur</p>
          </div>
          <div className="px-6 py-5">
            <div className="border border-black/[0.07] rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#FAFAF8] border-b border-black/[0.06]">
                    <th className="text-left px-4 py-2 text-[#888] font-medium">
                      Code
                    </th>
                    <th className="text-left px-4 py-2 text-[#888] font-medium">
                      Signification
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { code: "200", label: "Succès" },
                    { code: "400", label: "Paramètre invalide ou manquant" },
                    { code: "404", label: "Ressource introuvable" },
                    { code: "429", label: "Rate limit dépassé" },
                    { code: "500", label: "Erreur serveur interne" },
                  ].map((e) => (
                    <tr
                      key={e.code}
                      className="border-b border-black/[0.04] last:border-0"
                    >
                      <td className="px-4 py-2.5 font-mono font-bold text-[#1A3A5C]">
                        {e.code}
                      </td>
                      <td className="px-4 py-2.5 text-[#555]">{e.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Changelog */}
        <div className="bg-white border border-black/[0.07] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-black/[0.06]">
            <p className="text-sm font-semibold text-[#111]">Changelog</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            {[
              {
                version: "v1.0",
                date: "Avril 2026",
                changes: [
                  "Lancement initial de l'API",
                  "5 endpoints : laws, laws/:id, search, issues, ministries",
                  "Rate limiting : 60 req/min par IP",
                  "53 806 textes indexés — 1904 à 2026",
                ],
              },
            ].map((release) => (
              <div key={release.version} className="flex gap-4">
                <div className="shrink-0 text-right w-20">
                  <span className="text-xs font-mono font-bold text-[#1A3A5C]">
                    {release.version}
                  </span>
                  <p className="text-[11px] text-[#AAA]">{release.date}</p>
                </div>
                <div className="flex-1 border-l border-black/[0.06] pl-4">
                  <ul className="space-y-1">
                    {release.changes.map((c, i) => (
                      <li
                        key={i}
                        className="text-xs text-[#555] flex items-start gap-2"
                      >
                        <span className="text-[#1A3A5C] mt-0.5">→</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-black/[0.06] pt-8 pb-4">
          <p className="text-xs text-[#AAA] leading-relaxed">
            Cette API est fournie gratuitement par{" "}
            <a
              href="https://blyanalytics.com"
              className="text-[#1A3A5C] hover:underline no-underline"
            >
              BLY Analytics
            </a>
            . Les données proviennent du portail officiel du Journal Officiel de
            la République de Djibouti. Pour toute question :{" "}
            <a
              href="mailto:hello@blyanalytics.com"
              className="text-[#1A3A5C] hover:underline no-underline"
            >
              hello@blyanalytics.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
