"use client";

import { Video, VideoStatus } from "../../../lib/api";

const STEP_LABELS = ["uploaded", "indexed", "entities", "ready"] as const;

const STATUS_STEPS: Record<VideoStatus, Record<(typeof STEP_LABELS)[number], boolean>> = {
  downloading: { uploaded: false, indexed: false, entities: false, ready: false },
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
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <h3 className="text-sm font-medium">Processing</h3>
      {processing.map((video) => {
        const steps = STATUS_STEPS[video.status];
        const doneCount = STEP_LABELS.filter((s) => steps[s]).length;
        return (
          <div key={video.id} className="flex flex-col gap-2">
            <span className="text-sm font-medium">{video.label}</span>
            <div className="flex items-center gap-1.5">
              {STEP_LABELS.map((step, i) => (
                <div key={step} className="flex flex-1 items-center gap-1.5">
                  <div
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      steps[step]
                        ? "bg-[var(--accent)]"
                        : i === doneCount
                          ? "animate-pulse bg-[var(--accent)]/40"
                          : "bg-zinc-200 dark:bg-zinc-800"
                    }`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-zinc-500">
              {STEP_LABELS.map((step) => (
                <span key={step} className={steps[step] ? "text-[var(--accent)]" : ""}>
                  {step}
                </span>
              ))}
            </div>
            {video.status === "partial" && video.error && (
              <span className="text-xs text-amber-600 dark:text-amber-500">{video.error}</span>
            )}
            {video.status === "failed" && video.error && (
              <span className="text-xs text-red-500">{video.error}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
