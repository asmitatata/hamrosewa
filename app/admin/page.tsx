"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebaseClient";
import { collection, getDocs, limit, orderBy, query, doc, updateDoc, deleteDoc } from "firebase/firestore";
import AdminOnly from "@/components/AdminOnly";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type TabKey = "users" | "providers" | "jobs";

export default function AdminPage() {
  const [tab, setTab] = useState<TabKey>("users");
  return (
    <AdminOnly>
      <main className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-4">Admin Panel</h1>
        <Tabs tab={tab} onChange={setTab} />
        <div className="mt-6">
          {tab === "users" && <UsersView />}
          {tab === "providers" && <ProvidersView />}
          {tab === "jobs" && <JobsView />}
        </div>
      </main>
    </AdminOnly>
  );
}

function UserRow({ user, onSaved, onDeleted }: { user: any; onSaved: () => void; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState(() => ({
    name: user.name || "",
    email: user.email || "",
    role: user.role || "",
    city: user.city || "",
    primaryService: user.primaryService || "",
    ratingAvg: user.ratingAvg ?? "",
    ratingCount: user.ratingCount ?? "",
  }));

  const save = async () => {
    setSaving(true); setErr("");
    try {
      const payload: any = { ...form };
      if (payload.ratingAvg !== "") payload.ratingAvg = Number(payload.ratingAvg);
      if (payload.ratingCount !== "") payload.ratingCount = Number(payload.ratingCount);
      await updateDoc(doc(db, "users", user.id), payload);
      onSaved(); setOpen(false);
    } catch (e: any) { setErr(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!confirm("Delete this user profile doc? This cannot be undone.")) return;
    setDeleting(true); setErr("");
    try { await deleteDoc(doc(db, "users", user.id)); onDeleted(); }
    catch (e: any) { setErr(e?.message || "Failed to delete"); }
    finally { setDeleting(false); }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between p-3">
        <div>
          <div className="text-sm font-medium text-zinc-900">{user.name || user.id} • {user.role || "unknown"}</div>
          <div className="text-xs text-zinc-600">{user.email || "no-email"} • {user.id}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setOpen(v=>!v)}>{open?"Hide":"View/Edit"}</Button>
          <Button variant="ghost" onClick={remove} disabled={deleting}>{deleting?"Deleting...":"Delete"}</Button>
        </div>
      </div>
      {open && (
        <div className="px-3 pb-3">
          {err && <div className="mb-3 rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{err}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name"><input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></Field>
            <Field label="Email"><input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} /></Field>
            <Field label="Role"><input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})} /></Field>
            <Field label="City"><input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.city} onChange={(e)=>setForm({...form,city:e.target.value})} /></Field>
            <Field label="Primary Service"><input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.primaryService} onChange={(e)=>setForm({...form,primaryService:e.target.value})} /></Field>
            <Field label="Rating Avg"><input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.ratingAvg} onChange={(e)=>setForm({...form,ratingAvg:e.target.value})} /></Field>
            <Field label="Rating Count"><input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.ratingCount} onChange={(e)=>setForm({...form,ratingCount:e.target.value})} /></Field>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={save} disabled={saving}>{saving?"Saving...":"Save changes"}</Button>
            <Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button>
          </div>
          <div className="mt-4">
            <div className="text-xs text-zinc-500 mb-1">Raw JSON</div>
            <pre className="text-xs text-zinc-700 overflow-auto bg-zinc-50 border border-zinc-200 rounded p-2">{JSON.stringify(user, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderRow({ provider, onSaved, onDeleted }: { provider: any; onSaved: () => void; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState(() => ({
    name: provider.name || "",
    city: provider.city || "",
    primaryService: provider.primaryService || "",
    ratingAvg: provider.ratingAvg ?? "",
    ratingCount: provider.ratingCount ?? "",
    verified: provider.verified ?? false,
  }));

  const save = async () => {
    setSaving(true); setErr("");
    try {
      const payload: any = { ...form };
      if (payload.ratingAvg !== "") payload.ratingAvg = Number(payload.ratingAvg);
      if (payload.ratingCount !== "") payload.ratingCount = Number(payload.ratingCount);
      await updateDoc(doc(db, "providers", provider.id), payload);
      onSaved(); setOpen(false);
    } catch (e: any) { setErr(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!confirm("Delete this provider doc? This cannot be undone.")) return;
    setDeleting(true); setErr("");
    try { await deleteDoc(doc(db, "providers", provider.id)); onDeleted(); }
    catch (e: any) { setErr(e?.message || "Failed to delete"); }
    finally { setDeleting(false); }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between p-3">
        <div>
          <div className="text-sm font-medium text-zinc-900">{provider.name || provider.id}</div>
          <div className="text-xs text-zinc-600">{provider.primaryService || "service"} • {provider.city || "city"}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setOpen(v=>!v)}>{open?"Hide":"View/Edit"}</Button>
          <Button variant="ghost" onClick={remove} disabled={deleting}>{deleting?"Deleting...":"Delete"}</Button>
        </div>
      </div>
      {open && (
        <div className="px-3 pb-3">
          {err && <div className="mb-3 rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{err}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name"><input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></Field>
            <Field label="City"><input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.city} onChange={(e)=>setForm({...form,city:e.target.value})} /></Field>
            <Field label="Primary Service"><input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.primaryService} onChange={(e)=>setForm({...form,primaryService:e.target.value})} /></Field>
            <Field label="Rating Avg"><input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.ratingAvg} onChange={(e)=>setForm({...form,ratingAvg:e.target.value})} /></Field>
            <Field label="Rating Count"><input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.ratingCount} onChange={(e)=>setForm({...form,ratingCount:e.target.value})} /></Field>
            <Field label="Verified">
              <div className="h-11 flex items-center">
                <input type="checkbox" checked={!!form.verified} onChange={(e)=>setForm({...form, verified: e.target.checked})} />
                <span className="ml-2 text-sm text-zinc-700">Verified</span>
              </div>
            </Field>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={save} disabled={saving}>{saving?"Saving...":"Save changes"}</Button>
            <Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button>
          </div>
          <div className="mt-4">
            <div className="text-xs text-zinc-500 mb-1">Raw JSON</div>
            <pre className="text-xs text-zinc-700 overflow-auto bg-zinc-50 border border-zinc-200 rounded p-2">{JSON.stringify(provider, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
 

function Tabs({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  const Item = ({ k, label }: { k: TabKey; label: string }) => (
    <button
      onClick={() => onChange(k)}
      className={`h-10 px-4 rounded-lg border ${tab === k ? "border-rose-400 bg-white" : "border-zinc-200 bg-white hover:bg-zinc-50"} text-sm`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center gap-2">
      <Item k="users" label="Users" />
      <Item k="providers" label="Providers" />
      <Item k="jobs" label="Jobs" />
    </div>
  );
}

function UsersView() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc" as any), limit(50));
      const snap = await getDocs(q as any);
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, any>) })));
    } catch (e: any) {
      setErr(e?.message || "Failed to load users");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-medium text-zinc-900">Users</div>
        <Button onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button>
      </div>
      {err && <div className="mb-3 rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{err}</div>}
      <div className="grid gap-2">
        {items.map((u) => (
          <UserRow key={u.id} user={u} onSaved={load} onDeleted={load} />
        ))}
        {items.length === 0 && !loading && <div className="text-sm text-zinc-600">No users found.</div>}
      </div>
    </Card>
  );
}

function ProvidersView() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const q = query(collection(db, "providers"), orderBy("updatedAt", "desc" as any), limit(50));
      const snap = await getDocs(q as any);
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, any>) })));
    } catch (e: any) {
      setErr(e?.message || "Failed to load providers");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-medium text-zinc-900">Providers</div>
        <Button onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button>
      </div>
      {err && <div className="mb-3 rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{err}</div>}
      <div className="grid gap-2">
        {items.map((p) => (
          <ProviderRow key={p.id} provider={p} onSaved={load} onDeleted={load} />
        ))}
        {items.length === 0 && !loading && <div className="text-sm text-zinc-600">No providers found.</div>}
      </div>
    </Card>
  );
}

