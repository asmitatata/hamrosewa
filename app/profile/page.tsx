"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebaseClient";
import { CITIES, SERVICES } from "@/lib/constants";
import type { CityKey, ServiceKey, UserProfile } from "@/lib/types";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function ProfilePage() {
  const { user, profile, loading } = useAuth() as any;
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState<string>("");
  const [service, setService] = useState<string>("");
  const [area, setArea] = useState("");
  const [ward, setWard] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/profile");
  }, [loading, user, router]);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name || "");
    setPhone(profile.phone || "");
    setCity((profile.city as string) || "");
    setService((profile.primaryService as string) || "");
    setArea(profile.area || "");
    setWard(profile.ward || "");
    setBio(profile.bio || "");
  }, [profile]);

  const canSave = useMemo(() => name.trim().length > 0 && !!city && !!service, [name, city, service]);

  const submit = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const ref = doc(db, "users", user.uid);
      const base: any = { updatedAt: serverTimestamp() };
      const nameVal = name.trim();
      if (nameVal) base.name = nameVal;
      const phoneVal = phone.trim();
      if (phoneVal) base.phone = phoneVal;
      const areaVal = area.trim();
      if (areaVal) base.area = areaVal;
      const wardVal = ward.trim();
      if (wardVal) base.ward = wardVal;
      const bioVal = bio.trim();
      if (bioVal) base.bio = bioVal;
      if (city) base.city = city as CityKey;
      if (service) base.primaryService = service as ServiceKey;
      await setDoc(ref, base, { merge: true });

      // If worker, keep providers doc in sync
      if (profile?.role === "worker") {
        try {
          const pref = doc(db, "providers", user.uid);
          const cityInfo = CITIES[city as keyof typeof CITIES];
          const pdata: any = {
            uid: user.uid,
            name: name.trim(),
            city: city as any,
            primaryService: service as any,
            lat: cityInfo?.lat,
            lng: cityInfo?.lng,
            updatedAt: serverTimestamp(),
          };
          await setDoc(pref, pdata, { merge: true });
        } catch {}
      }

      setSaved(true);
    } catch (e: any) {
      const msg = e?.message || "Failed to save profile.";
      setError(msg.includes("Missing or insufficient permissions") ? "Permission denied: update Firestore rules to allow users to write their own profile (users/{uid})." : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-4">Your Profile</h1>
      {error && (
        <div className="mb-4 rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{error}</div>
      )}
      {saved && (
        <div className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 px-3 py-2 text-sm">Saved successfully.</div>
      )}
      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Full name</label>
          <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Phone</label>
          <input value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">City</label>
          <select value={city} onChange={(e)=>setCity(e.target.value)} className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white">
            <option value="">Select city</option>
            {Object.entries(CITIES).map(([k,v]) => (
              <option key={k} value={k}>{v.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Primary service</label>
          <select value={service} onChange={(e)=>setService(e.target.value)} className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white">
            <option value="">Choose a service</option>
            {SERVICES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Area</label>
            <input value={area} onChange={(e)=>setArea(e.target.value)} className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Ward</label>
            <input value={ward} onChange={(e)=>setWard(e.target.value)} className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Bio</label>
          <textarea value={bio} onChange={(e)=>setBio(e.target.value)} rows={4} className="w-full rounded-lg border border-zinc-300 px-3 py-2 bg-white" />
        </div>
        <div className="flex justify-end">
          <button disabled={!canSave || saving} onClick={submit} className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 text-sm shadow disabled:opacity-50">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </main>
  );
}
