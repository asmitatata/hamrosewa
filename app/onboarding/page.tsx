"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { SERVICES, CITIES } from "@/lib/constants";
import type { CityKey } from "@/lib/constants";
import type { Role, ServiceKey, UserProfile } from "@/lib/types";
import { db } from "@/lib/firebaseClient";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function OnboardingPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [service, setService] = useState<ServiceKey | "">("");
  const [city, setCity] = useState<CityKey | "">("");
  const [area, setArea] = useState("");
  const [ward, setWard] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
    if (profile && profile.role && profile.primaryService && profile.city) {
      // already onboarded
      router.push(profile.role === "worker" ? "/dashboard/worker" : "/dashboard/customer");
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (profile) {
      if (profile.name) setName(profile.name);
      if ((profile as any).phone) setPhone((profile as any).phone);
      if (profile.role) setRole(profile.role as Role);
      if (profile.primaryService) setService(profile.primaryService as ServiceKey);
      if (profile.city) setCity(profile.city as CityKey);
      if ((profile as any).area) setArea((profile as any).area);
      if ((profile as any).ward) setWard((profile as any).ward);
      if ((profile as any).bio) setBio((profile as any).bio);
    } else if (user?.displayName && !name) {
      setName(user.displayName);
    }
  }, [profile, user, name]);

  const phoneValid = useMemo(() => {
    const p = phone.trim();
    if (!p) return false;
    const re = /^(\+?977[- ]?)?9[78]\d{8}$/;
    return re.test(p);
  }, [phone]);

  const canSave = useMemo(
    () => !!name.trim() && phoneValid && !!role && !!service && !!city,
    [name, phoneValid, role, service, city]
  );

  const submit = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    setError("");
    try {
      const ref = doc(db, "users", user.uid);
      const base: Partial<UserProfile> & { phone?: string } = {
        name: name.trim(),
        phone: phone.trim(),
        role: role as Role,
        primaryService: service as ServiceKey,
        city: city as CityKey,
        updatedAt: serverTimestamp(),
      };
      const data: any = { ...base };
      const areaVal = area.trim();
      const wardVal = ward.trim();
      const bioVal = bio.trim();
      if (areaVal) data.area = areaVal;
      if (wardVal) data.ward = wardVal;
      if (bioVal) data.bio = bioVal;
      await setDoc(ref, data, { merge: true });
      if (role === "worker") {
        try {
          const pref = doc(db, "providers", user.uid);
          const cityInfo = CITIES[city as keyof typeof CITIES];
          const providerData: any = {
            uid: user.uid,
            name: name.trim(),
            city: city as any,
            primaryService: service as any,
            lat: cityInfo?.lat,
            lng: cityInfo?.lng,
            ratingAvg: 0,
            ratingCount: 0,
            verified: false,
            updatedAt: serverTimestamp(),
          };
          await setDoc(pref, providerData, { merge: true });
        } catch {}
      }
      router.push(role === "worker" ? "/dashboard/worker" : "/dashboard/customer");
    } catch (e: any) {
      const msg = e?.message || "Failed to save profile.";
      setError(msg.includes("Missing or insufficient permissions") ? "Permission denied: please update Firestore security rules to allow users to write their own profile (users/{uid})." : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Complete your profile</h1>
      {error && (
        <div className="mb-4 rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{error}</div>
      )}

      <div className="grid gap-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Suman Shrestha"
              className="w-full h-10 rounded-lg border border-zinc-300 px-3 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., +977 98XXXXXXXX"
              className="w-full h-10 rounded-lg border border-zinc-300 px-3 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">I am a</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              className={`rounded-lg border p-4 text-center ${role === "customer" ? "border-rose-500 bg-rose-50" : "border-zinc-200"}`}
              onClick={() => setRole("customer")}
            >
              Customer
            </button>
            <button
              className={`rounded-lg border p-4 text-center ${role === "worker" ? "border-amber-500 bg-amber-50" : "border-zinc-200"}`}
              onClick={() => setRole("worker")}
            >
              Worker
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Primary service</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SERVICES.map((s) => (
              <button
                key={s.key}
                className={`rounded-lg border p-3 text-center ${service === s.key ? "border-sky-500 bg-sky-50" : "border-zinc-200"}`}
                onClick={() => setService(s.key as ServiceKey)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">City</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(CITIES).map(([k, cityObj]) => (
              <button
                key={k}
                className={`rounded-lg border p-3 text-left ${city === k ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"}`}
                onClick={() => setCity(k as CityKey)}
              >
                <div className="font-medium">{cityObj.name}</div>
                <div className="text-xs text-zinc-600">{cityObj.lat}, {cityObj.lng}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            disabled={!canSave || saving}
            onClick={submit}
            className="rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-sky-500 text-white px-6 py-2 text-sm shadow disabled:opacity-50"
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
}
