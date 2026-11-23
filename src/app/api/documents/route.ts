import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { demoForbidden, isDemo } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { extractPdfText } from "@/lib/pdf";
import { chunkText } from "@/lib/chunk";
import { embedTexts, toVectorLiteral } from "@/lib/embeddings";

// PDF parsing needs the Node runtime (not Edge).
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// GET /api/documents — list the signed-in user's documents (newest first).
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const documents = await prisma.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });

  return NextResponse.json(
    documents.map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      chunks: d._count.chunks,
    })),
  );
}

// POST /api/documents — upload a PDF, extract text, chunk it, store rows.
// (Embeddings are added in Phase 3; the embedding column stays null for now.)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (isDemo(session)) return demoForbidden();

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF files are supported." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 10 MB)." },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Record the document immediately so the UI can show a processing state.
  const doc = await prisma.document.create({
    data: { name: file.name, status: "processing", userId: session.user.id },
  });

  try {
    const { text, totalPages } = await extractPdfText(bytes);
    if (!text) {
      throw new Error(
        "No extractable text found — this looks like a scanned/image-only PDF.",
      );
    }

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      throw new Error("Could not split the document into chunks.");
    }

    // 1. Store the chunk text (embeddings filled in next).
    await prisma.chunk.createMany({
      data: chunks.map((content, chunkIndex) => ({
        documentId: doc.id,
        content,
        chunkIndex,
      })),
    });

    // 2. Read them back with their generated ids, in order.
    const rows = await prisma.chunk.findMany({
      where: { documentId: doc.id },
      orderBy: { chunkIndex: "asc" },
      select: { id: true, content: true },
    });

    // 3. Embed every chunk (one or more batched API calls).
    const vectors = await embedTexts(rows.map((r) => r.content));

    // 4. Write each embedding into the pgvector column via raw SQL.
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

    console.log(
      `[ingest] "${file.name}": ${totalPages} pages → ${chunks.length} chunks embedded`,
    );

    return NextResponse.json({
      id: doc.id,
      name: doc.name,
      status: "ready",
      pages: totalPages,
      chunks: chunks.length,
    });
  } catch (err) {
    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "failed" },
    });
    const message =
      err instanceof Error ? err.message : "Failed to process the PDF.";
    console.error(`[ingest] failed for "${file.name}":`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
