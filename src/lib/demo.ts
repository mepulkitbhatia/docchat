import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSample } from "@/lib/sample";

/**
 * The shared demo account: anyone can sign in to it with the "Try the demo"
 * button. It is read-only (no uploads, no deletes), its conversations are
 * never stored, and its questions are rate-limited per IP.
 */
export const DEMO_EMAIL = "demo@docchat.local";

export const DEMO_QUESTIONS_PER_HOUR = 20;
const WINDOW_MS = 60 * 60 * 1000;

export function isDemo(session: Session | null): boolean {
  return session?.user?.email === DEMO_EMAIL;
}

export function demoForbidden() {
  return NextResponse.json(
    { error: "This is turned off in the demo account. Sign up to use it." },
    { status: 403 },
  );
}

// Share one in-flight setup so two simultaneous first visitors can't both
// ingest the sample (nobody could delete the duplicate).
let setup: Promise<{ id: string; email: string }> | null = null;

/** Find or create the demo user and make sure the current sample document is loaded. */
export function ensureDemoUser() {
  return (setup ??= (async () => {
    const user = await prisma.user.upsert({
      where: { email: DEMO_EMAIL },
      update: {},
      // Not a bcrypt hash, so no password can ever log in to this account.
      create: { email: DEMO_EMAIL, passwordHash: "!" },
    });
    await ensureSample(user.id, true); // also replaces an outdated copy
    return user;
  })().finally(() => {
    setup = null;
  }));
}

// Cloudflare (in front of Render) sets cf-connecting-ip itself, so a visitor
// can't forge it; the first x-forwarded-for entry is only a fallback for
// hosts without Cloudflare, where it is client-controlled.
function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}

// ponytail: in-memory fixed window, per server process, reset on restart.
// Move the counters to Postgres if the app ever runs on more than one instance.
const hits = new Map<string, { count: number; resetAt: number }>();

/** Count one demo question for this IP. Returns a 429 once over the limit. */
export function demoRateLimit(req: Request, now = Date.now()) {
  if (hits.size > 5000) {
    for (const [ip, h] of hits) if (now >= h.resetAt) hits.delete(ip);
  }
  const ip = clientIp(req);
  const h = hits.get(ip);
  if (!h || now >= h.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }
  if (++h.count <= DEMO_QUESTIONS_PER_HOUR) return null;
  return NextResponse.json(
    {
      error: `Demo limit reached (${DEMO_QUESTIONS_PER_HOUR} questions per hour). Try again later, or sign up to keep going.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((h.resetAt - now) / 1000)) },
    },
  );
}
