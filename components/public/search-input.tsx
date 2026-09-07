"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";

export function SearchInput({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!q.trim()) return;
    startTransition(() => {
      router.push(`/recherche?q=${encodeURIComponent(q.trim())}`);
    });
  }

  return (
    <div className="flex gap-0 w-full">
      <div className="relative flex-1">
        {isPending ? (
          <Loader2
            size={15}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin"
          />
        ) : (
          <Search
            size={15}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        )}
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Décret, arrêté, nomination, loi organique..."
          autoFocus
          className="w-full pl-11 pr-10 py-3.5 text-sm border border-border rounded-l-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
        />
        {q && (
          <button
            onClick={() => {
              setQ("");
              router.push("/recherche");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <button
        onClick={submit}
        disabled={!q.trim() || isPending}
        className="px-6 bg-primary text-primary-foreground text-sm font-medium rounded-r-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
      >
        Rechercher
      </button>
    </div>
  );
}
