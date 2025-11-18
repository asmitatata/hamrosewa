"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function AdminLoginPage() {
  const { signInWithEmail } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("admin@admin.com");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      await signInWithEmail(email, password);
      router.push("/admin");
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <main className="mx-auto max-w-md p-6">
      <Card className="p-6">
        <h1 className="text-xl font-semibold text-zinc-900 mb-4">Admin Login</h1>
        {err && <div className="mb-3 rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{err}</div>}
        <form onSubmit={onSubmit} className="grid gap-3">
          <div>
            <label className="block text-sm text-zinc-700 mb-1">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-700 mb-1">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white"
              required
            />
          </div>
          <Button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
        </form>
      </Card>
    </main>
  );
}
