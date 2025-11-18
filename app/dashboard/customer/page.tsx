"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebaseClient";
import { collection, getDocs, limit, orderBy, query, where, doc, getDoc, updateDoc, setDoc, startAfter } from "firebase/firestore";
import { scoreWorkers } from "@/lib/reco";

interface JobItem {
  id: string;
  service: string;
  city: string;
  description: string;
  status: string;
  createdAt?: any;
  scheduledAt?: any;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  customerRating?: number;
}

interface WorkerItem {
  uid: string;
  name?: string;
  primaryService?: string;
  city?: string;
  ratingAvg?: number;
  ratingCount?: number;
}

interface NotificationItem {
  id: string;
  title?: string | null;
  providerName?: string | null;
  service?: string | null;
  tier?: string | null;
  etaAt?: any;
  createdAt?: any;
}

export default function CustomerDashboard() {
  const { user, profile, loading } = useAuth();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [err, setErr] = useState("");
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, number>>({});
  const [ratingSaving, setRatingSaving] = useState<Record<string, boolean>>({});
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsLastDoc, setJobsLastDoc] = useState<any>(null);
  const [jobsHasMore, setJobsHasMore] = useState(false);
  const [providers, setProviders] = useState<Record<string, any>>({});

  const cityName = useMemo(() => profile?.city, [profile]);
  const jobsById = useMemo(() => {
    const m: Record<string, JobItem> = {} as any;
    for (const j of jobs) m[j.id] = j;
    return m;
  }, [jobs]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setErr("");
      try {
        await loadJobs(true);
      } catch (e: any) {
        if (String(e?.message || e).includes("Missing or insufficient permissions")) {
          setErr("Permission denied when loading your jobs. Please ensure Firestore rules allow owners to read their jobs.");
        }
      }

      try {
        const wq = query(
          collection(db, "users"),
          where("role", "==", "worker"),
          limit(25)
        );
        const ws = await getDocs(wq as any);
        const raw = ws.docs.map((d) => d.data() as any);
        // Client-side recommendation: score by rating and distance to customer's city
        const scored = scoreWorkers(
          raw.map((w) => ({
            uid: w.uid,
            name: w.name,
            city: w.city,
            primaryService: w.primaryService,
            ratingAvg: w.ratingAvg,
            ratingCount: w.ratingCount,
          })),
          { city: (profile?.city as any) || undefined }
        );
        setWorkers(scored.slice(0, 6));
      } catch (e) {
        // ignore silently (may be blocked by rules)
      }

      // Load user's notifications
      try {
        const nq = query(
          collection(db, "users", user.uid, "notifications"),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const ns = await getDocs(nq as any);
        setNotifications(ns.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as NotificationItem[]);
      } catch (e) {
        // ignore silently (may be blocked by rules)
      }
    };
    if (!loading) fetchData();
  }, [loading, user, profile]);

  const loadJobs = async (initial = false) => {
    if (!user || jobsLoading) return;
    setJobsLoading(true);
    try {
      // Try ordered query first
      let snap: any;
      try {
        const base = [collection(db, "jobs"), where("customerId", "==", user.uid), orderBy("createdAt", "desc"), limit(20)] as any[];
        const jq = initial || !jobsLastDoc ? query(base[0], base[1], base[2], base[3]) : query(base[0], base[1], base[2], startAfter(jobsLastDoc), base[3]);
        snap = await getDocs(jq as any);
      } catch (e: any) {
        // Fallback without orderBy (works without composite index)
        const base = [collection(db, "jobs"), where("customerId", "==", user.uid), limit(20)] as any[];
        const jq = initial || !jobsLastDoc ? query(base[0], base[1], base[2]) : query(base[0], base[1], startAfter(jobsLastDoc), base[2]);
        snap = await getDocs(jq as any);
      }
      const batch = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })) as JobItem[];
      setJobs((prev) => (initial ? batch : [...prev, ...batch]));
      const last = snap.docs[snap.docs.length - 1] || null;
      setJobsLastDoc(last);
      setJobsHasMore(Boolean(last));
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    // Load assigned worker details for visible jobs
    const loadProviders = async () => {
      const ids = Array.from(new Set(jobs.map((j) => j.assignedWorkerId).filter(Boolean))) as string[];
      const missing = ids.filter((id) => !providers[id]);
      if (missing.length === 0) return;
      const pairs = await Promise.all(missing.map(async (id) => {
        try {
          const ps = await getDoc(doc(db, "users", id));
          return [id, ps.exists() ? ps.data() : null] as const;
        } catch {
          return [id, null] as const;
        }
      }));
      const next: Record<string, any> = { ...providers };
      for (const [id, data] of pairs) next[id] = data;
      setProviders(next);
    };
    if (jobs.length) loadProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  const formatWhen = (ts: any) => {
    if (!ts) return null;
    try {
      if (ts?.toDate) return ts.toDate().toLocaleString();
      if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000).toLocaleString();
      const d = new Date(ts);
      return isNaN(d.getTime()) ? null : d.toLocaleString();
    } catch {
      return null;
    }
  };

  const formatStatus = (s: string) => {
    if (s === "in_progress") return "Started";
    if (s === "assigned") return "Assigned";
    if (s === "completed") return "Completed";
    return "Open";
  };

  const submitRating = async (job: JobItem) => {
    const val = ratingDrafts[job.id];
    if (!user || !job.assignedWorkerId || !(val >= 1 && val <= 5)) return;
    // If already rated (in current state), do nothing
    if (jobsById[job.id]?.customerRating) return;
    setRatingSaving((m) => ({ ...m, [job.id]: true }));
    let previous: JobItem | undefined = jobsById[job.id];
    try {
      // Optimistically update UI
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, customerRating: val } : j)));

      // 1) Persist rating on the job document (authoritative)
      try {
        await updateDoc(doc(db, "jobs", job.id), { customerRating: val } as any);
      } catch (e) {
        throw e; // bubble up: if this fails, we must revert and show error
      }

      // 2) Best-effort: update provider aggregates (non-critical)
      try {
        const pref = doc(db, "providers", job.assignedWorkerId);
        const ps = await getDoc(pref);
        const pdata = ps.exists() ? (ps.data() as any) : {};
        const oldAvg = Number(pdata.ratingAvg || 0);
        const oldCount = Number(pdata.ratingCount || 0);
        const newCount = oldCount + 1;
        const newAvg = newCount > 0 ? (oldAvg * oldCount + val) / newCount : val;
        await setDoc(pref, { ratingAvg: newAvg, ratingCount: newCount, uid: job.assignedWorkerId }, { merge: true });
      } catch {
        // ignore silently (rules may block customers from writing providers)
      }

      // Clear draft to avoid re-enabling the button if UI briefly flashes
      setRatingDrafts((prev) => { const next = { ...prev }; delete next[job.id]; return next; });
    } catch (e) {
      // Revert optimistic update and surface error
      setJobs((prev) => prev.map((j) => (j.id === job.id && previous ? { ...j, customerRating: previous.customerRating } : j)));
      setErr("Failed to submit rating. Please try again.");
    } finally {
      setRatingSaving((m) => ({ ...m, [job.id]: false }));
    }
  };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="grid gap-6 md:grid-cols-5">
        <section className="md:col-span-3">
          <h1 className="text-2xl font-semibold text-zinc-900 mb-4">Your recent jobs</h1>
          {err && (
            <div className="mb-4 rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{err}</div>
          )}
          {jobs.length === 0 ? (
            <div className="rounded-xl p-6 bg-white border border-zinc-200">No jobs yet.</div>
          ) : (
            <div className="grid gap-3">
              {jobs.map((j, idx) => (
                <div key={j.id || `job-${idx}`} className="rounded-xl p-4 bg-white border border-zinc-200">
                  <div className="font-medium text-zinc-900 capitalize">{j.service} • {j.city}</div>
                  <div className="mt-1 text-sm text-zinc-700 line-clamp-2">{j.description}</div>
                  <div className="text-xs text-zinc-600 mt-1">Status: {formatStatus(j.status)}</div>
                  {j.assignedWorkerId && (
                    <div className="text-xs text-zinc-600">Worker: {providers[j.assignedWorkerId]?.name || j.assignedWorkerName || "Assigned"}{providers[j.assignedWorkerId]?.phone ? ` • ${providers[j.assignedWorkerId]?.phone}` : ""}</div>
                  )}
                  <div className="mt-2">
                    <Link href={`/track/${encodeURIComponent(j.id)}${(providers[j.assignedWorkerId || ""]?.name || j.assignedWorkerName) ? `?providerName=${encodeURIComponent((providers[j.assignedWorkerId || ""]?.name || j.assignedWorkerName) as string)}` : ""}`} className="inline-flex h-8 items-center rounded-full border border-rose-300 text-rose-600 hover:bg-rose-50 px-3 text-xs">
                      Track
                    </Link>
                  </div>
                  {j.status === 'completed' && j.assignedWorkerId && !j.customerRating && (
                    <div className="mt-3 flex items-center gap-2">
                      <label className="text-xs text-zinc-700">Rate your provider:</label>
                      <select
                        className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-sm"
                        value={ratingDrafts[j.id] ?? ''}
                        onChange={(e) => setRatingDrafts((m) => ({ ...m, [j.id]: Number(e.target.value) }))}
                      >
                        <option value="">Select</option>
                        <option value={5}>5</option>
                        <option value={4}>4</option>
                        <option value={3}>3</option>
                        <option value={2}>2</option>
                        <option value={1}>1</option>
                      </select>
                      <button
                        disabled={!ratingDrafts[j.id] || ratingSaving[j.id]}
                        onClick={() => submitRating(j)}
                        className="h-8 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-3 text-xs disabled:opacity-50"
                      >
                        {ratingSaving[j.id] ? 'Saving...' : 'Submit rating'}
                      </button>
                    </div>
                  )}
                  {j.customerRating && (
                    <div className="text-xs text-emerald-700 mt-2">Your rating: {j.customerRating} ★</div>
                  )}
                </div>
              ))}
              {jobsHasMore && (
                <div className="flex justify-center">
                  <button
                    disabled={jobsLoading}
                    onClick={() => loadJobs(false)}
                    className="h-9 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white px-4 text-sm disabled:opacity-50"
                  >
                    {jobsLoading ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
        <aside className="md:col-span-2">
          <h2 className="text-lg font-medium text-zinc-900 mb-3">Recommended providers</h2>
          {workers.length === 0 ? (
            <div className="rounded-xl p-4 bg-white border border-zinc-200">No providers yet.</div>
          ) : (
            <div className="grid gap-2">
              {workers.map((w, idx) => (
                <Link key={w.uid || `worker-${idx}`} href={`/post-job?providerId=${w.uid}&providerName=${encodeURIComponent(w.name || "").replace(/%20/g, "+")}&service=${w.primaryService || ""}&city=${w.city || ""}`} className="rounded-lg p-3 bg-white border border-zinc-200 hover:border-zinc-300">
                  <div className="text-sm font-medium text-zinc-900">{w.name || "Unnamed"}</div>
                  <div className="text-xs text-zinc-600">{w.primaryService || "service"} • {w.city || "city"}</div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-6">
            <h2 className="text-lg font-medium text-zinc-900 mb-3">Notifications</h2>
            {notifications.length === 0 ? (
              <div className="rounded-xl p-4 bg-white border border-zinc-200">No notifications yet.</div>
            ) : (
              <div className="grid gap-2">
                {notifications.map((n, idx) => (
                  <div key={n.id || `note-${idx}`} className="rounded-lg p-3 bg-white border border-zinc-200">
                    <div className="text-sm font-medium text-zinc-900">{n.title || "Update"}</div>
                    <div className="text-xs text-zinc-600">
                      {(n.service || n.tier) && (
                        <span>{n.service || ""}{n.tier ? ` • ${n.tier}` : ""}</span>
                      )}
                      {n.providerName && (
                        <span>{(n.service || n.tier) ? " • " : ""}With: {n.providerName}</span>
                      )}
                    </div>
                    {(() => {
                      const j = jobsById[n.id];
                      const when = j ? formatWhen(j.scheduledAt) : null;
                      return when ? (
                        <div className="text-xs text-zinc-600">Date: {when}</div>
                      ) : null;
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
