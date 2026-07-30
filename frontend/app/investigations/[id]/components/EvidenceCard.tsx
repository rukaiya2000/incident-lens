"use client";

import { Evidence } from "../../../lib/api";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function EvidenceCard({
  evidence,
  onPlay,
}: {
  evidence: Evidence;
  onPlay: (evidence: Evidence) => void;
}) {
  return (
    <button
      onClick={() => onPlay(evidence)}
      className="flex w-full flex-col gap-1 rounded-lg border border-zinc-200 p-3 text-left text-sm hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
    >
      <span className="font-medium">
        🎥 {evidence.video_label} — {formatTime(evidence.start_sec)}–{formatTime(evidence.end_sec)}
      </span>
      {evidence.snippet && <span className="text-zinc-500">{evidence.snippet}</span>}
    </button>
  );
}
