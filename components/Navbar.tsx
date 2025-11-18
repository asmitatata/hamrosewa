"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/NotificationBell";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { user, profile, signInWithGoogle, signOutUser, loading } = useAuth() as any;
  const pathname = usePathname();
  const isActive = (href: string) => (pathname === href || (href !== "/" && pathname?.startsWith(href)));

  return (
    <header className="fixed top-0 inset-x-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/70 border-b border-white/40 shadow-sm">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-rose-600 via-amber-500 to-sky-600 tracking-tight">
          HamroSewa
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/" className={`px-3 py-1.5 rounded-md text-sm transition-colors ${isActive("/") ? "bg-rose-100 text-rose-700" : "text-zinc-700 hover:bg-zinc-100"}`}>
            Home
          </Link>
          <Link href="/about" className={`px-3 py-1.5 rounded-md text-sm transition-colors ${isActive("/about") ? "bg-rose-100 text-rose-700" : "text-zinc-700 hover:bg-zinc-100"}`}>
            About
          </Link>
          <NotificationBell />
          {user && (
            <Link
              href={profile?.role === "worker" ? "/dashboard/worker" : "/dashboard/customer"}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${isActive(profile?.role === "worker" ? "/dashboard/worker" : "/dashboard/customer") ? "bg-rose-100 text-rose-700" : "text-zinc-700 hover:bg-zinc-100"}`}
            >
              Dashboard
            </Link>
          )}
          {user && (
            <Link
              href="/profile"
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${isActive("/profile") ? "bg-rose-100 text-rose-700" : "text-zinc-700 hover:bg-zinc-100"}`}
            >
              Profile
            </Link>
          )}
          {user && (!profile?.role || !profile?.primaryService || !profile?.city) && (
            <Link href="/onboarding" className={`px-3 py-1.5 rounded-md text-sm transition-colors ${isActive("/onboarding") ? "bg-amber-100 text-amber-700" : "text-amber-700 hover:bg-amber-50"}`}>
              Complete profile
            </Link>
          )}
          {!user && (
            <Link
              href="/login"
              className="rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-sky-500 text-white px-4 py-2 text-sm shadow hover:opacity-95 transition-opacity"
            >
              Login
            </Link>
          )}
          {!loading && user && (
            <button
              onClick={signOutUser}
              className="rounded-full border border-rose-300 text-rose-600 px-4 py-2 text-sm hover:bg-rose-50 transition-colors"
            >
              Sign out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

