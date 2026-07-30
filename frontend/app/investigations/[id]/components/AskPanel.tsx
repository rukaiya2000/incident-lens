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
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="Ask a question about the selected footage..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
        />
        <button
          type="submit"
          disabled={asking || !question.trim() || selectedVideoIds.length === 0}
          className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {asking ? "Thinking..." : "Ask"}
        </button>
        {selectedVideoIds.length === 0 && (
          <p className="text-xs text-zinc-500">Select at least one video to ask a question.</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {result && (
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Answer</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm">{result.answer}</p>
          </div>
          {result.evidence.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Evidence</h3>
              {result.evidence.map((evidence, i) => (
                <EvidenceCard key={i} evidence={evidence} onPlay={onPlayEvidence} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
