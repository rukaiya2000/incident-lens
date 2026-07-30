"use client";

import { Evidence } from "../../../lib/api";

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;

export default function EvidenceCard({ evidence, onPlay }: { evidence: Evidence; onPlay: (evidence: Evidence) => void }) {
  return <button onClick={() => onPlay(evidence)} className="flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm transition hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"><span className="mt-0.5 rounded bg-blue-100 px-2 py-1 font-mono text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-300">{formatTime(evidence.start_sec)}–{formatTime(evidence.end_sec)}</span><span className="min-w-0"><span className="font-medium">{evidence.video_label}</span>{evidence.snippet && <span className="mt-1 block text-slate-500 dark:text-zinc-400">{evidence.snippet}</span>}</span></button>;
}