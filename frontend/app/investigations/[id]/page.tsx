"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { AskResponse, Evidence, getInvestigation, InvestigationDetail, mediaUrl } from "../../lib/api";
import AddVideoModal from "./components/AddVideoModal";
import AskPanel from "./components/AskPanel";
import ClaimsPanel from "./components/ClaimsPanel";
import DocumentList from "./components/DocumentList";
import GraphView from "./components/GraphView";
import ProcessingStatus from "./components/ProcessingStatus";
import VideoList from "./components/VideoList";
import VideoPlayer from "./components/VideoPlayer";

export default function InvestigationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [investigation, setInvestigation] = useState<InvestigationDetail | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [rightTab, setRightTab] = useState<"ask" | "graph">("ask");
  const [graphModalOpen, setGraphModalOpen] = useState(false);
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
    setSelectedDocuments((previous) => {
      const readyIds = new Set(data.documents.filter((doc) => doc.status === "ready").map((doc) => doc.id));
      const next = new Set([...previous].filter((docId) => readyIds.has(docId)));
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
    const documents = investigation.documents ?? [];
    if (!investigation.videos.some((video) => !terminal.has(video.status)) && !documents.some((document) => !terminal.has(document.status))) return;
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [investigation, refresh]);

  useEffect(() => {
    if (!graphModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGraphModalOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [graphModalOpen]);
  function toggleVideo(videoId: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(videoId)) next.delete(videoId); else next.add(videoId);
      return next;
    });
  }

  function toggleDocument(documentId: string) {
    setSelectedDocuments((previous) => {
      const next = new Set(previous);
      if (next.has(documentId)) next.delete(documentId); else next.add(documentId);
      return next;
    });
  }

  function handleAskResult(result: AskResponse) {
    setHighlightVideoIds(new Set(result.evidence.map((evidence) => evidence.video_id)));
  }

  function playEvidence(evidence: Evidence) {
    const video = investigation?.videos.find((item) => item.id === evidence.video_id);
    const element = videoRef.current;
    if (!video || !element) return;
    const seek = () => { element.currentTime = evidence.start_sec; void element.play(); };
    if (!element.src.endsWith(video.filename)) element.src = mediaUrl(video.filename);
    if (element.readyState >= 1) seek(); else element.addEventListener("loadedmetadata", seek, { once: true });
  }

  if (!investigation) return <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-10"><div className="h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" /><div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_380px]"><div className="h-48 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" /><div className="h-48 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" /></div></div>;

  const documents = investigation.documents ?? [];
  const readyVideos = investigation.videos.filter((video) => video.status === "ready");
  const activeVideo = readyVideos.find((video) => selected.has(video.id)) ?? readyVideos[0];
  const processingCount = investigation.videos.length - readyVideos.length;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-5 rounded-3xl border border-white/70 bg-white/65 p-6 shadow-[0_24px_70px_-35px_rgba(30,64,175,0.35)] backdrop-blur-xl dark:border-white/5 dark:bg-zinc-950/65 lg:flex-row lg:items-end lg:justify-between">
        <div><Link href="/" className="text-sm font-medium text-slate-500 transition hover:text-blue-700 dark:hover:text-blue-400">All cases</Link><div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight">{investigation.name}</h1><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">{readyVideos.length} analyzed source{readyVideos.length === 1 ? "" : "s"}</span>{processingCount > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">{processingCount} processing</span>}</div>{investigation.description && <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">{investigation.description}</p>}</div>
        <button onClick={() => setModalOpen(true)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5"><span className="text-base leading-none">+</span> Add evidence</button>
      </header>

      <div className="grid gap-7 xl:grid-cols-[280px_minmax(0,1fr)_380px] xl:items-start">
        <aside className="flex flex-col gap-5">
          <section className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-white/5 dark:bg-zinc-950/65">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Evidence sources</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Choose ready videos to search together.</p>
              </div>
              <span className="rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-xs font-medium text-[var(--accent)]">{selected.size} selected</span>
            </div>
            <VideoList videos={investigation.videos} selected={selected} onToggle={toggleVideo} />
          </section>
          <ProcessingStatus videos={investigation.videos} />
          <DocumentList documents={documents} selected={selectedDocuments} onToggle={toggleDocument} />
        </aside>
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Footage review</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Jump to supporting clips from each answer.</p>
              </div>
              {activeVideo && <span className="max-w-48 truncate text-xs text-slate-500 dark:text-zinc-400">Now viewing: {activeVideo.label}</span>}
            </div>
            <VideoPlayer ref={videoRef} src={activeVideo ? mediaUrl(activeVideo.filename) : undefined} />
          </section>
          <ClaimsPanel
            investigationId={id}
            refreshKey={investigation.videos.map((video) => `${video.id}:${video.status}`).join("|")}
            onPlayEvidence={playEvidence}
          />
        </div>
        <section className="rounded-3xl border border-white/80 bg-white/70 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl xl:sticky xl:top-24 dark:border-white/5 dark:bg-zinc-950/65">
          <div className="mb-4 flex gap-1 rounded-full bg-slate-100 p-1 text-sm dark:bg-zinc-900">
            <button onClick={() => setRightTab("ask")} className={`flex-1 rounded-full px-3 py-1.5 font-medium transition ${rightTab === "ask" ? "bg-white shadow-sm dark:bg-zinc-800" : "text-zinc-500 hover:text-[var(--foreground)]"}`}>Ask</button>
            <button onClick={() => setRightTab("graph")} className={`flex-1 rounded-full px-3 py-1.5 font-medium transition ${rightTab === "graph" ? "bg-white shadow-sm dark:bg-zinc-800" : "text-zinc-500 hover:text-[var(--foreground)]"}`}>Graph</button>
          </div>
          {rightTab === "ask" ? (
            <AskPanel
              investigationId={id}
              selectedVideoIds={[...selected]}
              selectedDocumentIds={[...selectedDocuments]}
              onPlayEvidence={playEvidence}
              onResult={handleAskResult}
            />
          ) : (
            <GraphView investigationId={id} highlightVideoIds={highlightVideoIds} onExpand={() => setGraphModalOpen(true)} />
          )}
        </section>
      </div>

      {graphModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:p-8"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setGraphModalOpen(false); }}
        >
          <section role="dialog" aria-modal="true" aria-label="Evidence graph" className="flex h-[min(920px,92vh)] w-full max-w-[1600px] flex-col rounded-3xl border border-white/15 bg-white p-5 shadow-2xl dark:bg-zinc-950 sm:p-7">
            <header className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--accent)]">Evidence relationships</p>
                <h2 className="mt-1 text-xl font-semibold">Full investigation graph</h2>
              </div>
              <button type="button" onClick={() => setGraphModalOpen(false)} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800">Close</button>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden">
              <GraphView investigationId={id} highlightVideoIds={highlightVideoIds} expanded />
            </div>
          </section>
        </div>
      )}
      <AddVideoModal investigationId={id} isOpen={modalOpen} onClose={() => setModalOpen(false)} onAdded={refresh} existingVideos={investigation.videos} existingDocuments={documents} />
    </main>
  );
}