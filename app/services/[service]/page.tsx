"use client";

import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { SERVICES, CITIES } from "@/lib/constants";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebaseClient";
import { collection, getDocs, limit, orderBy, query, where, startAfter } from "firebase/firestore";
import type { ProviderDoc } from "@/lib/types";
import { logSignal } from "@/lib/signals";
import { rankProvidersViaAPI } from "@/lib/reco";

export default function ServiceDetailPage() {
  const params = useParams<{ service: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const city = sp.get("city") || "";
  const serviceKey = params.service;
  const service = SERVICES.find((s) => s.key === serviceKey);

  const [selectedCity, setSelectedCity] = useState<string>(city);
  const [selectedProvider, setSelectedProvider] = useState<null | { id: string; name: string; city: string; rating: number }>(null);
  const [providers, setProviders] = useState<ProviderDoc[]>([]);
  const [provLoading, setProvLoading] = useState(false);
  const [err, setErr] = useState("");
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 24;

  const cityName = useMemo(
    () => (selectedCity ? CITIES[selectedCity as keyof typeof CITIES]?.name : ""),
    [selectedCity]
  );

  if (!service) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Service not found</h1>
        <Link href="/services" className="text-rose-600">Back to services</Link>
      </main>
    );
  }

  useEffect(() => {
    const run = async () => {
      setProvLoading(true);
      setErr("");
      setLastDoc(null);
      setHasMore(true);
      try {
        const col = collection(db, "providers");
        const baseConds: any[] = [where("primaryService", "==", service.key)];
        const withCity = selectedCity ? [...baseConds, where("city", "==", selectedCity)] : baseConds;
        let rows: ProviderDoc[] = [];
        let last: any = null;
        try {
          const q1 = query(col, ...withCity, orderBy("updatedAt", "desc"), limit(pageSize));
          const snap = await getDocs(q1);
          rows = snap.docs.map((d) => d.data() as ProviderDoc);
          last = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
        } catch (err: any) {
          // Likely missing composite index; retry without orderBy then relax city filter
          try {
            const qNoOrder = query(col, ...withCity, limit(pageSize));
            const sNo = await getDocs(qNoOrder);
            rows = sNo.docs.map((d) => d.data() as ProviderDoc);
            last = sNo.docs.length ? sNo.docs[sNo.docs.length - 1] : null;
          } catch {}
        }
        if (rows.length === 0) {
          try {
            const q2 = query(col, ...baseConds, orderBy("updatedAt", "desc"), limit(pageSize));
            const snap2 = await getDocs(q2);
            rows = snap2.docs.map((d) => d.data() as ProviderDoc);
            last = snap2.docs.length ? snap2.docs[snap2.docs.length - 1] : null;
          } catch {
            const q3 = query(col, ...baseConds, limit(pageSize));
            const snap3 = await getDocs(q3);
            rows = snap3.docs.map((d) => d.data() as ProviderDoc);
            last = snap3.docs.length ? snap3.docs[snap3.docs.length - 1] : null;
          }
        }

        // fetch recent signals for personalization (if signed in)
        let signals: any[] = [];
        if (user) {
          try {
            const sref = collection(db, "users", user.uid, "signals");
            const sq = query(sref, orderBy("ts", "desc"), limit(25));
            const ss = await getDocs(sq);
            signals = ss.docs.map((d) => d.data());
          } catch {}
        }
        const ranked = await rankProvidersViaAPI(rows, { city: (selectedCity || undefined) as any, service: service.key });
        setProviders(ranked);
        setLastDoc(last);
        setHasMore(rows.length >= pageSize);
      } catch (e: any) {
        setProviders([]);
        setErr(e?.message || "Failed to load providers.");
      } finally {
        setProvLoading(false);
      }
    };
    run();
  }, [service.key, selectedCity, user]);

  const loadMore = async () => {
    if (!hasMore || !lastDoc) return;
    setProvLoading(true);
    setErr("");
    try {
      const col = collection(db, "providers");
      const baseConds: any[] = [where("primaryService", "==", service.key)];
      const withCity = selectedCity ? [...baseConds, where("city", "==", selectedCity)] : baseConds;
      const qn = query(col, ...withCity, orderBy("updatedAt", "desc"), startAfter(lastDoc), limit(pageSize));
      const snap = await getDocs(qn);
      const newRows = snap.docs.map((d) => d.data() as ProviderDoc);
      const next = [...providers, ...newRows];
      const ranked = await rankProvidersViaAPI(next, { city: (selectedCity || undefined) as any, service: service.key });
      setProviders(ranked);
      setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
      setHasMore(snap.docs.length >= pageSize);
    } catch (e: any) {
      setErr(e?.message || "Failed to load more providers.");
    } finally {
      setProvLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">{service.label}</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="h-10 rounded-lg border border-zinc-300 px-3 bg-white"
          >
            <option value="">Select city</option>
            {Object.entries(CITIES).map(([k, v]) => (
              <option key={k} value={k}>{v.name}</option>
            ))}
          </select>
          <button
            onClick={() => router.push(`/post-job?service=${service.key}${selectedCity ? `&city=${selectedCity}` : ""}`)}
            className="h-10 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4"
          >
            {user ? "Post a Job" : "Sign in to Book"}
          </button>
        </div>
      {err && (
        <div className="mt-4 mb-2 rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
          {(() => {
            const m = err as string;
            const match = m.match(/https?:\/\/[^\s)]+/);
            if (match) {
              return (
                <span>
                  {m.replace(match[0], "")} <a className="underline" href={match[0]} target="_blank" rel="noreferrer">Create required Firestore index</a>
                </span>
              );
            }
            return m;
          })()}
        </div>
      )}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-medium text-zinc-900 mb-2">About this service</h2>
          <p className="text-sm text-zinc-700">
            Book trusted {service.label.toLowerCase()} professionals in Kathmandu Valley. Choose a convenient time and we’ll match
            you with nearby, top-rated workers. {cityName && `Showing options for ${cityName}.`}
          </p>
          <ul className="mt-4 list-disc pl-6 text-sm text-zinc-700 space-y-1">
            <li>Verified professionals</li>
            <li>Upfront pricing</li>
            <li>Support 7 days a week</li>
          </ul>
        </div>

        <aside className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h3 className="text-sm font-medium text-zinc-900 mb-3">Why choose HamroSewa</h3>
          <ul className="text-sm text-zinc-700 space-y-1">
            <li>• Background checked pros</li>
            <li>• Ratings and reviews</li>
            <li>• Reliable customer support</li>
          </ul>
        </aside>
      </div>

      <section className="mt-8">
        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-zinc-900 mb-3">Top provider</h2>
              {providers.length > 0 ? (
                (() => {
                  const top = providers[0];
                  const rating = Number(top.ratingAvg || 0).toFixed(1);
                  const cityLabel = CITIES[top.city as keyof typeof CITIES]?.name || top.city;
                  return (
                    <button
                      key={top.uid}
                      onClick={async () => {
                        setSelectedProvider({ id: top.uid, name: top.name, city: cityLabel || "Your city", rating: Number(top.ratingAvg || 0) });
                        if (user) await logSignal({ userId: user.uid, type: "click", service: service.key as any, city: (selectedCity || "kathmandu") as any });
                      }}
                      className={`w-full text-left rounded-xl border ${selectedProvider?.id===top.uid?"border-rose-400":"border-zinc-200"} bg-white p-4 hover:shadow-sm`}
                    >
                      <div className="font-medium text-zinc-900">{top.name}{top.verified ? " ✓" : ""}</div>
                      <div className="text-xs text-zinc-600">⭐ {rating} • {cityLabel}</div>
                      <div className="mt-2 text-xs text-zinc-500">Tap to view prices & ETA</div>
                    </button>
                  );
                })()
              ) : (
                <div className="rounded-xl p-4 bg-white border border-zinc-200 text-sm text-zinc-600">No providers found yet.</div>
              )}
              {hasMore && (
                <div className="mt-4">
                  <button
                    disabled={provLoading}
                    onClick={loadMore}
                    className="h-10 rounded-lg border border-zinc-300 px-4 bg-white text-sm hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {provLoading ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-medium text-zinc-900 mb-3">All providers</h2>
              {(() => {
                const names = ["Suman Shrestha","Anita Gurung","Ramesh Adhikari","Bikash Thapa","Sita Basnet","Rajesh Khadka"]; 
                const need = Math.max(0, 6 - providers.length);
                const cityLabelDefault = cityName || "Your city";
                const fillers = Array.from({ length: need }).map((_, i) => ({
                  uid: `placeholder-${i+1}`,
                  name: names[i % names.length],
                  city: (selectedCity as any) || (providers[0]?.city as any) || "kathmandu",
                  ratingAvg: Number(`4.${((i+1)%5)+1}`),
                  verified: false,
                } as any));
                const display = [...providers, ...fillers];
                return display.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {display.map((p) => {
                      const rating = Number(p.ratingAvg || 0).toFixed(1);
                      const cityLabel = CITIES[p.city as keyof typeof CITIES]?.name || cityLabelDefault;
                      const isPlaceholder = String(p.uid).startsWith("placeholder-");
                      return (
                        <button
                          key={p.uid}
                          onClick={async () => {
                            const prov = { id: p.uid, name: p.name, city: cityLabel || cityLabelDefault, rating: Number(p.ratingAvg || 0) } as any;
                            setSelectedProvider(prov);
                            if (!isPlaceholder && user) await logSignal({ userId: user.uid, type: "click", service: service.key as any, city: (selectedCity || "kathmandu") as any });
                          }}
                          className={`text-left rounded-xl border ${selectedProvider?.id===p.uid?"border-rose-400":"border-zinc-200"} bg-white p-4 hover:shadow-sm`}
                        >
                          <div className="font-medium text-zinc-900">{p.name}{p.verified ? " ✓" : ""}</div>
                          <div className="text-xs text-zinc-600">⭐ {rating} • {cityLabel}</div>
                          <div className="mt-2 text-xs text-zinc-500">Tap to view prices & ETA</div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl p-4 bg-white border border-zinc-200 text-sm text-zinc-600">No providers found yet.</div>
                );
              })()}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 min-h-[220px]">
            {selectedProvider ? (
              <ProviderDetails
                provider={selectedProvider}
                serviceKey={service.key}
                cityKey={selectedCity}
              />
            ) : (
              <div className="text-sm text-zinc-600">Select a provider to see prices and estimated arrival time.</div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function ProviderDetails({ provider, serviceKey, cityKey }: { provider: { id: string; name: string; city: string; rating: number }; serviceKey: string; cityKey: string; }) {
  const router = useRouter();
  const pidNum = useMemo(() => {
    const s = provider.id || "0";
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
    return Math.abs(h);
  }, [provider.id]);
  const tiers = useMemo(() => {
    const baseMultiplier = 1 + ((pidNum % 3) * 0.15);
    const round50 = (n: number) => Math.round(n / 50) * 50;
    if (serviceKey === "cleaning") return [
      { name: "Basic", price: round50(1500 * baseMultiplier) },
      { name: "Deep Clean", price: round50(3500 * baseMultiplier) },
      { name: "Move-out", price: round50(5000 * baseMultiplier) },
    ];
    if (serviceKey === "painting") return [
      { name: "Touch-up", price: round50(2500 * baseMultiplier) },
      { name: "1 Room", price: round50(6000 * baseMultiplier) },
      { name: "Full Home", price: round50(25000 * baseMultiplier) },
    ];
    if (serviceKey === "electrician") return [
      { name: "Inspection", price: round50(800 * baseMultiplier) },
      { name: "Repair", price: round50(1800 * baseMultiplier) },
      { name: "Installation", price: round50(2800 * baseMultiplier) },
    ];
    if (serviceKey === "plumbing") return [
      { name: "Leak Fix", price: round50(1200 * baseMultiplier) },
      { name: "Drain Clean", price: round50(1800 * baseMultiplier) },
      { name: "Fixture Install", price: round50(3000 * baseMultiplier) },
    ];
    return [
      { name: "Standard", price: round50(1500 * baseMultiplier) },
      { name: "Premium", price: round50(3000 * baseMultiplier) },
    ];
  }, [serviceKey, pidNum]);

  const etaDays = useMemo(() => {
    const base = cityKey ? 1 : 3;
    const add = pidNum % 3; // 0,1,2
    return Math.max(1, base + add);
  }, [cityKey, pidNum]);

  return (
    <div>
      <div className="text-zinc-900 font-medium">{provider.name}</div>
      <div className="text-xs text-zinc-600">⭐ {provider.rating} • {provider.city}</div>
      <div className="mt-3 text-sm text-zinc-700">Estimated arrival: {etaDays} day{etaDays>1?"s":""}</div>
      <div className="mt-3 grid gap-2">
        {tiers.map((t) => (
          <div key={t.name} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
            <div>
              <div className="text-sm font-medium text-zinc-800">{t.name}</div>
              <div className="text-xs text-zinc-600">NPR {t.price}</div>
            </div>
            <button
              onClick={() => {
                const params = new URLSearchParams();
                params.set("service", serviceKey);
                if (cityKey) params.set("city", cityKey);
                params.set("providerName", provider.name);
                params.set("providerId", String(provider.id));
                params.set("eta", String(etaDays));
                params.set("tier", t.name);
                router.push(`/post-job?${params.toString()}`);
              }}
              className="h-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white px-3 text-sm"
            >
              Book
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
