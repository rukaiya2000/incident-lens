"use client";

import { CaseDocument, DocumentStatus } from "../../../lib/api";

const STATUS_META: Record<DocumentStatus, { label: string; dot: string; pulse?: boolean }> = {
  downloading: { label: "Downloading…", dot: "bg-sky-500", pulse: true },
  extracting: { label: "Extracting…", dot: "bg-amber-500", pulse: true },
  partial: { label: "Partial", dot: "bg-orange-500" },
  ready: { label: "Ready", dot: "bg-emerald-500" },
  failed: { label: "Failed", dot: "bg-red-500" },
};

export default function DocumentList({
  documents,
  selected,
  onToggle,
}: {
  documents: CaseDocument[];
  selected: Set<string>;
  onToggle: (documentId: string) => void;
}) {
  if (documents.length === 0) return null;

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <h2 className="mb-3 flex items-center justify-between text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        <span>Documents</span>
        <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[var(--accent)] normal-case">
          {selected.size} selected
        </span>
      </h2>
      <ul className="flex flex-col gap-2">
        {documents.map((doc) => {
          const meta = STATUS_META[doc.status];
          const isSelected = selected.has(doc.id);
          const disabled = doc.status !== "ready";
          return (
            <li key={doc.id}>
              <label
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                  disabled
                    ? "cursor-not-allowed border-[var(--border)] opacity-70"
                    : isSelected
                      ? "cursor-pointer border-[var(--accent)] bg-[var(--accent)]/5"
                      : "cursor-pointer border-[var(--border)] hover:border-[var(--accent)]/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => onToggle(doc.id)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span className="text-lg">📄</span>
                <div className="flex min-w-0 flex-1 flex-col">
                  {doc.source_url ? (
                    <a
                      href={doc.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="truncate text-sm font-medium hover:text-[var(--accent)] hover:underline"
                    >
                      {doc.label}
                    </a>
                  ) : (
                    <span className="truncate text-sm font-medium">{doc.label}</span>
                  )}
                  {(doc.status === "partial" || doc.status === "failed") && doc.error && (
                    <span className="truncate text-xs text-amber-600 dark:text-amber-500">
                      {doc.error}
                    </span>
                  )}
                </div>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-500">
                  <span className="relative flex h-2 w-2">
                    {meta.pulse && (
                      <span
                        className={`absolute inline-flex h-full w-full animate-ping rounded-full ${meta.dot} opacity-60`}
                      />
                    )}
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${meta.dot}`} />
                  </span>
                  {meta.label}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
