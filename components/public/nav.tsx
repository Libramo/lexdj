"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { GavelIcon } from "@/components/ui/gavel";

const navLinks = [
  { href: "/textes", label: "Textes" },
  { href: "/recherche", label: "Recherche" },
  { href: "/ministeres", label: "Ministères" },
  { href: "/journal", label: "Numéros" },
  { href: "/couverture", label: "Couverture" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-white border-b border-black/[0.07] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-8 flex items-center justify-between h-[60px]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 no-underline">
          <div className="w-8 h-8 bg-[#1A3A5C] rounded-md flex items-center justify-center text-[11px] font-bold text-white tracking-wider">
            <GavelIcon />
          </div>
          <div>
            <div className="text-sm font-medium text-[#111] leading-tight">
              LexDJ
            </div>
            <div className="text-[11px] text-[#888] leading-tight">
              Archive non officielle · JO Djibouti
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-[13px] text-[#666] hover:text-[#111] transition-colors decoration-0"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-[#666] hover:text-[#111] transition-colors"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-black/[0.06] px-8 py-4 flex flex-col gap-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="text-sm text-[#444] hover:text-[#111] py-2.5 border-b border-black/[0.05] last:border-0 transition-colors decoration-0"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
