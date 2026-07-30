"use client";

import { clipDownloadUrl, Evidence } from "../../../lib/api";

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
    <div className="group flex w-full items-start gap-2 rounded-2xl border border-white/80 bg-white/70 backdrop-blur-xl dark:border-white/5 dark:bg-zinc-950/65 p-3 transition hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5">
      <button onClick={() => onPlay(evidence)} className="flex flex-1 min-w-0 items-start gap-3 text-left">
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
      <a
        href={clipDownloadUrl(evidence.video_id, evidence.start_sec, evidence.end_sec)}
        download
        title="Download this clip"
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
        </svg>
      </a>
    </div>
  );
}
