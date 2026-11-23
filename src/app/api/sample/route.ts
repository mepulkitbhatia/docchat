import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensureSample } from "@/lib/sample";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/sample — ingest the bundled sample document for this user
// (idempotent-ish: returns the existing one if it's already loaded).
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const id = await ensureSample(session.user.id);
    return NextResponse.json({ id, status: "ready" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load the sample.";
    console.error("[sample] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
