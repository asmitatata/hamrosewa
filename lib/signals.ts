import { db } from "@/lib/firebaseClient";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { CityKey, ServiceKey } from "@/lib/types";

export async function logSignal(opts: { userId?: string | null; type: "search" | "click" | "book"; service: ServiceKey; city: CityKey }) {
  try {
    if (!opts.userId) return; // only log for signed-in users
    const ref = collection(db, "users", opts.userId, "signals");
    await addDoc(ref, {
      type: opts.type,
      service: opts.service,
      city: opts.city,
      ts: serverTimestamp(),
    });
  } catch {}
}