function JobsView() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const q = query(collection(db, "jobs"), orderBy("createdAt", "desc" as any), limit(50));
      const snap = await getDocs(q as any);
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, any>) })));
    } catch (e: any) {
      setErr(e?.message || "Failed to load jobs");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-medium text-zinc-900">Jobs</div>
        <Button onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button>
      </div>
      {err && <div className="mb-3 rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{err}</div>}
      <div className="grid gap-2">
        {items.map((j) => (
          <JobRow key={j.id} job={j} onSaved={load} onDeleted={load} />
        ))}
        {items.length === 0 && !loading && <div className="text-sm text-zinc-600">No jobs found.</div>}
      </div>
    </Card>
  );
}

function JobRow({ job, onSaved, onDeleted }: { job: any; onSaved: () => void; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState(() => ({
    description: job.description || "",
    city: job.city || "",
    status: job.status || "",
    assignedWorkerId: job.assignedWorkerId || "",
    assignedWorkerName: job.assignedWorkerName || "",
    service: job.service || "",
  }));

  const save = async () => {
    setSaving(true); setErr("");
    try {
      await updateDoc(doc(db, "jobs", job.id), form as any);
      onSaved();
      setOpen(false);
    } catch (e: any) {
      setErr(e?.message || "Failed to save");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!confirm("Delete this job? This cannot be undone.")) return;
    setDeleting(true); setErr("");
    try {
      await deleteDoc(doc(db, "jobs", job.id));
      onDeleted();
    } catch (e: any) {
      setErr(e?.message || "Failed to delete");
    } finally { setDeleting(false); }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between p-3">
        <div>
          <div className="text-sm font-medium text-zinc-900">{job.service || "service"} • {job.city || "city"}</div>
          <div className="text-xs text-zinc-600">{job.status || "status"} • {job.id}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setOpen((v) => !v)}>{open ? "Hide" : "View/Edit"}</Button>
          <Button variant="ghost" onClick={remove} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</Button>
        </div>
      </div>
      {open && (
        <div className="px-3 pb-3">
          {err && <div className="mb-3 rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{err}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Description">
              <input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.description} onChange={(e)=>setForm({...form, description:e.target.value})} />
            </Field>
            <Field label="City">
              <input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.city} onChange={(e)=>setForm({...form, city:e.target.value})} />
            </Field>
            <Field label="Status">
              <input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.status} onChange={(e)=>setForm({...form, status:e.target.value})} />
            </Field>
            <Field label="Service">
              <input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.service} onChange={(e)=>setForm({...form, service:e.target.value})} />
            </Field>
            <Field label="Assigned Worker ID">
              <input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.assignedWorkerId} onChange={(e)=>setForm({...form, assignedWorkerId:e.target.value})} />
            </Field>
            <Field label="Assigned Worker Name">
              <input className="w-full h-11 rounded-lg border border-zinc-300 px-3 bg-white" value={form.assignedWorkerName} onChange={(e)=>setForm({...form, assignedWorkerName:e.target.value})} />
            </Field>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
            <Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button>
          </div>
          <div className="mt-4">
            <div className="text-xs text-zinc-500 mb-1">Raw JSON</div>
            <pre className="text-xs text-zinc-700 overflow-auto bg-zinc-50 border border-zinc-200 rounded p-2">{JSON.stringify(job, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-zinc-600 mb-1">{label}</div>
      {children}
    </label>
  );
}

function Row({ title, meta, data }: { title: string; meta?: string; data: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between p-3">
        <div>
          <div className="text-sm font-medium text-zinc-900">{title}</div>
          {meta && <div className="text-xs text-zinc-600">{meta}</div>}
        </div>
        <Button variant="ghost" onClick={() => setOpen((v) => !v)}>{open ? "Hide" : "View"}</Button>
      </div>
      {open && (
        <pre className="px-3 pb-3 text-xs text-zinc-700 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}
