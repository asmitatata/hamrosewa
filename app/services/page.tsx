"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CITIES, SERVICES } from "@/lib/constants";

export default function ServicesBrowsePage() {
  const params = useSearchParams();
  const city = params.get("city") || "";

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Browse Services</h1>
      <p className="text-sm text-zinc-600 mb-6">
        {city ? `Filtering for ${CITIES[city as keyof typeof CITIES]?.name}` : "Pick a city on the home page to filter results"}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {SERVICES.map((s) => (
          <Link key={s.key} href={`/services/${s.key}${city ? `?city=${city}` : ""}`} className="rounded-xl border border-zinc-200 bg-white p-4 text-center hover:shadow-sm">
            <div className="text-sm font-medium text-zinc-800">{s.label}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
