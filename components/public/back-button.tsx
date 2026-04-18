"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 text-[#888] hover:text-[#111] transition-colors text-sm"
    >
      <ArrowLeft size={14} />
      Retour
    </button>
  );
}
