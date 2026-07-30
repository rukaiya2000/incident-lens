"use client";

import { useState } from "react";
import {
  addDocumentFromUrl,
  addVideo,
  addVideoFromUrl,
  CaseDocument,
  CaseItemPreview,
  previewCaseSource,
  Video,
} from "../../../lib/api";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const KIND_ICON: Record<CaseItemPreview["kind"], string> = {
  video: "🎥",
  audio: "🎙️",
  document: "📄",
};

function UploadTab({
  investigationId,
  onAdded,
  onClose,
}: {
  investigationId: string;
  onAdded: () => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !label.trim()) return;
    setUploading(true);
    setError(null);
    try {
      await addVideo(investigationId, file, label.trim());
      setLabel("");
      setFile(null);
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-500">Label</label>
        <input
          autoFocus
          className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          placeholder="e.g. Bodycam A"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-500">Video file</label>
        <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-[var(--border)] px-3 py-5 text-center text-sm text-zinc-500 transition hover:border-[var(--accent)]/50">
          {file ? (
            <span className="truncate font-medium text-[var(--foreground)]">{file.name}</span>
          ) : (
            <span>Click to choose a video</span>
          )}
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={uploading || !file || !label.trim()}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition disabled:opacity-50"
        >
          {uploading && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {uploading ? "Uploading…" : "Add"}
        </button>
      </div>
    </form>
  );
}

function CaseLinkTab({
  investigationId,
  onAdded,
  existingSourceUrls,
}: {
  investigationId: string;
  onAdded: () => void;
  existingSourceUrls: Set<string>;
}) {
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referer, setReferer] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<CaseItemPreview[] | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [filterKind, setFilterKind] = useState<CaseItemPreview["kind"] | "all">("all");
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());
  const [checkedIndices, setCheckedIndices] = useState<Set<number>>(new Set());
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setFetching(true);
    setError(null);
    setItems(null);
    try {
      const result = await previewCaseSource(investigationId, url.trim());
      setItems(result.items);
      setLabels(result.items.map((v) => v.label));
      setReferer(result.referer);
      setAddedIndices(new Set());
      setCheckedIndices(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that page");
    } finally {
      setFetching(false);
    }
  }

  async function addItem(index: number, refererOverride?: string) {
    if (!items) return;
    const item = items[index];
    if (item.kind === "document") {
      await addDocumentFromUrl(investigationId, item.source_url, labels[index].trim());
    } else {
      await addVideoFromUrl(
        investigationId,
        item.source_url,
        labels[index].trim(),
        refererOverride ?? referer,
        item.kind
      );
    }
    setAddedIndices((prev) => new Set(prev).add(index));
  }

  async function handleAdd(index: number) {
    setAddingIndex(index);
    setError(null);
    try {
      await addItem(index);
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setAddingIndex(null);
    }
  }

  function toggleChecked(index: number) {
    setCheckedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }

  function visibleAddableIndices(): number[] {
    if (!items) return [];
    return items
      .map((item, i) => ({ item, i }))
      .filter(
        ({ item, i }) =>
          (filterKind === "all" || item.kind === filterKind) &&
          !addedIndices.has(i) &&
          !existingSourceUrls.has(item.source_url)
      )
      .map(({ i }) => i);
  }

  function toggleSelectAllVisible() {
    const visible = visibleAddableIndices();
    setCheckedIndices((prev) =>
      visible.every((i) => prev.has(i)) ? new Set() : new Set(visible)
    );
  }

  async function handleAddSelected() {
    const indices = [...checkedIndices];
    if (indices.length === 0) return;
    setError(null);
    setBulkProgress({ done: 0, total: indices.length });
    for (let n = 0; n < indices.length; n++) {
      try {
        await addItem(indices[n]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Some items failed to add — check the footage list.");
      }
      setBulkProgress({ done: n + 1, total: indices.length });
    }
    setCheckedIndices(new Set());
    setBulkProgress(null);
    onAdded();
  }

  const counts: Record<string, number> = {};
  for (const item of items ?? []) counts[item.kind] = (counts[item.kind] ?? 0) + 1;
  const visibleAddable = visibleAddableIndices();
  const allVisibleChecked = visibleAddable.length > 0 && visibleAddable.every((i) => checkedIndices.has(i));

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleFetch} className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-500">Case / evidence page URL</label>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            placeholder="https://www.chicagocopa.org/case/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="submit"
            disabled={fetching || !url.trim()}
            className="flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition disabled:opacity-50"
          >
            {fetching && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {fetching ? "Fetching…" : "Fetch items"}
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Pulls every video, audio recording, and document on the page, so you can pick which
          ones to ingest.
        </p>
      </form>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {addedIndices.size > 0 && !bulkProgress && (
        <p className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2 text-xs text-[var(--accent)]">
          Ingestion started for {addedIndices.size} item{addedIndices.size === 1 ? "" : "s"} —
          you can keep adding more, or close this and check progress in the sidebar.
        </p>
      )}

      {bulkProgress && (
        <p className="flex items-center gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2 text-xs text-[var(--accent)]">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Adding {bulkProgress.done} of {bulkProgress.total}… this can take a while for large
          videos, ingestion continues in the background either way.
        </p>
      )}

      {items && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(["all", "video", "audio", "document"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setFilterKind(kind)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  filterKind === kind
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-[var(--border)] text-zinc-500 hover:border-[var(--accent)]/40"
                }`}
              >
                {kind === "all" ? `All (${items.length})` : `${KIND_ICON[kind]} ${kind} (${counts[kind] ?? 0})`}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <label className="flex items-center gap-1.5 text-zinc-500">
              <input
                type="checkbox"
                checked={allVisibleChecked}
                disabled={visibleAddable.length === 0}
                onChange={toggleSelectAllVisible}
                className="h-3.5 w-3.5 accent-[var(--accent)]"
              />
              Select all in view ({visibleAddable.length} addable)
            </label>
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={checkedIndices.size === 0 || bulkProgress !== null}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 px-3 py-1.5 font-medium text-white transition disabled:opacity-50"
            >
              Add {checkedIndices.size} selected
            </button>
          </div>
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
            {items.map((item, i) => {
              if (filterKind !== "all" && item.kind !== filterKind) return null;
              const added = addedIndices.has(i) || existingSourceUrls.has(item.source_url);
              return (
                <div
                  key={item.source_url}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-2.5"
                >
                  <input
                    type="checkbox"
                    checked={checkedIndices.has(i)}
                    disabled={added}
                    onChange={() => toggleChecked(i)}
                    className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  {item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
                      alt=""
                      className="h-10 w-16 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded bg-zinc-200 text-lg dark:bg-zinc-800">
                      {KIND_ICON[item.kind]}
                    </div>
                  )}
                  <input
                    value={labels[i]}
                    onChange={(e) =>
                      setLabels((prev) => prev.map((l, idx) => (idx === i ? e.target.value : l)))
                    }
                    className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none transition hover:border-[var(--border)] focus:border-[var(--accent)]"
                  />
                  <span className="shrink-0 font-mono text-xs text-zinc-500">
                    {item.kind === "document" ? "PDF" : formatDuration(item.duration_sec)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAdd(i)}
                    disabled={added || addingIndex === i}
                    className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-slate-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium transition hover:border-[var(--accent)]/50 disabled:opacity-60"
                  >
                    {addingIndex === i && (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    )}
                    {added ? "Added ✓" : addingIndex === i ? "Adding…" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddVideoModal({
  investigationId,
  isOpen,
  onClose,
  onAdded,
  existingVideos,
  existingDocuments,
}: {
  investigationId: string;
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
  existingVideos: Video[];
  existingDocuments: CaseDocument[];
}) {
  const [tab, setTab] = useState<"upload" | "link">("upload");

  if (!isOpen) return null;

  const existingSourceUrls = new Set(
    [...existingVideos, ...existingDocuments]
      .map((v) => v.source_url)
      .filter((url): url is string => !!url)
  );

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Add evidence</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 transition hover:text-[var(--foreground)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 text-sm dark:bg-zinc-900">
          <button
            onClick={() => setTab("upload")}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
              tab === "upload"
                ? "bg-[var(--surface)] shadow-sm"
                : "text-zinc-500 hover:text-[var(--foreground)]"
            }`}
          >
            Upload file
          </button>
          <button
            onClick={() => setTab("link")}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
              tab === "link"
                ? "bg-[var(--surface)] shadow-sm"
                : "text-zinc-500 hover:text-[var(--foreground)]"
            }`}
          >
            From case link
          </button>
        </div>

        {tab === "upload" ? (
          <UploadTab investigationId={investigationId} onAdded={onAdded} onClose={onClose} />
        ) : (
          <CaseLinkTab
            investigationId={investigationId}
            onAdded={onAdded}
            existingSourceUrls={existingSourceUrls}
          />
        )}
      </div>
    </div>
  );
}
