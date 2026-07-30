"use client";

import { useEffect, useState } from "react";
import { ClaimRecord, Evidence, listClaims, rebuildClaimIntelligence } from "../../../lib/api";

const STATUS_STYLE: Record<ClaimRecord["status"], string> = {
  corroborated: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  contradicted: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  mixed: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  unverified: "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300",
};

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

export default function ClaimsPanel({
  investigationId,
  refreshKey,
  onPlayEvidence,
}: {
  investigationId: string;
  refreshKey: string;
  onPlayEvidence: (evidence: Evidence) => void;
}) {
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    listClaims(investigationId)
      .then((data) => { if (active) setClaims(data); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Could not load claim intelligence"); });
    return () => { active = false; };
  }, [investigationId, refreshKey, refreshToken]);

  async function rebuild() {
    setRebuilding(true);
    setError(null);
    try {
      await rebuildClaimIntelligence(investigationId);
      window.setTimeout(() => setRefreshToken((value) => value + 1), 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start claim rebuild");
    } finally {
      setRebuilding(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/80 bg-white/70 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/5 dark:bg-zinc-950/65">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-400">Claim intelligence</p><h2 className="mt-1 text-lg font-semibold">Claims and corroboration</h2><p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Automated evidence assessment. Review clips before treating a claim as established.</p></div>
        <div className="flex flex-col items-end gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">{claims.length} claim{claims.length === 1 ? "" : "s"}</span><button type="button" onClick={rebuild} disabled={rebuilding} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:-translate-y-0.5 disabled:opacity-50 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">{rebuilding ? "Starting..." : "Rebuild claims"}</button></div>
      </div>
      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      {!error && claims.length === 0 && <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/50 p-5 text-sm text-slate-500 dark:border-zinc-700 dark:bg-zinc-950/40">No spoken or explicit claims have been extracted from the analyzed footage yet.</p>}
      <div className="mt-5 space-y-3">{claims.map((claim) => <article key={claim.id} className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm dark:border-white/5 dark:bg-zinc-950/65"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium leading-6">&quot;{claim.text}&quot;</p><p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{claim.speaker ? `${claim.speaker} - ` : ""}{claim.video_label} - {formatTime(claim.start_sec)}-{formatTime(claim.end_sec)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[claim.status]}`}>{claim.status}</span></div><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-zinc-300">{claim.assessment_summary}</p>{claim.evidence.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{claim.evidence.map((item) => <button key={`${claim.id}-${item.event_id}-${item.relationship}`} onClick={() => onPlayEvidence({ video_id: item.video_id, video_label: item.video_label, start_sec: item.start_sec, end_sec: item.end_sec, snippet: item.description })} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${item.relationship === "SUPPORTS" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"}`}>{item.relationship === "SUPPORTS" ? "Supports" : "Contradicts"}: {formatTime(item.start_sec)}</button>)}</div>}</article>)}</div>
    </section>
  );
}