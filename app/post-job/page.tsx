"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { CITIES, SERVICES } from "@/lib/constants";
import { db } from "@/lib/firebaseClient";
import { addDoc, collection, serverTimestamp, doc, setDoc, getDoc } from "firebase/firestore";

export default function PostJobPage() {
  const { user, loading } = useAuth();
  const sp = useSearchParams();
  const router = useRouter();

  const [service, setService] = useState<string>(sp.get("service") || "");
  const [city, setCity] = useState<string>(sp.get("city") || "");
  const providerName = sp.get("providerName") || "";
  const providerId = sp.get("providerId") || "";
  const tier = sp.get("tier") || "";
  const etaDaysParam = sp.get("eta");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [lastJobId, setLastJobId] = useState<string>("");
  const [lastEtaAt, setLastEtaAt] = useState<number | undefined>(undefined);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=/post-job${service ? `?service=${service}` : ""}`);
    }
  }, [loading, user, router, service]);

  const canSubmit = useMemo(() => !!service && !!city && description.trim().length >= 10 && !!date && !!time, [service, city, description, date, time]);

  const submit = async () => {
    if (!user || !canSubmit) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const payload: any = {
        customerId: user.uid,
        service,
        city,
        description: description.trim(),
        createdAt: serverTimestamp(),
      };
      // Validate providerId corresponds to an existing user with role 'worker'
      if (providerId) {
        try {
          const uSnap = await getDoc(doc(db, "users", providerId));
          const uData = uSnap.exists() ? (uSnap.data() as any) : null;
          if (uData && (uData.role === 'worker' || !uData.role)) {
            payload.assignedWorkerId = providerId;
            if (providerName) payload.assignedWorkerName = providerName;
            payload.status = "assigned";
          } else {
            payload.status = "open";
          }
        } catch {
          payload.status = "open";
        }
      } else {
        payload.status = "open";
      }
      try {
        const dt = new Date(`${date}T${time}`);
        if (!isNaN(dt.getTime())) payload.scheduledAt = dt;
      } catch {}
      const docRef = await addDoc(collection(db, "jobs"), payload);
      setMessage({ type: "success", text: "Job posted successfully! We'll notify nearby workers." });
      setLastJobId(docRef.id);
      setDescription("");
      setDate("");
      setTime("");
      // Write a per-user notification in Firestore (customer)
      try {
        const etaDaysNum = etaDaysParam ? parseInt(etaDaysParam, 10) : NaN;
        const etaAt = !isNaN(etaDaysNum) ? Date.now() + etaDaysNum * 24 * 60 * 60 * 1000 : undefined;
        setLastEtaAt(etaAt);
        const nref = doc(db, "users", user.uid, "notifications", docRef.id);
        await setDoc(nref, {
          title: `Booked: ${service.charAt(0).toUpperCase() + service.slice(1)}`,
          providerName: providerName || null,
          service: service || null,
          tier: tier || null,
          etaAt: etaAt || null,
          createdAt: serverTimestamp(),
        }, { merge: true });
      } catch {}

      // If a specific provider was selected, notify the worker too
      try {
        if (payload.assignedWorkerId) {
          const wref = doc(db, "users", providerId, "notifications", docRef.id);
          await setDoc(wref, {
            title: `New job for you`,
            service: service || null,
            city: city || null,
            // mark who created this notification to satisfy rules allowing cross-user create
            from: user.uid,
            createdAt: serverTimestamp(),
          }, { merge: true });
        }
      } catch {}
    } catch (e: any) {
      const msg = e?.message || "Failed to post job.";
      const friendly = msg.includes("Missing or insufficient permissions")
        ? "Permission denied: please update Firestore rules to allow a signed-in user to create jobs."
        : msg;
      setMessage({ type: "error", text: friendly });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-4">Post a Job</h1>
      <p className="text-sm text-zinc-600 mb-4">Tell us what you need and we’ll match you with nearby professionals.</p>

      {message?.type === "success" ? (
        <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-800 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 text-6xl animate-bounce">🎉</div>
          <div className="absolute -bottom-3 -left-3 text-5xl animate-pulse">✅</div>
          <div className="text-xl font-semibold">Thank you! Your job has been posted.</div>
          <div className="text-sm mt-1">We’ll notify nearby workers and keep you updated.</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard/customer" className="inline-flex h-9 items-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 text-sm">Go to Dashboard</Link>
            <button
              onClick={() => { setService(""); setCity(""); setDescription(""); setMessage(null); }}
              className="inline-flex h-9 items-center rounded-full border border-emerald-300 text-emerald-800 hover:bg-emerald-100 px-4 text-sm"
            >
              Post Another Job
            </button>
            <Link href="/services" className="inline-flex h-9 items-center rounded-full border border-zinc-300 text-zinc-700 hover:bg-zinc-50 px-4 text-sm">Browse Services</Link>
          </div>
        </div>
      ) : message?.type === "error" ? (
        <div className={`mb-4 rounded-md px-3 py-2 text-sm border bg-rose-50 border-rose-300 text-rose-700`}>
          {message.text}
        </div>
      ) : null}

      {message?.type !== "success" && (
      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Service</label>
          <select value={service} onChange={(e) => setService(e.target.value)} className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white">
            <option value="">Choose a service</option>
            {SERVICES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">City</label>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white">
            <option value="">Select city</option>
            {Object.entries(CITIES).map(([k, v]) => (
              <option key={k} value={k}>{v.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Describe your need</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="E.g., 2BHK deep cleaning needed this weekend."
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 bg-white"
          />
          <div className="text-xs text-zinc-500 mt-1">At least 10 characters</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Preferred date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Preferred time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            disabled={!canSubmit || submitting}
            onClick={submit}
            className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 text-sm shadow disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Post Job"}
          </button>
        </div>
      </div>
      )}
    </main>
  );
}
