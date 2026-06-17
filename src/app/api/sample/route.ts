import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { chunkText } from "@/lib/chunk";
import { embedTexts, toVectorLiteral } from "@/lib/embeddings";
import { SAMPLE_NAME, SAMPLE_TEXT } from "@/lib/sample";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/sample — ingest the bundled sample document for this user
// (idempotent-ish: returns the existing one if it's already loaded).
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const userId = session.user.id;

  const existing = await prisma.document.findFirst({
    where: { name: SAMPLE_NAME, status: "ready", userId },
  });
  if (existing) {
    return NextResponse.json({ id: existing.id, status: "ready" });
  }

  const doc = await prisma.document.create({
    data: { name: SAMPLE_NAME, status: "processing", userId },
  });

  try {
    const chunks = chunkText(SAMPLE_TEXT);

    await prisma.chunk.createMany({
      data: chunks.map((content, chunkIndex) => ({
        documentId: doc.id,
        content,
        chunkIndex,
      })),
    });

    const rows = await prisma.chunk.findMany({
      where: { documentId: doc.id },
      orderBy: { chunkIndex: "asc" },
      select: { id: true, content: true },
    });

    const vectors = await embedTexts(rows.map((r) => r.content));

    await prisma.$transaction(
      rows.map(
        (r, i) =>
          prisma.$executeRaw`UPDATE "Chunk" SET embedding = ${toVectorLiteral(
            vectors[i],
          )}::vector WHERE id = ${r.id}`,
      ),
    );

    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "ready" },
    });

    return NextResponse.json({ id: doc.id, status: "ready" });
  } catch (err) {
    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "failed" },
    });
    const message =
      err instanceof Error ? err.message : "Failed to load the sample.";
    console.error("[sample] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
