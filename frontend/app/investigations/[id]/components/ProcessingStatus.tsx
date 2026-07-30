"use client";

import { Video, VideoStatus } from "../../../lib/api";

const STEP_LABELS = ["uploaded", "indexed", "entities", "ready"] as const;

const STATUS_STEPS: Record<VideoStatus, Record<(typeof STEP_LABELS)[number], boolean>> = {
  uploaded: { uploaded: true, indexed: false, entities: false, ready: false },
  indexing: { uploaded: true, indexed: false, entities: false, ready: false },
  indexed: { uploaded: true, indexed: true, entities: false, ready: false },
  extracting: { uploaded: true, indexed: true, entities: false, ready: false },
  ready: { uploaded: true, indexed: true, entities: true, ready: true },
  partial: { uploaded: true, indexed: true, entities: false, ready: false },
  failed: { uploaded: true, indexed: false, entities: false, ready: false },
};

export default function ProcessingStatus({ videos }: { videos: Video[] }) {
  const processing = videos.filter((v) => v.status !== "ready");
  if (processing.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Processing</h3>
      {processing.map((video) => {
        const steps = STATUS_STEPS[video.status];
        return (
          <div key={video.id} className="flex flex-col gap-1">
            <span className="text-sm font-medium">{video.label}</span>
            <div className="flex gap-3 text-xs text-zinc-500">
              {STEP_LABELS.map((step) => (
                <span key={step}>
                  {steps[step] ? "✓" : "○"} {step}
                </span>
              ))}
            </div>
            {video.status === "partial" && video.error && (
              <span className="text-xs text-amber-600">{video.error}</span>
            )}
            {video.status === "failed" && video.error && (
              <span className="text-xs text-red-600">{video.error}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
