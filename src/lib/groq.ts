import type { RetrievedChunk } from "@/lib/retrieval";

/**
 * Groq chat completions (OpenAI-compatible API), streamed.
 * Free key: https://console.groq.com  → set GROQ_API_KEY in .env
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Groq retired llama-3.3-70b-versatile on 2026-08-16. Of the replacements it
// lists, qwen/qwen3.8-27b is capped at 1,000 output tokens per minute on the
// free tier (one summary uses most of that), so this one is used instead.
const MODEL = "openai/gpt-oss-120b";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const ANSWER_SYSTEM_PROMPT = `You are DocChat, a careful assistant that answers questions about a single document.

Rules:
- Answer ONLY using the numbered context passages provided in the latest message. Do not use outside knowledge.
- You may use the earlier conversation to understand follow-up questions, but ground every answer in the context passages.
- If the answer is not contained in the context, reply exactly: "I couldn't find that in this document." Do not guess.
- Cite the passages you used with bracketed numbers like [1] or [2], matching the context.
- Be concise and factual.`;

const SUMMARY_SYSTEM_PROMPT = `You are DocChat. Summarize the document below using ONLY its content.
Write a clear, well-structured summary (a short overview followed by the key points).
Do not invent information that isn't present.`;

function apiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to .env and restart the dev server.",
    );
  }
  return key;
}

/** Build messages: system rules + prior turns + (context + question). */
export function buildMessages(
  question: string,
  chunks: RetrievedChunk[],
  history: ChatMessage[] = [],
): ChatMessage[] {
  const context = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");
  return [
    { role: "system", content: ANSWER_SYSTEM_PROMPT },
    ...history,
    {
      role: "user",
      content: `Context passages:\n\n${context}\n\nQuestion: ${question}`,
    },
  ];
}

/** Build messages for a whole-document summary. */
export function buildSummaryMessages(chunks: RetrievedChunk[]): ChatMessage[] {
  const doc = chunks.map((c) => c.content).join("\n\n");
  return [
    { role: "system", content: SUMMARY_SYSTEM_PROMPT },
    { role: "user", content: `Document:\n\n${doc}\n\nWrite the summary.` },
  ];
}

/** Core: stream a chat completion as a ReadableStream of text deltas. */
export async function streamChat(
  messages: ChatMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.2, stream: true }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq request failed (${res.status}): ${detail}`);
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  // Groq streams `data: {json}\n\n` lines, ending with `data: [DONE]`.
  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          // This model often writes citations as 【1】 whatever the prompt
          // says; keep them in the [1] form the rest of the app expects.
          if (delta) {
            controller.enqueue(
              encoder.encode(delta.replace(/【/g, "[").replace(/】/g, "]")),
            );
          }
        } catch {
          // ignore keep-alive / non-JSON lines
        }
      }
    },
  });

  return res.body.pipeThrough(transform);
}

/** Stream a grounded answer for a question (with optional prior history). */
export function streamAnswer(
  question: string,
  chunks: RetrievedChunk[],
  history: ChatMessage[] = [],
): Promise<ReadableStream<Uint8Array>> {
  return streamChat(buildMessages(question, chunks, history));
}

/** Stream a whole-document summary. */
export function streamSummary(
  chunks: RetrievedChunk[],
): Promise<ReadableStream<Uint8Array>> {
  return streamChat(buildSummaryMessages(chunks));
}
