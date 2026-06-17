import { prisma } from "@/lib/prisma";
import { embedQuery, toVectorLiteral } from "@/lib/embeddings";

export interface RetrievedChunk {
  id: string;
  content: string;
  chunkIndex: number;
  similarity: number; // 1 = identical direction, 0 = unrelated (cosine)
}

/**
 * Retrieve the top-k most relevant chunks of a document for a question.
 *
 * 1. Embed the question (as a RETRIEVAL_QUERY).
 * 2. Rank chunks by cosine distance using pgvector's `<=>` operator.
 * 3. Return them with a similarity score (1 - distance).
 */
export async function retrieveChunks(
  documentId: string,
  question: string,
  k = 5,
): Promise<RetrievedChunk[]> {
  const queryVector = toVectorLiteral(await embedQuery(question));

  // Raw SQL because pgvector's distance operator isn't exposed by Prisma's
  // typed API. The query vector is passed as a parameter and cast to ::vector.
  const rows = await prisma.$queryRaw<RetrievedChunk[]>`
    SELECT
      id,
      content,
      "chunkIndex",
      1 - (embedding <=> ${queryVector}::vector) AS similarity
    FROM "Chunk"
    WHERE "documentId" = ${documentId}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${queryVector}::vector
    LIMIT ${k}
  `;

  return rows;
}
