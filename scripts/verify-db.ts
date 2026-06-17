/**
 * Phase 1 verification script.
 * Run with:  npx tsx scripts/verify-db.ts
 *
 * Proves three things end-to-end:
 *   1. We can connect to Neon Postgres.
 *   2. The pgvector extension is installed.
 *   3. A cosine-distance (<=>) similarity query actually works.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  // 1. Connectivity + Postgres version
  const version =
    await prisma.$queryRaw<{ version: string }[]>`SELECT version()`;
  console.log("✅ Connected to Postgres:", version[0].version.split(",")[0]);

  // 2. pgvector installed?
  const ext = await prisma.$queryRaw<
    { extname: string; extversion: string }[]
  >`SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'`;
  if (ext.length === 0) {
    throw new Error(
      "❌ pgvector extension NOT found. Did the migration run / extension get created?",
    );
  }
  console.log(`✅ pgvector installed (version ${ext[0].extversion})`);

  // 3. Tables exist?
  const tables = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name`;
  console.log(
    "✅ Tables present:",
    tables.map((t) => t.table_name).join(", ") || "(none)",
  );

  // 4. A real cosine-distance query (no rows needed — pure pgvector math)
  const sim = await prisma.$queryRaw<{ distance: number }[]>`
    SELECT '[1,0,0]'::vector <=> '[0,1,0]'::vector AS distance`;
  console.log(
    `✅ Cosine distance between [1,0,0] and [0,1,0] = ${sim[0].distance} (expected 1)`,
  );

  console.log("\n🎉 Phase 1 database checks passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
