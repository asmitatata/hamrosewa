"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CITIES, SERVICES } from "@/lib/constants";
import { useAuth } from "@/components/AuthProvider";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function Home() {
  const { user } = useAuth();
  const [city, setCity] = useState<string>("");
  const [service, setService] = useState<string>("");
  const cityName = useMemo(() => (city ? CITIES[city as keyof typeof CITIES].name : ""), [city]);
  const searchHref = useMemo(() => {
    if (city && service) return `/services/${service}?city=${city}`;
    if (service) return `/services/${service}`;
    if (city) return `/services?city=${city}`;
    return "/services";
  }, [city, service]);

  return (
    <div className="min-h-screen font-sans">
      <section className="relative isolate overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900">
                Book trusted home services in Kathmandu Valley
              </h1>
              <p className="mt-4 text-lg text-zinc-600">
                From painting and plumbing to cleaning and electricians. Fast, reliable, and nearby.
              </p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select value={city} onChange={(e) => setCity((e.target as HTMLSelectElement).value)}>
                  <option value="">Select city</option>
                  {Object.entries(CITIES).map(([k, v]) => (
                    <option key={k} value={k}>{v.name}</option>
                  ))}
                </Select>
                <Select value={service} onChange={(e) => setService((e.target as HTMLSelectElement).value)}>
                  <option value="">Choose service</option>
                  {SERVICES.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </Select>
                <Link href={searchHref}>
                  <Button className="w-full" disabled={!city || !service}>
                    Search
                  </Button>
                </Link>
              </div>
              <div className="mt-3 text-sm text-zinc-600">
                {cityName ? `Showing services in ${cityName}` : "Pick a city to get started"}
              </div>
              {!user && (
                <div className="mt-6">
                  <Link href="/login" className="inline-block rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-sky-500 text-white px-4 py-2 text-sm shadow hover:opacity-95">
                    Login
                  </Link>
                </div>
              )}
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-rose-200 via-amber-200 to-sky-200 shadow-inner flex items-center justify-center">
                <div className="text-6xl">🏠🧰🔧🧹🎨</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/60">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-6">Popular Services</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {SERVICES.map((s) => (
              <Card key={s.key} className="p-4 text-center hover:shadow-sm">
                <Link href={`/services/${s.key}?city=${city}`} className="block">
                  <div className="text-2xl mb-2">{iconForService(s.key)}</div>
                  <div className="text-sm font-medium text-zinc-800">{s.label}</div>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-6 py-16 grid gap-8 md:grid-cols-3">
          <Feature title="Verified Professionals" desc="Background-checked workers with ratings and reviews." gradient="from-emerald-100 to-emerald-200"/>
          <Feature title="Upfront Pricing" desc="Clear prices before you book. No surprises." gradient="from-amber-100 to-amber-200"/>
          <Feature title="Fast Support" desc="We’re here to help you 7 days a week." gradient="from-sky-100 to-sky-200"/>
        </div>
      </section>

      {/* Live recommendations are shown on service detail pages; homepage no longer reads offline reco.json */}

      <section className="bg-white/60">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-8">How it works</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <Step n={1} title="Choose a service" desc="Select from cleaning, plumbing, electrician, and more."/>
            <Step n={2} title="Pick your city" desc="Kathmandu, Lalitpur, or Bhaktapur."/>
            <Step n={3} title="Book and relax" desc="We connect you with top-rated nearby pros."/>
          </div>
        </div>
      </section>

      
    </div>
  );
}

function Feature({ title, desc, gradient }: { title: string; desc: string; gradient: string }) {
  return (
    <div className={`rounded-2xl p-6 border border-zinc-200 bg-gradient-to-br ${gradient}`}>
      <div className="text-lg font-semibold text-zinc-900">{title}</div>
      <div className="text-sm text-zinc-700 mt-1">{desc}</div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-2xl p-6 border bg-white border-zinc-200">
      <div className="h-8 w-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-sm font-semibold">{n}</div>
      <div className="mt-3 font-medium text-zinc-900">{title}</div>
      <div className="text-sm text-zinc-600">{desc}</div>
    </div>
  );
}

function iconForService(key: string) {
  switch (key) {
    case "painting":
      return "🎨";
    case "plumbing":
      return "🚰";
    case "electrician":
      return "💡";
    case "cleaning":
      return "🧹";
    case "gardening":
      return "🌿";
    case "pest-control":
      return "🐜";
    case "dial-a-driver":
      return "🚗";
    case "carpenter":
      return "🪚";
    default:
      return "🧰";
  }
}
