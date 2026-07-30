"use client";

import { Video, VideoStatus } from "../../../lib/api";

const STEPS = ["Uploaded", "Indexed", "Events extracted", "Ready"];
const STATUS_STEPS: Record<VideoStatus, number> = { uploaded: 1, indexing: 1, indexed: 2, extracting: 2, ready: 4, partial: 2, failed: 1 };

export default function ProcessingStatus({ videos }: { videos: Video[] }) {
  const processing = videos.filter((video) => video.status !== "ready");
  if (processing.length === 0) return null;
  return <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Analysis queue</h3><span className="text-xs text-slate-500 dark:text-zinc-400">{processing.length} active</span></div><div className="mt-4 space-y-4">{processing.map((video) => { const complete = STATUS_STEPS[video.status]; return <div key={video.id}><div className="flex justify-between gap-3 text-sm"><span className="truncate font-medium">{video.label}</span><span className="shrink-0 text-slate-500 dark:text-zinc-400">{video.status}</span></div><div className="mt-2 grid grid-cols-4 gap-1">{STEPS.map((step, index) => <div key={step} className="space-y-1"><div className={`h-1.5 rounded-full ${index < complete ? "bg-blue-600" : "bg-slate-200 dark:bg-zinc-700"}`} /><span className="block text-[10px] leading-3 text-slate-500 dark:text-zinc-400">{step}</span></div>)}</div>{video.error && <p className="mt-2 text-xs text-rose-600">{video.error}</p>}</div>; })}</div></section>;
}