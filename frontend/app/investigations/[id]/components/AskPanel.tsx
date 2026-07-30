"use client";

import { useState } from "react";
import { ask, AskResponse, Evidence } from "../../../lib/api";
import EvidenceCard from "./EvidenceCard";

export default function AskPanel({
  investigationId,
  selectedVideoIds,
  onPlayEvidence,
}: {
  investigationId: string;
  selectedVideoIds: string[];
  onPlayEvidence: (evidence: Evidence) => void;
}) {
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || selectedVideoIds.length === 0) return;
    setAsking(true);
    setError(null);
    try {
      setResult(await ask(investigationId, question.trim(), selectedVideoIds));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get an answer");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          className="resize-none rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          placeholder="Ask a question about the selected footage…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            {selectedVideoIds.length === 0
              ? "Select at least one video to ask a question."
              : `Scoped to ${selectedVideoIds.length} video${selectedVideoIds.length > 1 ? "s" : ""}`}
          </p>
          <button
            type="submit"
            disabled={asking || !question.trim() || selectedVideoIds.length === 0}
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

      {asking && !result && (
        <div className="flex flex-col gap-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-3 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-5">
          <div>
            <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Answer
            </h3>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{result.answer}</p>
          </div>
          {result.evidence.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Evidence ({result.evidence.length})
              </h3>
              <div className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
                {result.evidence.map((evidence, i) => (
                  <EvidenceCard key={i} evidence={evidence} onPlay={onPlayEvidence} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
