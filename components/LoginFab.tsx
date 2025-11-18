"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function LoginFab() {
  const { user, loading } = useAuth();
  if (loading || user) return null;
  return (
    <Link
      href="/login"
      className="fixed bottom-5 right-5 z-40 rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-sky-500 text-white px-4 py-2 text-sm shadow-lg hover:opacity-95"
    >
      Login
    </Link>
  );
}
