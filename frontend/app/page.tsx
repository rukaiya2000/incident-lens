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
  const [formOpen, setFormOpen] = useState(false);
  const [compareSelected, setCompareSelected] = useState<Set<string>>(new Set());

  function toggleCompare(id: string) {
    setCompareSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

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
      setFormOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create investigation");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Investigations</h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          Turn multi-source footage into a temporal context graph. Ask investigative
          questions across one or more videos and get answers grounded in timestamped
          evidence.
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {!formOpen ? (
          <button
            onClick={() => setFormOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-left text-sm font-medium text-zinc-500 transition hover:text-[var(--accent)] dark:text-zinc-400"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-current text-lg leading-none">
              +
            </span>
            New investigation
          </button>
        ) : (
          <form onSubmit={handleCreate} className="flex flex-col gap-3 p-5">
            <h2 className="text-sm font-medium">New investigation</h2>
            <input
              autoFocus
              className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="Name (e.g. Traffic Stop - July 2026)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <textarea
              className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-[var(--border)] bg-zinc-100 dark:bg-zinc-900"
              />
            ))}
          </div>
        ) : investigations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] px-5 py-8 text-center text-sm text-zinc-500">
            No investigations yet — create one above to get started.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Check 2 or more to ask a question across cases</span>
              {compareSelected.size >= 2 && (
                <Link
                  href={`/compare?ids=${[...compareSelected].join(",")}`}
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 font-medium text-[var(--accent-foreground)] transition hover:opacity-90"
                >
                  Compare selected ({compareSelected.size})
                </Link>
              )}
            </div>
            <ul className="flex flex-col gap-2">
              {investigations.map((inv) => (
                <li
                  key={inv.id}
                  className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm transition hover:border-[var(--accent)]/50 hover:shadow-md"
                >
                  <input
                    type="checkbox"
                    checked={compareSelected.has(inv.id)}
                    onChange={() => toggleCompare(inv.id)}
                    className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  <Link href={`/investigations/${inv.id}`} className="flex flex-1 items-center justify-between gap-4">
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium">{inv.name}</span>
                      {inv.description && (
                        <span className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                          {inv.description}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
