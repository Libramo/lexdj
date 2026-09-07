import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { ArrowRight, BookOpen } from "lucide-react";

export default async function CodesPage() {
  const payload = await getPayload({ config });
  const { docs: codes } = await payload.find({
    collection: "codes",
    sort: "title",
    limit: 100,
  });

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-sans font-black uppercase tracking-tight text-foreground mb-2">
        Codes
      </h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
        Codes consolidés du droit djiboutien, organisés par livre, titre,
        chapitre et article.
      </p>

      {codes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun code publié pour le moment.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {codes.map((code) => (
            <Link
              key={code.id}
              href={`/codes/${code.slug}`}
              className="group flex items-start gap-4 p-5 bg-background rounded-sm border border-border hover:border-primary/40 transition-colors no-underline"
            >
              <div className="w-10 h-10 rounded-sm bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <BookOpen size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {code.title}
                  </span>
                  <ArrowRight
                    size={13}
                    className="text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                  />
                </div>
                {code.description ? (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                    {code.description}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
