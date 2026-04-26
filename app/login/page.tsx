"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ password }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      router.push("/dashboard/laws");
    } else {
      setError("Mot de passe incorrect");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-200 p-8 w-full max-w-sm shadow-sm flex flex-col gap-4"
      >
        <h1 className="font-bold text-lg text-[#1A3A5C]">LexDJ Admin</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          className="px-4 py-2.5 rounded-lg bg-[#1A3A5C] text-white text-sm font-medium hover:bg-[#15304d] transition-colors"
        >
          Connexion
        </button>
      </form>
    </div>
  );
}
