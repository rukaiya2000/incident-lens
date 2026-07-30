"use client";

import { Video, VideoStatus } from "../../../lib/api";

const STATUS_META: Record<VideoStatus, { label: string; dot: string; pulse?: boolean }> = {
  downloading: { label: "Downloading…", dot: "bg-sky-500", pulse: true },
  uploaded: { label: "Uploaded", dot: "bg-zinc-400", pulse: true },
  indexing: { label: "Indexing…", dot: "bg-amber-500", pulse: true },
  indexed: { label: "Indexed", dot: "bg-amber-500", pulse: true },
  extracting: { label: "Extracting…", dot: "bg-amber-500", pulse: true },
  partial: { label: "Partial", dot: "bg-orange-500" },
  ready: { label: "Ready", dot: "bg-emerald-500" },
  failed: { label: "Failed", dot: "bg-red-500" },
};

export default function VideoList({
  videos,
  selected,
  onToggle,
}: {
  videos: Video[];
  selected: Set<string>;
  onToggle: (videoId: string) => void;
}) {
  if (videos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-zinc-500">
        No footage added yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {videos.map((video) => {
        const meta = STATUS_META[video.status];
        const isSelected = selected.has(video.id);
        const disabled = video.status !== "ready";
        return (
          <li key={video.id}>
            <label
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                disabled
                  ? "cursor-not-allowed border-[var(--border)] opacity-70"
                  : isSelected
                    ? "cursor-pointer border-[var(--accent)] bg-[var(--accent)]/5"
                    : "cursor-pointer border-[var(--border)] hover:border-[var(--accent)]/40"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={disabled}
                onChange={() => onToggle(video.id)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">
                  {video.media_type === "audio" ? "🎙️ " : ""}
                  {video.label}
                </span>
                {video.status === "partial" && video.error && (
                  <span className="truncate text-xs text-amber-600 dark:text-amber-500">
                    {video.error}
                  </span>
                )}
                {video.status === "failed" && video.error && (
                  <span className="truncate text-xs text-red-500">{video.error}</span>
                )}
              </div>
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-500">
                <span className="relative flex h-2 w-2">
                  {meta.pulse && (
                    <span
                      className={`absolute inline-flex h-full w-full animate-ping rounded-full ${meta.dot} opacity-60`}
                    />
                  )}
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${meta.dot}`} />
                </span>
                {meta.label}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
