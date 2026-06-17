/**
 * Split long text into overlapping chunks for embedding + retrieval.
 *
 * We measure size in characters as a cheap proxy for tokens (~4 chars/token).
 * Defaults: ~800 tokens per chunk with ~15% overlap, so context isn't cut
 * mid-thought and a relevant passage is unlikely to fall between two chunks.
 *
 * Chunks break on word boundaries, never mid-word.
 */
export interface ChunkOptions {
  /** Target chunk size in characters (default 3200 ≈ 800 tokens). */
  chunkSize?: number;
  /** Overlap in characters carried into the next chunk (default 480 ≈ 120 tokens). */
  overlap?: number;
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const chunkSize = options.chunkSize ?? 3200;
  const overlap = options.overlap ?? 480;

  // Collapse all whitespace runs to single spaces.
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const words = clean.split(" ");
  const chunks: string[] = [];

  let current: string[] = [];
  let currentLen = 0;

  for (const word of words) {
    current.push(word);
    currentLen += word.length + 1; // +1 for the joining space

    if (currentLen >= chunkSize) {
      chunks.push(current.join(" "));

      // Carry the last `overlap` characters' worth of words into the next chunk.
      const tail: string[] = [];
      let tailLen = 0;
      for (let i = current.length - 1; i >= 0 && tailLen < overlap; i--) {
        tail.unshift(current[i]);
        tailLen += current[i].length + 1;
      }
      current = tail;
      currentLen = tailLen;
    }
  }

  if (current.length > 0) {
    chunks.push(current.join(" "));
  }

  return chunks;
}
