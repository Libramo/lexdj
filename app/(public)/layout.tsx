import { Nav } from "@/components/public/nav";
import { db } from "@/drizzle/src";
import { laws } from "@/drizzle/src/db/schema";
import { count, sql } from "drizzle-orm";
import Link from "next/link";
import Script from "next/script";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ total }] = await db
    .execute(
      sql`SELECT COUNT(*)::int as total FROM laws WHERE id NOT IN (SELECT id FROM duplicate_laws)`,
    )
    .then((r) => [{ total: Number((r.rows[0] as any).total) }]);
  return (
    <div className="min-h-screen flex flex-col bg-muted">
      {/* Umami visitor analytics — public-site pages only, not the admin
          dashboard or /cms. Env vars unset (e.g. local dev) means no
          script renders at all, so this never breaks a build/dev run
          without Umami configured. */}
      {process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL &&
        process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            defer
            src={process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
          />
        )}

      {/* Top bar */}
      <div className="bg-muted border-b border-border text-muted-foreground text-[11px] tracking-widest text-center py-1.5 font-medium">
        LEXDJ · Archive numérique non officielle du droit et de la législation de Djibouti
      </div>

      {/* Nav */}
      <Nav />

      <main className="flex-1">{children}</main>

      <footer className="bg-background border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-8 flex justify-between items-center text-xs text-muted-foreground">
          <span>
            © {new Date().getFullYear()} LexDJ · <br />
            Archive non officielle · <br />
            Non affilié au gouvernement de Djibouti
          </span>
          <span>With ❤️ Bly Analytics </span>
          <span>{Number(total).toLocaleString("fr-FR")} textes indexés</span>
        </div>
      </footer>
    </div>
  );
}
