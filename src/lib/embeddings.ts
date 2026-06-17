/**
 * Embeddings via the Google Gemini API (gemini-embedding-001).
 * We request 768 dimensions to match our pgvector(768) column.
 * Uses a plain REST call — no SDK dependency, so nothing to keep in sync.
 *
 * Free API key: https://aistudio.google.com  → set GOOGLE_API_KEY in .env
 */

const MODEL = "gemini-embedding-001";
const OUTPUT_DIM = 768;
const BASE = "https://generativelanguage.googleapis.com/v1beta";

// Task type tells Gemini whether text is a stored document or a search query;
// matching them improves retrieval quality.
type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

// Gemini caps batch requests; stay well under it.
const BATCH_SIZE = 100;

function apiKey(): string {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error(
      "GOOGLE_API_KEY is not set. Add it to .env and restart the dev server.",
    );
  }
  return key;
}

async function embedBatch(
  texts: string[],
  taskType: TaskType,
): Promise<number[][]> {
  const res = await fetch(
    `${BASE}/models/${MODEL}:batchEmbedContents?key=${apiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${MODEL}`,
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: OUTPUT_DIM,
        })),
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini embedding failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { embeddings?: { values: number[] }[] };
  if (!data.embeddings) {
    throw new Error("Gemini embedding response had no embeddings.");
  }
  return data.embeddings.map((e) => e.values);
}

/** Embed many document chunks. Order is preserved. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const slice = texts.slice(i, i + BATCH_SIZE);
    out.push(...(await embedBatch(slice, "RETRIEVAL_DOCUMENT")));
  }
  return out;
}

/** Embed a single search query (used at retrieval time). */
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedBatch([text], "RETRIEVAL_QUERY");
  return vector;
}

/** Format a number[] as a pgvector literal: [0.1,0.2,...]. Cast with ::vector. */
export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
