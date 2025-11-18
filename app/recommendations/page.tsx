"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import type { ProviderDoc } from "@/lib/types";
import { rankProvidersViaAPI } from "@/lib/reco";

export default function RecommendationsPage() {
  const sp = useSearchParams();
  const [items, setItems] = useState<Array<ProviderDoc & { score: number }>>([]);
  const [error, setError] = useState("");

  const city = sp.get("city") || "kathmandu";
  const service = sp.get("service") || "cleaning";

  useEffect(() => {
    const run = async () => {
      try {
        const col = collection(db, "providers");
        const conds: any[] = [where("primaryService", "==", service)];
        if (city) conds.push(where("city", "==", city));
        const q = query(col, ...conds, limit(50));
        const snap = await getDocs(q);
        const rows = snap.docs.map((d) => d.data() as ProviderDoc);
        const ranked = await rankProvidersViaAPI(rows, { city: city as any, service });
        setItems(ranked);
      } catch (e: any) {
        setError(e?.message || "Failed to load recommendations.");
      }
    };
    run();
  }, [city, service]);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Recommendations</h1>
      <p className="text-sm text-zinc-600 mb-1">
        Showing results for <span className="font-medium">{service}</span> in <span className="font-medium">{city}</span>.
      </p>
      <p className="text-xs text-zinc-500 mb-4">AI-powered ranking combines proximity to your city and provider quality signals (ratings & volume).</p>

      {error && (
        <div className="mb-4 rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{error}</div>
      )}

      <section className="grid gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-medium text-zinc-900 mb-3">Top results</h2>
          {items.length === 0 ? (
            <div className="text-sm text-zinc-600">No results found.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((r) => (
                <div key={r.uid} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="font-medium text-zinc-900">{r.name || r.uid}</div>
                  <div className="text-xs text-zinc-600">{r.primaryService} • {r.city}</div>
                  <div className="text-xs text-zinc-600">⭐ {r.ratingAvg || 0} ({r.ratingCount || 0})</div>
                  <div className="text-xs text-zinc-600 mt-1">Score: {r.score.toFixed(3)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
