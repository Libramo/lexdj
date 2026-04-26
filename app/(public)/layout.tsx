import { Nav } from "@/components/public/nav";
import { GavelIcon } from "@/components/ui/gavel";
import { db } from "@/drizzle/src";
import { lawsDistinct } from "@/drizzle/src/db/schema";
import { count } from "drizzle-orm";
import Link from "next/link";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ total }] = await db.select({ total: count() }).from(lawsDistinct);
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
      {/* Top bar */}
      <div className="bg-[#1A3A5C] text-white text-[11px] tracking-widest text-center py-1.5 font-medium">
        LEXDJ · Archive numérique non officielle du Journal Officiel de Djibouti
      </div>

      {/* Nav */}
      <Nav />

      <main className="flex-1">{children}</main>

      <footer className="bg-white border-t border-black/[0.07] py-6">
        <div className="max-w-6xl mx-auto px-8 flex justify-between items-center text-xs text-[#AAA]">
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
