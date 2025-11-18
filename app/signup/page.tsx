"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function SignupPage() {
  const { user, profile, loading, signUpWithEmail } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      if (profile?.role && profile?.primaryService && profile?.city) {
        router.replace(next || (profile.role === "worker" ? "/dashboard/worker" : "/dashboard/customer"));
      } else {
        router.replace("/onboarding");
      }
    }
  }, [loading, user, profile, router, next]);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
    } catch (e: any) {
      setError(e?.message || "Signup failed.");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Create account</h1>
        <p className="text-sm text-zinc-600 mb-6">Sign up with your email to get started.</p>
        {error && (
          <div className="mb-4 rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{error}</div>
        )}
        <div className="grid gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 characters)"
            className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white"
          />
          <button
            onClick={submit}
            disabled={busy || !email || !password || !name}
            className="w-full rounded-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-sm shadow disabled:opacity-50"
          >
            {busy ? "Creating..." : "Create account"}
          </button>
          <div className="text-xs text-zinc-600">
            Already have an account? <Link href="/login" className="text-rose-600">Sign in</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
