/**
 * Self-check for the bundled sample document (no database or network needed):
 * it must split into at least 8 chunks, and each suggested question must be
 * answered from a chunk of its own.
 * Run with:  npx tsx scripts/test-sample-chunks.ts
 */
import assert from "node:assert/strict";
import { chunkText } from "../src/lib/chunk";
import { SAMPLE_QUESTIONS, SAMPLE_TEXT } from "../src/lib/sample";

const chunks = chunkText(SAMPLE_TEXT);
assert.ok(chunks.length >= 8, `expected at least 8 chunks, got ${chunks.length}`);

// The facts each suggested question needs, in the order of SAMPLE_QUESTIONS.
const FACTS = [
  ["priced at $699", "priced at $1,099", "priced at $1,799"],
  ["up to 14 hours", "up to 16 hours", "up to 12 hours", "two-year limited warranty"],
  ["8 a.m. to 8 p.m.", "10 a.m. to 6 p.m.", "help@nimbusnotebooks.example", "1-800-555-0142"],
];
assert.equal(FACTS.length, SAMPLE_QUESTIONS.length);

const home = FACTS.map((facts, q) => {
  const found = new Set<number>();
  for (const fact of facts) {
    const at = chunks.flatMap((c, i) => (c.includes(fact) ? [i] : []));
    assert.ok(at.length > 0, `"${fact}" is missing from the sample`);
    at.forEach((i) => found.add(i));
  }
  assert.equal(
    found.size,
    1,
    `the facts for "${SAMPLE_QUESTIONS[q]}" are spread over chunks ${[...found]}; they must sit in one`,
  );
  return [...found][0];
});
assert.equal(
  new Set(home).size,
  home.length,
  `suggested questions share a chunk: ${home}`,
);

console.log(
  `sample document: ${chunks.length} chunks; the suggested questions are answered from chunks ${home.join(", ")}: ok`,
);
