"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ConfirmDialog from "@/components/confirm-dialog";

interface Citation {
  marker: number;
  chunkIndex: number;
  similarity: number;
  content: string;
}

export interface Turn {
  question: string;
  answer: string;
  citations: Citation[];
}

const REFUSAL = "I couldn't find that in this document";

// Tailwind-styled renderers so markdown answers look clean without a plugin.
const markdownComponents = {
  p: (props: React.ComponentProps<"p">) => (
    <p className="mb-3 leading-7 last:mb-0" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul className="mb-3 list-disc space-y-1 pl-5" {...props} />
  ),
  ol: (props: React.ComponentProps<"ol">) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5" {...props} />
  ),
  li: (props: React.ComponentProps<"li">) => (
    <li className="leading-7" {...props} />
  ),
  strong: (props: React.ComponentProps<"strong">) => (
    <strong className="font-semibold" {...props} />
  ),
  h1: (props: React.ComponentProps<"h1">) => (
    <h3 className="mb-2 mt-4 font-semibold" {...props} />
  ),
  h2: (props: React.ComponentProps<"h2">) => (
    <h3 className="mb-2 mt-4 font-semibold" {...props} />
  ),
  h3: (props: React.ComponentProps<"h3">) => (
    <h3 className="mb-2 mt-4 font-semibold" {...props} />
  ),
  code: (props: React.ComponentProps<"code">) => (
    <code
      className="rounded bg-zinc-100 px-1 py-0.5 text-[0.85em] dark:bg-zinc-800"
      {...props}
    />
  ),
  pre: (props: React.ComponentProps<"pre">) => (
    <pre
      className="mb-3 overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs dark:bg-zinc-800"
      {...props}
    />
  ),
  a: (props: React.ComponentProps<"a">) => (
    <a className="underline underline-offset-2" {...props} />
  ),
};

export default function Chat({
  documentId,
  ready,
  initialTurns = [],
  suggestions = [],
}: {
  documentId: string;
  ready: boolean;
  initialTurns?: Turn[];
  suggestions?: string[];
}) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function copyAnswer(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((c) => (c === index ? null : c)), 1500);
    } catch {
      // clipboard unavailable (e.g. insecure context) — ignore
    }
  }

  // Auto-scroll to the newest content as it streams.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, loading]);

  async function runStream(label: string, doFetch: () => Promise<Response>) {
    if (loading || !ready) return false;
    setError(null);
    setLoading(true);
    try {
      const res = await doFetch();
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong.");
        return false;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      let headerParsed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });

        const nl = raw.indexOf("\n");
        if (nl === -1) continue;

        if (!headerParsed) {
          let citations: Citation[] = [];
          try {
            citations = JSON.parse(raw.slice(0, nl)).citations ?? [];
          } catch {
            citations = [];
          }
          headerParsed = true;
          setTurns((t) => [
            ...t,
            { question: label, answer: raw.slice(nl + 1), citations },
          ]);
        } else {
          const answer = raw.slice(nl + 1);
          setTurns((t) => {
            const copy = [...t];
            copy[copy.length - 1] = { ...copy[copy.length - 1], answer };
            return copy;
          });
        }
      }
      return true;
    } catch {
      setError("Network error — please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  function askText(q: string) {
    return runStream(q, () =>
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, question: q }),
      }),
    );
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;
    setQuestion("");
    const ok = await askText(q);
    if (!ok) setQuestion(q);
  }

  function summarize() {
    runStream("Summarize this document", () =>
      fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      }),
    );
  }

  async function performClear() {
    setConfirmingClear(false);
    setTurns([]);
    await fetch(`/api/documents/${documentId}/messages`, { method: "DELETE" });
  }

  const lastStreaming =
    loading && (turns.length === 0 || turns[turns.length - 1].answer === "");

  return (
    <div className="mt-6">
      <div className="space-y-6">
        {turns.length === 0 && !loading && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              Ask anything about this document, or summarize it. Answers come
              only from its contents, with citations.
            </p>
            {ready && suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => askText(s)}
                    className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className="space-y-3">
            {t.question && (
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                {t.question}
              </p>
            )}
            <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="text-sm text-zinc-800 dark:text-zinc-200">
                {t.answer ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {t.answer}
                  </ReactMarkdown>
                ) : (
                  <span className="text-zinc-400">…</span>
                )}
              </div>

              {t.answer && (i < turns.length - 1 || !loading) && (
                <button
                  onClick={() => copyAnswer(t.answer, i)}
                  className="mt-3 text-xs font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  {copiedIndex === i ? "Copied ✓" : "Copy"}
                </button>
              )}

              {t.citations.length > 0 &&
                !t.answer.trim().startsWith(REFUSAL) && (
                  <details className="mt-4 group">
                    <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                      {t.citations.length} source passage
                      {t.citations.length === 1 ? "" : "s"}
                    </summary>
                    <ul className="mt-3 space-y-3">
                      {t.citations.map((c) => (
                        <li
                          key={c.marker}
                          className="rounded-lg bg-zinc-50 p-3 text-xs leading-6 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                        >
                          <span className="mr-2 font-semibold text-zinc-700 dark:text-zinc-300">
                            [{c.marker}]
                          </span>
                          <span className="text-zinc-400">
                            similarity {c.similarity}
                          </span>
                          <p className="mt-1">
                            {c.content.length > 400
                              ? c.content.slice(0, 400) + "…"
                              : c.content}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
            </div>
          </div>
        ))}

        {lastStreaming && <p className="text-sm text-zinc-500">Thinking…</p>}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form onSubmit={ask} className="mt-6 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={ready ? "Ask a question…" : "Document is still processing…"}
          disabled={!ready || loading}
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
        />
        <button
          type="submit"
          disabled={!ready || loading || !question.trim()}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Ask
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          onClick={summarize}
          disabled={!ready || loading}
          className="text-sm font-medium text-zinc-600 underline-offset-2 hover:underline disabled:opacity-40 dark:text-zinc-400"
        >
          ✦ Summarize this document
        </button>
        {turns.length > 0 && (
          <button
            onClick={() => setConfirmingClear(true)}
            disabled={loading}
            className="text-sm text-zinc-400 hover:text-red-600 disabled:opacity-40 dark:hover:text-red-400"
          >
            Clear conversation
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmingClear}
        title="Clear conversation?"
        message="This permanently deletes all messages in this conversation. The document itself stays."
        confirmLabel="Clear"
        onConfirm={performClear}
        onCancel={() => setConfirmingClear(false)}
      />
    </div>
  );
}
