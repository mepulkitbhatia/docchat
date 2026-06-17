/**
 * Delete all documents (and their chunks, via cascade).
 * Handy for a clean slate during development.
 * Run with:  npx tsx scripts/reset-docs.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const r = await prisma.document.deleteMany();
  console.log(`Deleted ${r.count} document(s) and their chunks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
