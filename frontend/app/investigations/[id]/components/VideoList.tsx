"use client";

import { Video } from "../../../lib/api";

const STATUS_LABEL: Record<Video["status"], string> = {
  uploaded: "Uploaded",
  indexing: "Indexing...",
  indexed: "Indexed",
  extracting: "Extracting...",
  partial: "Partial (check error)",
  ready: "Ready",
  failed: "Failed",
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
    return <p className="text-sm text-zinc-500">No footage added yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {videos.map((video) => (
        <li key={video.id} className="flex items-center gap-2 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
          <input
            type="checkbox"
            checked={selected.has(video.id)}
            disabled={video.status !== "ready"}
            onChange={() => onToggle(video.id)}
          />
          <div className="flex flex-1 flex-col">
            <span className="text-sm font-medium">{video.label}</span>
            <span className="text-xs text-zinc-500">
              {STATUS_LABEL[video.status]}
              {video.status === "partial" && video.error ? `: ${video.error}` : ""}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
