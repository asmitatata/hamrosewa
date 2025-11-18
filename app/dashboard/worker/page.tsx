"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebaseClient";
import { collection, getDocs, limit, query, where, orderBy, addDoc, doc, setDoc, serverTimestamp, updateDoc, onSnapshot, getDoc } from "firebase/firestore";
import { CITIES } from "@/lib/constants";

interface JobItem {
  id: string;
  service: string;
  city: string;
  description: string;
  status: string;
  createdAt?: any;
  scheduledAt?: any;
  customerId?: string;
}

export default function WorkerDashboard() {
  const { profile, loading } = useAuth();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [assigned, setAssigned] = useState<JobItem[]>([]);
  const [err, setErr] = useState("");
  const [customers, setCustomers] = useState<Record<string, any>>({});
  const [assignedFilter, setAssignedFilter] = useState<'all'|'assigned'|'in_progress'|'completed'>('all');

  const filters = useMemo(() => ({ city: profile?.city, service: profile?.primaryService }), [profile]);

  useEffect(() => {
    const run = async () => {
      if (!profile) return;
      setErr("");

      // Subscribe to assigned jobs (real-time)
      let unsub: (() => void) | undefined;
      try {
        const base = [collection(db, "jobs"), where("assignedWorkerId", "==", profile.uid)] as any[];
        const qAssigned = query(base[0], base[1], orderBy("createdAt", "desc"));
        unsub = onSnapshot(qAssigned as any, (snapshot: any) => {
          setAssigned(snapshot.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })) as JobItem[]);
        }, (e: any) => {
          if (String(e?.message || e).includes("Missing or insufficient permissions")) {
            setErr("Permission denied when loading assigned jobs. Update Firestore rules to allow workers to read jobs assigned to them.");
          }
        });
      } catch {
        // fallback without orderBy if index missing
        try {
          const base = [collection(db, "jobs"), where("assignedWorkerId", "==", profile.uid)] as any[];
          const qAssigned = query(base[0], base[1]);
          unsub = onSnapshot(qAssigned as any, (snapshot: any) => {
            setAssigned(snapshot.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })) as JobItem[]);
          });
        } catch {}
      }

      return unsub;
    };
    if (!loading) {
      const maybeUnsub = run();
      return () => {
        Promise.resolve(maybeUnsub).then((unsub) => {
          if (typeof unsub === 'function') try { unsub(); } catch {}
        });
      };
    }
  }, [loading, filters.city, filters.service, profile?.uid]);

  useEffect(() => {
    const loadCustomers = async () => {
      const ids = Array.from(new Set(assigned.map((j) => j.customerId).filter(Boolean))) as string[];
      const missing = ids.filter((id) => !customers[id]);
      if (missing.length === 0) return;
      try {
        const pairs = await Promise.all(missing.map(async (id) => {
          try {
            const snap = await getDoc(doc(db, "users", id));
            return [id, snap.exists() ? snap.data() : null] as const;
          } catch { return [id, null] as const; }
        }));
        const map: Record<string, any> = { ...customers };
        for (const [id, data] of pairs) map[id] = data;
        setCustomers(map);
      } catch {}
    };
    if (assigned.length) loadCustomers();
  }, [assigned]);

  const formatWhen = (j: JobItem) => {
    const ts: any = j.scheduledAt;
    let d: Date | null = null;
    if (!ts) return null;
    if (ts?.toDate) {
      try { d = ts.toDate(); } catch {}
    } else if (typeof ts?.seconds === "number") {
      d = new Date(ts.seconds * 1000);
    } else if (typeof ts === "string" || ts instanceof Date) {
      d = new Date(ts as any);
    }
    return d ? d.toLocaleString() : null;
  };

  const formatStatus = (s: string) => {
    if (s === "in_progress") return "Started";
    if (s === "assigned") return "Assigned";
    if (s === "completed") return "Completed";
    return "Open";
  };

  const assignedFiltered = useMemo(() => {
    if (assignedFilter === 'completed') return assigned.filter((j) => j.status === 'completed');
    if (assignedFilter === 'assigned') return assigned.filter((j) => j.status === 'assigned');
    if (assignedFilter === 'in_progress') return assigned.filter((j) => j.status === 'in_progress');
    return assigned;
  }, [assigned, assignedFilter]);

  const setStatus = async (jobId: string, status: "in_progress" | "completed") => {
    // Optimistic update
    let previous: JobItem | undefined;
    setAssigned((prev) => {
      previous = prev.find((j) => j.id === jobId);
      return prev.map((j) => (j.id === jobId ? { ...j, status } : j));
    });
    try {
      await updateDoc(doc(db, "jobs", jobId), { status } as any);
    } catch (e: any) {
      // Revert and show error banner
      setAssigned((prev) => prev.map((j) => (j.id === jobId && previous ? { ...j, status: previous!.status } : j)));
      setErr(e?.message || "Failed to update status. Please check permissions.");
    }
  };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-4">Worker Dashboard</h1>
      {err && (
        <div className="mb-4 rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{err}</div>
      )}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-zinc-900">Your jobs</h2>
          <div className="flex items-center gap-2 text-sm">
            <button className={`h-8 px-3 rounded-md border ${assignedFilter==='all'?'bg-zinc-900 text-white border-zinc-900':'bg-white text-zinc-700 border-zinc-300'}`} onClick={()=>setAssignedFilter('all')}>All</button>
            <button className={`h-8 px-3 rounded-md border ${assignedFilter==='assigned'?'bg-zinc-900 text-white border-zinc-900':'bg-white text-zinc-700 border-zinc-300'}`} onClick={()=>setAssignedFilter('assigned')}>Assigned</button>
            <button className={`h-8 px-3 rounded-md border ${assignedFilter==='in_progress'?'bg-zinc-900 text-white border-zinc-900':'bg-white text-zinc-700 border-zinc-300'}`} onClick={()=>setAssignedFilter('in_progress')}>Started</button>
            <button className={`h-8 px-3 rounded-md border ${assignedFilter==='completed'?'bg-zinc-900 text-white border-zinc-900':'bg-white text-zinc-700 border-zinc-300'}`} onClick={()=>setAssignedFilter('completed')}>Completed</button>
          </div>
        </div>
        {assignedFiltered.length === 0 ? (
          <div className="rounded-xl p-6 bg-white border border-zinc-200">No assigned jobs yet.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {assignedFiltered.map((j) => (
              <div key={j.id} className="rounded-xl p-4 bg-white border border-zinc-200">
                <div className="font-medium text-zinc-900 capitalize">{j.service} • {j.city}</div>
                <div className="mt-2 text-sm text-zinc-700 line-clamp-2">{j.description}</div>
                <div className="text-xs text-zinc-600 mt-1">Status: {formatStatus(j.status)}</div>
                {j.customerId && (
                  <div className="text-xs text-zinc-600">Customer: {customers[j.customerId]?.name || "Customer"}{customers[j.customerId]?.phone ? ` • ${customers[j.customerId]?.phone}` : ""}</div>
                )}
                {formatWhen(j) && (
                  <div className="text-xs text-zinc-600">Scheduled: {formatWhen(j)}</div>
                )}
                {(j.status === "assigned" || j.status === "in_progress") && (
                  <div className="mt-3 flex items-center gap-2">
                    {j.status !== "in_progress" && (
                      <button
                        className="h-8 rounded-md bg-amber-600 hover:bg-amber-700 text-white px-3 text-xs"
                        onClick={() => setStatus(j.id, "in_progress")}
                      >Start</button>
                    )}
                    <button
                      className="h-8 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-3 text-xs"
                      onClick={() => setStatus(j.id, "completed")}
                    >Mark completed</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
