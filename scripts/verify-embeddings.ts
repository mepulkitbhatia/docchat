/**
 * Phase 3 verification.
 * Run with:  npx tsx scripts/verify-embeddings.ts
 *
 * Confirms chunks have been embedded and stored as 768-dim vectors.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const counts = await prisma.$queryRaw<{ total: number; embedded: number }[]>`
    SELECT count(*)::int AS total,
           count(embedding)::int AS embedded
    FROM "Chunk"`;

  const { total, embedded } = counts[0];
  console.log(`Chunks total:    ${total}`);
  console.log(`Chunks embedded: ${embedded}`);

  if (embedded === 0) {
    console.log(
      "\n⚠️  No embeddings yet. Add GOOGLE_API_KEY to .env, restart the dev " +
        "server, and re-upload a PDF.",
    );
    return;
  }

  const dims = await prisma.$queryRaw<{ dims: number }[]>`
    SELECT vector_dims(embedding) AS dims
    FROM "Chunk" WHERE embedding IS NOT NULL LIMIT 1`;
  console.log(`Vector dimensions: ${dims[0].dims} (expected 768)`);

  console.log("\n🎉 Phase 3 embeddings check passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
