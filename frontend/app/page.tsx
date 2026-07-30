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
    try {
      setInvestigations(await listInvestigations());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load investigations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    refresh();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createInvestigation(name.trim(), description.trim());
      setName("");
      setDescription("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create investigation");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">IncidentGraph</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Turn multi-source footage into a temporal context graph and ask investigative questions
          grounded in timestamped evidence.
        </p>
      </header>

      <Link href="/reports" className="self-start rounded border border-zinc-300 px-3 py-2 text-sm font-medium hover:border-zinc-500 dark:border-zinc-700">View analyzed reports →</Link>

      <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">New investigation</h2>
        <input
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="Name (e.g. Traffic Stop - July 2026)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {creating ? "Creating..." : "Create investigation"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Investigations</h2>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : investigations.length === 0 ? (
          <p className="text-sm text-zinc-500">No investigations yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {investigations.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/investigations/${inv.id}`}
                  className="block rounded-lg border border-zinc-200 p-3 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                >
                  <p className="font-medium">{inv.name}</p>
                  {inv.description && (
                    <p className="text-sm text-zinc-500">{inv.description}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
