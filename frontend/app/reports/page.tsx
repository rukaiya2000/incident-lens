"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listReports, ReportSummary } from "../lib/api";

function statusClass(status: ReportSummary["status"]) {
  return status === "ready" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : status === "partial" || status === "failed" ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [query, setQuery] = useState("");
  const [readyOnly, setReadyOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listReports().then(setReports).catch((err) => setError(err instanceof Error ? err.message : "Failed to load reports")).finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => reports.filter((report) => {
    const text = `${report.investigation_name} ${report.video_label} ${report.highlights.join(" ")}`.toLowerCase();
    return (!readyOnly || report.status === "ready") && (!query.trim() || text.includes(query.toLowerCase().trim()));
  }), [reports, query, readyOnly]);
  const ready = reports.filter((report) => report.status === "ready").length;
  const events = reports.reduce((sum, report) => sum + report.event_count, 0);

  return <main className="mx-auto w-full max-w-6xl px-6 py-12">
    <header className="flex flex-col gap-4 border-b border-zinc-200 pb-8 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between"><div><Link href="/" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← Investigations</Link><h1 className="mt-3 text-3xl font-semibold tracking-tight">Analyzed reports</h1><p className="mt-2 text-sm text-zinc-500">Every video analysis, its graph-extracted events, and a direct path back to the evidence workspace.</p></div><Link href="/" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">New investigation</Link></header>
    <section className="mt-8 grid gap-4 sm:grid-cols-3"><Metric label="Video reports" value={reports.length} /><Metric label="Analysis complete" value={ready} /><Metric label="Extracted events" value={events} /></section>
    <section className="mt-8"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-semibold">Report library</h2><div className="flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports" className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700 sm:w-60" /><button onClick={() => setReadyOnly((value) => !value)} className={`rounded-lg border px-3 py-2 text-sm ${readyOnly ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-300 dark:border-zinc-700"}`}>Ready only</button></div></div>
      {loading && <p className="mt-6 text-sm text-zinc-500">Loading reports…</p>}{error && <p className="mt-6 text-sm text-red-600">{error}</p>}{!loading && !error && visible.length === 0 && <p className="mt-6 rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">No reports match this view.</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">{visible.map((report) => <article key={report.video_id} className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{report.investigation_name}</p><h3 className="mt-1 font-semibold">{report.video_label}</h3></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(report.status)}`}>{report.status}</span></div><p className="mt-4 text-sm text-zinc-500"><span className="font-medium text-zinc-900 dark:text-zinc-100">{report.event_count}</span> extracted events</p>{report.highlights.length > 0 && <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">{report.highlights.map((highlight) => <li key={highlight} className="line-clamp-2">• {highlight}</li>)}</ul>}{report.error && <p className="mt-3 line-clamp-2 text-sm text-rose-600">{report.error}</p>}<Link href={`/investigations/${report.investigation_id}`} className="mt-5 inline-flex text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">Open investigation →</Link></article>)}</div>
    </section>
  </main>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"><p className="text-sm text-zinc-500">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p></div>; }