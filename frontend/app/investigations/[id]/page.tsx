"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { Evidence, getInvestigation, InvestigationDetail, mediaUrl } from "../../lib/api";
import AddVideoModal from "./components/AddVideoModal";
import AskPanel from "./components/AskPanel";
import ProcessingStatus from "./components/ProcessingStatus";
import VideoList from "./components/VideoList";
import VideoPlayer from "./components/VideoPlayer";

export default function InvestigationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [investigation, setInvestigation] = useState<InvestigationDetail | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const refresh = useCallback(async () => {
    const data = await getInvestigation(id);
    setInvestigation(data);
    setSelected((prev) => {
      const readyIds = new Set(data.videos.filter((v) => v.status === "ready").map((v) => v.id));
      const next = new Set([...prev].filter((v) => readyIds.has(v)));
      // Auto-select newly-ready videos the user hasn't explicitly deselected yet.
      if (next.size === 0 && readyIds.size > 0 && prev.size === 0) {
        return readyIds;
      }
      return next;
    });
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!investigation) return;
    const hasProcessing = investigation.videos.some((v) => v.status !== "ready" && v.status !== "failed" && v.status !== "partial");
    if (!hasProcessing) return;
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [investigation, refresh]);

  function toggleVideo(videoId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  }

  function playEvidence(evidence: Evidence) {
    const video = investigation?.videos.find((v) => v.id === evidence.video_id);
    if (!video || !videoRef.current) return;
    const el = videoRef.current;
    const url = mediaUrl(video.filename);
    if (!el.src.endsWith(video.filename)) {
      el.src = url;
    }
    const seekAndPlay = () => {
      el.currentTime = evidence.start_sec;
      el.play();
    };
    if (el.readyState >= 1) {
      seekAndPlay();
    } else {
      el.addEventListener("loadedmetadata", seekAndPlay, { once: true });
    }
  }

  if (!investigation) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,340px)_1fr]">
          <div className="h-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{investigation.name}</h1>
          {investigation.description && (
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {investigation.description}
            </p>
          )}
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-90"
        >
          <span className="text-base leading-none">+</span> Add evidence
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,340px)_1fr] md:items-start">
        <div className="flex flex-col gap-5">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <h2 className="mb-3 flex items-center justify-between text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              <span>Footage</span>
              <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[var(--accent)] normal-case">
                {selected.size} selected
              </span>
            </h2>
            <VideoList videos={investigation.videos} selected={selected} onToggle={toggleVideo} />
          </section>
          <ProcessingStatus videos={investigation.videos} />
          {investigation.videos.length > 0 && <VideoPlayer ref={videoRef} />}
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <AskPanel
            investigationId={id}
            selectedVideoIds={[...selected]}
            onPlayEvidence={playEvidence}
          />
        </div>
      </div>

      <AddVideoModal
        investigationId={id}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={refresh}
        existingVideos={investigation.videos}
      />
    </div>
  );
}
