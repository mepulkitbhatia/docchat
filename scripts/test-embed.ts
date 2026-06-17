/**
 * Quick isolation test for the Gemini embeddings client.
 * Run with:  npx tsx scripts/test-embed.ts
 */
import "dotenv/config";
import { embedQuery } from "../src/lib/embeddings";

async function main() {
  console.log("GOOGLE_API_KEY set:", Boolean(process.env.GOOGLE_API_KEY));
  const v = await embedQuery("hello world");
  console.log("✅ Embedding length:", v.length, "(expected 768)");
  console.log("First 5 values:", v.slice(0, 5));
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
