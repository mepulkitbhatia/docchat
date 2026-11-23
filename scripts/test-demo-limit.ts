/**
 * Self-check for the demo rate limiter (no database or network needed).
 * Run with:  npx tsx scripts/test-demo-limit.ts
 */
import assert from "node:assert/strict";
import { DEMO_QUESTIONS_PER_HOUR, demoRateLimit } from "../src/lib/demo";

const HOUR = 60 * 60 * 1000;
const from = (headers: Record<string, string>) =>
  new Request("http://localhost/api/chat", { method: "POST", headers });

const visitor = { "cf-connecting-ip": "203.0.113.7" };

for (let i = 0; i < DEMO_QUESTIONS_PER_HOUR; i++) {
  assert.equal(demoRateLimit(from(visitor), 0), null, `question ${i + 1}`);
}
assert.equal(demoRateLimit(from(visitor), 0)?.status, 429, "over the limit");

// A forged x-forwarded-for must not buy a fresh allowance.
const forged = { ...visitor, "x-forwarded-for": "198.51.100.1" };
assert.equal(demoRateLimit(from(forged), 0)?.status, 429, "forged header");

// Other visitors are unaffected, and the window resets after an hour.
assert.equal(demoRateLimit(from({ "cf-connecting-ip": "203.0.113.8" }), 0), null);
assert.equal(demoRateLimit(from(visitor), HOUR), null, "window reset");

console.log("demo rate limiter: ok");
