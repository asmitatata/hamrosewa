"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebaseClient";

export default function LoginPage() {
  const { user, profile, loading, signInWithEmail } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busyEmail, setBusyEmail] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (profile?.role && profile?.primaryService && profile?.city) {
        router.replace(next || "/");
      } else {
        router.replace("/onboarding");
      }
    }
  }, [loading, user, profile, router, next]);

  const doGoogle = async () => {
    setError("");
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (e2: any) {
        setError(e2?.message || "Sign-in failed. Please try again.");
        setBusy(false);
      }
    }
  };

  const doEmail = async () => {
    setError("");
    setBusyEmail(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (e: any) {
      setError(e?.message || "Email sign-in failed.");
    } finally {
      setBusyEmail(false);
    }
  };

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Sign in</h1>
        <p className="text-sm text-zinc-600 mb-6">Use Google or email to continue.</p>
        {error && (
          <div className="mb-4 rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{error}</div>
        )}

        <div className="grid gap-3">
          <button
            onClick={doGoogle}
            disabled={busy}
            className="w-full rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-sky-500 text-white px-4 py-2 text-sm shadow hover:opacity-95 disabled:opacity-60"
          >
            {busy ? "Signing in..." : "Continue with Google"}
          </button>

          <div className="relative my-4 text-center text-xs text-zinc-500">
            <span className="px-2 bg-white">or</span>
            <div className="absolute left-0 right-0 top-1/2 h-px bg-zinc-200 -z-10" />
          </div>

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
            placeholder="Password"
            className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white"
          />
          <button
            onClick={doEmail}
            disabled={busyEmail || !email || !password}
            className="w-full rounded-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-sm shadow disabled:opacity-50"
          >
            {busyEmail ? "Signing in..." : "Sign in with Email"}
          </button>
          <div className="text-xs text-zinc-600">
            Don’t have an account? <Link href="/signup" className="text-rose-600">Create one</Link>
          </div>
        </div>

        <p className="mt-4 text-xs text-zinc-500">If popup is blocked, we automatically try redirect sign-in.</p>
      </div>
    </main>
  );
}
