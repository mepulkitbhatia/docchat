/**
 * Build the streaming HTTP response used by /api/chat and /api/summary.
 * Wire protocol: first line is JSON `{ "citations": [...] }\n`, then the
 * answer text streams as plain UTF-8. The full answer is accumulated and
 * handed to `onComplete` (e.g. to persist it) once the stream finishes.
 */
export function streamingAnswerResponse(opts: {
  citations: unknown[];
  tokenStream: ReadableStream<Uint8Array>;
  onComplete?: (fullText: string) => Promise<void> | void;
}): Response {
  const { citations, tokenStream, onComplete } = opts;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let full = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(JSON.stringify({ citations }) + "\n"));
      const reader = tokenStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          controller.enqueue(value);
        }
      } finally {
        controller.close();
        if (onComplete) {
          try {
            await onComplete(full);
          } catch (e) {
            console.error("[stream] onComplete failed:", e);
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/** A ReadableStream that emits a single fixed string (for static replies). */
export function streamFromText(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}
