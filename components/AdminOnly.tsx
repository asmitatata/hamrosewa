"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const isAdmin = user?.email === "admin@admin.com";

  if (loading) return <div className="p-6 text-sm text-zinc-600">Loading...</div>;
  if (!user)
    return (
      <div className="p-6 text-sm text-zinc-700">
        You must be signed in to access admin. <Link href="/admin/login" className="text-rose-600 underline">Admin Login</Link>
      </div>
    );
  if (!isAdmin)
    return (
      <div className="p-6 text-sm text-zinc-700">You do not have admin permission.</div>
    );
  return <>{children}</>;
}
