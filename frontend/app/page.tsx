"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createInvestigation, Investigation, listInvestigations } from "./lib/api";

export default function Home() {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try { setInvestigations(await listInvestigations()); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to load investigations"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    refresh();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true); setError(null);
    try { await createInvestigation(name.trim(), description.trim()); setName(""); setDescription(""); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to create investigation"); }
    finally { setCreating(false); }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 lg:py-16">
      <header className="grid gap-6 rounded-3xl border border-white/70 bg-white/65 p-7 shadow-[0_24px_70px_-35px_rgba(30,64,175,0.35)] backdrop-blur-xl dark:border-white/5 dark:bg-zinc-950/65 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-400">Investigation workspace</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Follow the evidence, not the noise.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-zinc-400">Turn multi-source footage into a temporal context graph and ask investigative questions grounded in timestamped evidence.</p>
        </div>
        <Link href="/reports" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-blue-700 dark:bg-white dark:text-slate-950">Browse report library <span className="ml-2">→</span></Link>
      </header>

      <form onSubmit={handleCreate} className="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/5 dark:bg-zinc-950/65">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-400">Start a case</p><h2 className="mt-1 text-lg font-semibold">Create an investigation</h2></div>
        <input className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-blue-950" placeholder="Name (e.g. Traffic Stop - July 2026)" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-blue-950" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        <button type="submit" disabled={creating || !name.trim()} className="self-start rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">{creating ? "Creating..." : "Create investigation"}</button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <section className="flex flex-col gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Your workspace</p><h2 className="mt-1 text-xl font-semibold">Investigations</h2></div>
        {loading ? <p className="text-sm text-zinc-500">Loading...</p> : investigations.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-zinc-500 dark:border-zinc-700">No investigations yet.</p> : (
          <ul className="grid gap-3 md:grid-cols-2">{investigations.map((inv) => <li key={inv.id}><Link href={`/investigations/${inv.id}`} className="block rounded-2xl border border-white/80 bg-white/70 p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-slate-900/5 dark:border-white/5 dark:bg-zinc-950/65 dark:hover:bg-zinc-900"><p className="font-medium">{inv.name}</p>{inv.description && <p className="mt-1 text-sm text-zinc-500">{inv.description}</p>}<p className="mt-4 text-sm font-medium text-blue-700 dark:text-blue-400">Open case →</p></Link></li>)}</ul>
        )}
      </section>
    </main>
  );
}