import Link from "next/link";

const navLinks = [
  { href: "/textes", label: "Textes" },
  { href: "/recherche", label: "Recherche" },
  { href: "/ministeres", label: "Ministères" },
  { href: "/journal", label: "Numéros" },
  { href: "/couverture", label: "Couverture" },
];

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
      {/* Top bar */}
      <div className="bg-[#1A3A5C] text-white text-[11px] tracking-widest text-center py-1.5 font-medium">
        LEXDJ · Archive numérique non officielle du Journal Officiel de Djibouti
      </div>

      {/* Nav */}
      <header className="bg-white border-b border-black/[0.07] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 flex items-center justify-between h-[60px]">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div className="w-8 h-8 bg-[#1A3A5C] rounded-md flex items-center justify-center text-[11px] font-bold text-white tracking-wider">
              JO
            </div>
            <div>
              <div className="text-sm font-medium text-[#111] leading-tight">
                Journal Officiel
              </div>
              <div className="text-[11px] text-[#666] leading-tight">
                République de Djibouti
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-8">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-[13px] text-[#666] hover:text-[#111] transition-colors decoration-0"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="text-xs font-medium text-[#1A3A5C] border border-[#1A3A5C] rounded px-3 py-1 hover:bg-[#1A3A5C] hover:text-white transition-colors decoration-0"
            >
              Admin →
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-white border-t border-black/[0.07] py-6">
        <div className="max-w-6xl mx-auto px-8 flex justify-between items-center text-xs text-[#AAA]">
          <span>
            © {new Date().getFullYear()} LexDJ · Archive non officielle · Non
            affilié au gouvernement de Djibouti
          </span>
          <span>37 000+ textes indexés</span>
        </div>
      </footer>
    </div>
  );
}
