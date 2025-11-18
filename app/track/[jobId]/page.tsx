"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebaseClient";
import { doc, onSnapshot } from "firebase/firestore";

type ChatMsg = { id: string; from: "you" | "provider"; text: string; ts: number };

function readChat(jobId: string): ChatMsg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`hamrosewa.chat.${jobId}`);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    const normalized: ChatMsg[] = arr.map((a: any) => ({
      id: String(a?.id || Date.now()),
      from: a?.from === "you" ? "you" : "provider",
      text: String(a?.text || ""),
      ts: Number(a?.ts || Date.now()),
    }));
    return normalized;
  } catch {
    return [];
  }
}

function writeChat(jobId: string, msgs: ChatMsg[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`hamrosewa.chat.${jobId}`, JSON.stringify(msgs.slice(-200)));
  } catch {}
}

export default function TrackPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const sp = useSearchParams();
  const { user } = useAuth() as any;
  const providerName = sp.get("providerName") || "Provider";
  const etaAtParam = sp.get("eta");
  const [etaAtFb, setEtaAtFb] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!user?.uid || !jobId) return;
    const nref = doc(db, "users", user.uid, "notifications", jobId);
    const unsub = onSnapshot(nref as any, (snap: any) => {
      const v = snap.data?.() || snap.data() || {};
      const eta = v.etaAt ?? undefined;
      setEtaAtFb(typeof eta === "number" ? eta : undefined);
    });
    return () => unsub();
  }, [user?.uid, jobId]);
  const etaAt = etaAtParam ? Number(etaAtParam) : etaAtFb;

  const [now, setNow] = useState<number>(Date.now());
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    setMsgs(readChat(jobId));
    const i = setInterval(() => setNow(Date.now()), 1000 * 30);
    return () => clearInterval(i);
  }, [jobId]);

  const remaining = useMemo(() => {
    if (!etaAt) return "ETA unavailable";
    const diff = etaAt - now;
    if (diff <= 0) return "Arriving today";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }, [etaAt, now]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const msg: ChatMsg = { id: String(Date.now()), from: "you", text, ts: Date.now() };
    const next: ChatMsg[] = [...msgs, msg];
    setMsgs(next);
    writeChat(jobId, next);
    setInput("");
    setTimeout(() => {
      const reply: ChatMsg = { id: String(Date.now()+1), from: "provider", text: "Noted. See you soon!", ts: Date.now()+1 };
      const nn: ChatMsg[] = [...next, reply];
      setMsgs(nn);
      writeChat(jobId, nn);
    }, 700);
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Track your provider</h1>
      <div className="mt-2 text-sm text-zinc-600">Job ID: {jobId}</div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="text-sm text-zinc-600">Provider</div>
          <div className="text-lg font-medium text-zinc-900">{providerName}</div>
          <div className="mt-3 text-sm text-zinc-600">Estimated arrival</div>
          <div className="text-2xl font-semibold text-rose-600">{remaining}</div>
          <div className="mt-4 h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-sky-500 animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col">
          <div className="text-sm font-medium text-zinc-900 mb-2">Chat</div>
          <div className="flex-1 overflow-auto rounded-lg border border-zinc-200 p-3 bg-zinc-50 space-y-2" style={{ maxHeight: 300 }}>
            {msgs.length === 0 ? (
              <div className="text-sm text-zinc-500">No messages yet. Say hello to your provider.</div>
            ) : (
              msgs.map((m) => (
                <div key={m.id} className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${m.from === "you" ? "ml-auto bg-rose-600 text-white" : "bg-white border border-zinc-200"}`}>
                  {m.text}
                  <div className="mt-1 text-[10px] opacity-70">{new Date(m.ts).toLocaleTimeString()}</div>
                </div>
              ))
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Write a message"
              className="flex-1 h-10 rounded-lg border border-zinc-300 px-3 bg-white"
            />
            <button onClick={send} className="h-10 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm">Send</button>
          </div>
        </div>
      </div>
    </main>
  );
}
