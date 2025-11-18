"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { db } from "@/lib/firebaseClient";
import { collection, deleteDoc, getDocs, onSnapshot, orderBy, query } from "firebase/firestore";

type LocalNotif = {
  id: string;
  title: string;
  providerName?: string;
  service?: string;
  tier?: string;
  etaAt?: number | null;
  createdAt: number; // epoch ms
};

export default function NotificationBell() {
  const { user } = useAuth() as any;
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<LocalNotif[]>([]);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    let unsub: undefined | (() => void);
    const i = setInterval(() => setNow(Date.now()), 1000 * 30);
    if (user?.uid) {
      try {
        const nref = collection(db, "users", user.uid, "notifications");
        const q = query(nref, orderBy("createdAt", "desc"));
        unsub = onSnapshot(q as any, (snap: any) => {
          const rows: LocalNotif[] = snap.docs.map((d: any) => {
            const v = d.data() || {};
            const ts = v.createdAt?.toMillis ? v.createdAt.toMillis() : (typeof v.createdAt === "number" ? v.createdAt : Date.now());
            return {
              id: d.id,
              title: v.title || "",
              providerName: v.providerName || undefined,
              service: v.service || undefined,
              tier: v.tier || undefined,
              etaAt: v.etaAt ?? null,
              createdAt: ts,
            } as LocalNotif;
          });
          setItems(rows);
        });
      } catch {
        setItems([]);
      }
    } else {
      setItems([]);
    }
    return () => {
      clearInterval(i);
      if (unsub) unsub();
    };
  }, [user?.uid]);

  const count = items.length;

  const rows = useMemo(() => {
    return items
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((n) => {
        const remainingMs = (n.etaAt || 0) - now;
        let remaining = "";
        if (n.etaAt) {
          if (remainingMs <= 0) remaining = "Arriving today";
          else {
            const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            remaining = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
          }
        }
        return {
          ...n,
          remaining,
        } as LocalNotif & { remaining: string };
      });
  }, [items, now]);

  const clearAll = async () => {
    if (!user?.uid) return;
    try {
      const nref = collection(db, "users", user.uid, "notifications");
      const snap = await getDocs(nref as any);
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      setItems([]);
    } catch {}
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-9 w-9 rounded-full border border-zinc-300 flex items-center justify-center hover:bg-white/70"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-rose-600 text-white text-xs px-1 flex items-center justify-center">
            {count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-zinc-200 bg-white shadow-lg p-2 z-50">
          <div className="px-2 py-1 text-sm font-medium text-zinc-800 flex items-center justify-between">
            Notifications
            {items.length > 0 && (
              <button onClick={clearAll} className="text-xs text-zinc-500 hover:text-zinc-800">Clear</button>
            )}
          </div>
          <div className="max-h-80 overflow-auto">
            {rows.length === 0 ? (
              <div className="p-3 text-sm text-zinc-600">No notifications yet.</div>
            ) : (
              rows.map((n) => (
                <div key={n.id} className="p-3 rounded-lg hover:bg-zinc-50">
                  <div className="text-sm font-medium text-zinc-900">{n.title}</div>
                  <div className="text-xs text-zinc-600">
                    {n.tier ? `${n.tier} • ` : ""}
                    {n.providerName || "Provider"}
                  </div>
                  {n.etaAt && (
                    <div className="text-xs text-zinc-600">ETA: {n.remaining}</div>
                  )}
                  <div className="mt-2">
                    <Link
                      href={`/track/${encodeURIComponent(n.id)}?providerName=${encodeURIComponent(n.providerName || "Provider")}${n.etaAt ? `&eta=${n.etaAt}` : ""}`}
                      className="inline-flex h-8 items-center rounded-full border border-rose-300 text-rose-600 hover:bg-rose-50 px-3 text-xs"
                    >
                      Track
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t mt-2 pt-2 px-2 text-right">
            <Link href="/dashboard/customer" className="text-sm text-rose-600">Go to Dashboard</Link>
          </div>
        </div>
      )}
    </div>
  );
}
