"use client";

import Link from "next/link";
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
    setSelected((previous) => {
      const ready = new Set(data.videos.filter((video) => video.status === "ready").map((video) => video.id));
      const next = new Set([...previous].filter((videoId) => ready.has(videoId)));
      return next.size > 0 || ready.size === 0 ? next : ready;
    });
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial case data fetch
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (!investigation?.videos.some((video) => !["ready", "failed", "partial"].includes(video.status))) return;
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [investigation, refresh]);

  function toggleVideo(videoId: string) { setSelected((previous) => { const next = new Set(previous); if (next.has(videoId)) { next.delete(videoId); } else { next.add(videoId); } return next; }); }
  function playEvidence(evidence: Evidence) {
    const video = investigation?.videos.find((item) => item.id === evidence.video_id);
    const element = videoRef.current;
    if (!video || !element) return;
    const seek = () => { element.currentTime = evidence.start_sec; void element.play(); };
    if (!element.src.endsWith(video.filename)) element.src = mediaUrl(video.filename);
    if (element.readyState >= 1) { seek(); } else { element.addEventListener("loadedmetadata", seek, { once: true }); }
  }

  if (!investigation) return <div className="mx-auto w-full max-w-7xl px-6 py-12 text-sm text-slate-500">Loading case workspace…</div>;
  const readyVideos = investigation.videos.filter((video) => video.status === "ready");
  const activeVideo = readyVideos.find((video) => selected.has(video.id)) ?? readyVideos[0];
  const processingCount = investigation.videos.length - readyVideos.length;

  return <main className="mx-auto w-full max-w-7xl px-6 py-10">
    <header className="flex flex-col gap-5 rounded-3xl border border-white/70 bg-white/65 p-6 shadow-[0_24px_70px_-35px_rgba(30,64,175,0.35)] backdrop-blur-xl dark:border-white/5 dark:bg-zinc-950/65 lg:flex-row lg:items-end lg:justify-between">
      <div><Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white">← All cases</Link><div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight">{investigation.name}</h1><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">{readyVideos.length} analyzed source{readyVideos.length === 1 ? "" : "s"}</span>{processingCount > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">{processingCount} processing</span>}</div>{investigation.description && <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-zinc-400">{investigation.description}</p>}</div>
      <button onClick={() => setModalOpen(true)} className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5">Add footage</button>
    </header>

    <div className="mt-8 grid gap-7 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-5"><section><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Evidence sources</h2><p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Choose ready videos to search together.</p></div><span className="text-xs font-medium text-slate-500">{selected.size} selected</span></div><VideoList videos={investigation.videos} selected={selected} onToggle={toggleVideo} /></section><ProcessingStatus videos={investigation.videos} /></aside>
      <div className="space-y-6"><section><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Footage review</h2><p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Jump to supporting clips from each answer.</p></div>{activeVideo && <span className="max-w-48 truncate text-xs text-slate-500 dark:text-zinc-400">Now viewing: {activeVideo.label}</span>}</div><VideoPlayer ref={videoRef} src={activeVideo ? mediaUrl(activeVideo.filename) : undefined} /></section><AskPanel investigationId={id} selectedVideoIds={[...selected]} onPlayEvidence={playEvidence} /></div>
    </div>
    <AddVideoModal investigationId={id} isOpen={modalOpen} onClose={() => setModalOpen(false)} onAdded={refresh} />
  </main>;
}