
"use client";

import Link from "next/link";
import { CITIES, SERVICES } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="bg-zinc-900 text-zinc-200 mt-12">
      <div className="mx-auto max-w-6xl px-6 py-12 grid gap-6 sm:grid-cols-4">
        <div>
          <div className="text-lg font-semibold">HamroSewa</div>
          <div className="text-sm text-zinc-400 mt-2">Local services across Kathmandu Valley.</div>
        </div>
        <div>
          <div className="text-sm font-medium mb-2">Cities</div>
          <ul className="text-sm space-y-1">
            {Object.entries(CITIES).map(([k, v]) => (
              <li key={k}><Link href={`/services?city=${k}`} className="hover:text-white">{v.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-sm font-medium mb-2">Services</div>
          <ul className="text-sm space-y-1">
            {SERVICES.slice(0,6).map((s) => (
              <li key={s.key}><Link href={`/services/${s.key}`} className="hover:text-white">{s.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-sm font-medium mb-2">Contact</div>
          <ul className="text-sm space-y-1">
            <li><a href="mailto:hamrosewa00@edu.np" className="hover:text-white">hamrosewa00@edu.np</a></li>
            <li><a href="tel:+9779800000001" className="hover:text-white">+977 980-000-0001</a></li>
            <li><a href="tel:+9779800000002" className="hover:text-white">+977 980-000-0002</a></li>
          </ul>
          <div className="text-sm font-medium mt-5 mb-2">Company</div>
          <ul className="text-sm space-y-1">
            <li><Link href="/about" className="hover:text-white">About</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-zinc-800 py-4 text-center text-xs text-zinc-500">© {new Date().getFullYear()} HamroSewa</div>
    </footer>
  );
}
