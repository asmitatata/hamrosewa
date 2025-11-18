"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebaseClient";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "firebase/firestore";
import Button from "@/components/ui/Button";

export default function JobChat({ jobId, senderId, senderRole }: { jobId: string; senderId: string; senderRole: "customer" | "worker" }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "jobs", jobId, "messages"), orderBy("ts", "asc") as any);
    const unsub = onSnapshot(q as any, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 0);
    });
    return () => unsub();
  }, [jobId]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, "jobs", jobId, "messages"), {
        senderId,
        senderRole,
        text: text.trim(),
        ts: serverTimestamp(),
      } as any);
      setText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-sm font-medium text-zinc-900 mb-2">Chat</div>
      <div ref={listRef} className="h-56 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-2">
        {messages.map((m) => (
          <div key={m.id} className={`mb-2 ${m.senderRole === senderRole ? "text-right" : "text-left"}`}>
            <div className={`inline-block max-w-[80%] rounded-lg px-2 py-1 text-sm ${m.senderRole === senderRole ? "bg-rose-100 text-rose-800" : "bg-white border border-zinc-200 text-zinc-800"}`}>
              {m.text}
            </div>
          </div>
        ))}
        {messages.length === 0 && <div className="text-xs text-zinc-500">No messages yet.</div>}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={text} onChange={(e)=>setText(e.target.value)} className="flex-1 h-11 rounded-lg border border-zinc-300 px-3 bg-white" placeholder="Type a message" />
        <Button onClick={send} disabled={sending || !text.trim()}>Send</Button>
      </div>
    </div>
  );
}
