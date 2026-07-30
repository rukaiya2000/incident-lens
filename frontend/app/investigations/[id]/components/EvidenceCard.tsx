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
      className="group flex w-full items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5"
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)] transition group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-foreground)]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium">
          {evidence.video_label}
          <span className="ml-2 font-mono text-xs text-zinc-500">
            {formatTime(evidence.start_sec)}–{formatTime(evidence.end_sec)}
          </span>
        </span>
        {evidence.snippet && (
          <span className="line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
            {evidence.snippet}
          </span>
        )}
      </span>
    </button>
  );
}
