"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AskResponse, clipDownloadUrl, crossCaseAsk, getInvestigation, InvestigationDetail } from "../lib/api";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const ids = (searchParams.get("ids") ?? "").split(",").filter(Boolean);

  const [cases, setCases] = useState<InvestigationDetail[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResponse | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const details = await Promise.all(ids.map((id) => getInvestigation(id)));
        setCases(details);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load cases");
      } finally {
        setLoadingCases(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || ids.length < 2) return;
    setAsking(true);
    setError(null);
    try {
      setResult(await crossCaseAsk(ids, question.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get an answer");
    } finally {
      setAsking(false);
    }
  }

  if (ids.length < 2) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-12">
        <p className="text-sm text-zinc-500">
          Select at least 2 investigations from the home page to compare them.
        </p>
        <Link href="/" className="text-sm font-medium text-[var(--accent)] hover:underline">
          ← Back to investigations
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm font-medium text-zinc-500 transition hover:text-[var(--accent)]">
          ← All investigations
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Compare cases</h1>
        {loadingCases ? (
          <div className="h-5 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Comparing: {cases.map((c) => c.name).join(", ")}
          </p>
        )}
      </header>

      <form onSubmit={handleAsk} className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <textarea
          className="resize-none rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          placeholder="Ask a question across these cases (e.g. 'did any involve the same officer?')…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={asking || !question.trim()}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition disabled:opacity-50"
          >
            {asking && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {asking ? "Thinking…" : "Ask"}
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>

      {result && (
        <div className="flex flex-col gap-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div>
            <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Answer</h3>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{result.answer}</p>
          </div>
          {result.evidence.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Evidence ({result.evidence.length})
              </h3>
              <div className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
                {result.evidence.map((ev, i) => (
                  <div key={i} className="rounded-xl border border-[var(--border)] p-3 text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      {ev.investigation_name && (
                        <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-xs text-[var(--accent)]">
                          {ev.investigation_name}
                        </span>
                      )}
                      <span>🎥 {ev.video_label}</span>
                      <span className="font-mono text-xs text-zinc-500">
                        {formatTime(ev.start_sec)}–{formatTime(ev.end_sec)}
                      </span>
                      <a
                        href={clipDownloadUrl(ev.video_id, ev.start_sec, ev.end_sec)}
                        download
                        title="Download this clip"
                        className="ml-auto text-zinc-400 transition hover:text-[var(--accent)]"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
                        </svg>
                      </a>
                    </div>
                    {ev.snippet && (
                      <p className="mt-1 text-zinc-500 dark:text-zinc-400">{ev.snippet}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
