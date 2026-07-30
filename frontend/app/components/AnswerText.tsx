"use client";

import ReactMarkdown from "react-markdown";

export default function AnswerText({ text }: { text: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}
