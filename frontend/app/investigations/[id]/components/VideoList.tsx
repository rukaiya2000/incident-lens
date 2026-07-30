"use client";

import { Video } from "../../../lib/api";

const STATUS_LABEL: Record<Video["status"], string> = { uploaded: "Queued", indexing: "Indexing", indexed: "Extracting", extracting: "Extracting", partial: "Needs attention", ready: "Ready", failed: "Failed" };

function statusClass(status: Video["status"]) {
  return status === "ready" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : status === "partial" || status === "failed" ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
}

export default function VideoList({ videos, selected, onToggle }: { videos: Video[]; selected: Set<string>; onToggle: (videoId: string) => void }) {
  if (videos.length === 0) return <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-zinc-700 dark:text-zinc-400">No footage yet. Add a video to start the analysis.</div>;
  return <ul className="space-y-2">{videos.map((video) => {
    const ready = video.status === "ready";
    const checked = selected.has(video.id);
    return <li key={video.id}><label className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${checked ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30" : "border-slate-200 bg-white hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900"} ${!ready ? "cursor-not-allowed opacity-70" : ""}`}>
      <input type="checkbox" className="mt-1 size-4 accent-blue-700" checked={checked} disabled={!ready} onChange={() => onToggle(video.id)} />
      <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span className="truncate text-sm font-medium">{video.label}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass(video.status)}`}>{STATUS_LABEL[video.status]}</span></span><span className="mt-1 block text-xs text-slate-500 dark:text-zinc-400">{ready ? "Included in evidence searches" : video.error ?? "Analysis is not ready yet"}</span></span>
    </label></li>;
  })}</ul>;
}