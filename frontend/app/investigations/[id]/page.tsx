"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { AskResponse, Evidence, getInvestigation, InvestigationDetail, mediaUrl } from "../../lib/api";
import AddVideoModal from "./components/AddVideoModal";
import AskPanel from "./components/AskPanel";
import DocumentList from "./components/DocumentList";
import GraphView from "./components/GraphView";
import ProcessingStatus from "./components/ProcessingStatus";
import VideoList from "./components/VideoList";
import VideoPlayer from "./components/VideoPlayer";

export default function InvestigationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [investigation, setInvestigation] = useState<InvestigationDetail | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [rightTab, setRightTab] = useState<"ask" | "graph">("ask");
  const [highlightVideoIds, setHighlightVideoIds] = useState<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);

  const refresh = useCallback(async () => {
    const data = await getInvestigation(id);
    setInvestigation(data);
    setSelected((previous) => {
      const readyIds = new Set(data.videos.filter((video) => video.status === "ready").map((video) => video.id));
      const next = new Set([...previous].filter((videoId) => readyIds.has(videoId)));
      return next.size === 0 && previous.size === 0 && readyIds.size > 0 ? readyIds : next;
    });
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial case data fetch
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!investigation) return;
    const terminal = new Set(["ready", "failed", "partial"]);
    const hasProcessing =
      investigation.videos.some((v) => !terminal.has(v.status)) ||
      investigation.documents.some((d) => !terminal.has(d.status));
    if (!hasProcessing) return;
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [investigation, refresh]);

  function toggleVideo(videoId: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(videoId)) next.delete(videoId); else next.add(videoId);
      return next;
    });
  }

  function handleAskResult(result: AskResponse) {
    setHighlightVideoIds(new Set(result.evidence.map((ev) => ev.video_id)));
  }

  function playEvidence(evidence: Evidence) {
    const video = investigation?.videos.find((item) => item.id === evidence.video_id);
    const element = videoRef.current;
    if (!video || !element) return;
    const seek = () => { element.currentTime = evidence.start_sec; void element.play(); };
    if (!element.src.endsWith(video.filename)) element.src = mediaUrl(video.filename);
    if (element.readyState >= 1) seek(); else element.addEventListener("loadedmetadata", seek, { once: true });
  }

  if (!investigation) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="h-48 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-48 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  const readyVideos = investigation.videos.filter((video) => video.status === "ready");
  const activeVideo = readyVideos.find((video) => selected.has(video.id)) ?? readyVideos[0];
  const processingCount = investigation.videos.length - readyVideos.length;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-5 rounded-3xl border border-white/70 bg-white/65 p-6 shadow-[0_24px_70px_-35px_rgba(30,64,175,0.35)] backdrop-blur-xl dark:border-white/5 dark:bg-zinc-950/65 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/" className="text-sm font-medium text-slate-500 transition hover:text-blue-700 dark:hover:text-blue-400">← All cases</Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{investigation.name}</h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
              {readyVideos.length} analyzed source{readyVideos.length === 1 ? "" : "s"}
            </span>
            {processingCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {processingCount} processing
              </span>
            )}
          </div>
          {investigation.description && (
            <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">{investigation.description}</p>
          )}
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5"
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
          <DocumentList documents={investigation.documents} />
          {investigation.videos.length > 0 && (
            <VideoPlayer ref={videoRef} src={activeVideo ? mediaUrl(activeVideo.filename) : undefined} />
          )}
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="mb-4 flex gap-1 rounded-lg bg-zinc-100 p-1 text-sm dark:bg-zinc-900">
            <button
              onClick={() => setRightTab("ask")}
              className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
                rightTab === "ask"
                  ? "bg-[var(--surface)] shadow-sm"
                  : "text-zinc-500 hover:text-[var(--foreground)]"
              }`}
            >
              Ask
            </button>
            <button
              onClick={() => setRightTab("graph")}
              className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
                rightTab === "graph"
                  ? "bg-[var(--surface)] shadow-sm"
                  : "text-zinc-500 hover:text-[var(--foreground)]"
              }`}
            >
              Graph
            </button>
          </div>
          {rightTab === "ask" ? (
            <AskPanel
              investigationId={id}
              selectedVideoIds={[...selected]}
              onPlayEvidence={playEvidence}
              onResult={handleAskResult}
            />
          ) : (
            <GraphView investigationId={id} highlightVideoIds={highlightVideoIds} />
          )}
        </div>
      </div>

      <AddVideoModal
        investigationId={id}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={refresh}
        existingVideos={investigation.videos}
        existingDocuments={investigation.documents}
      />
    </main>
  );
}
