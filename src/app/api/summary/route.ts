import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { streamSummary } from "@/lib/groq";
import type { RetrievedChunk } from "@/lib/retrieval";
import { streamingAnswerResponse } from "@/lib/stream-response";

export const runtime = "nodejs";
export const maxDuration = 60;

const SUMMARY_LABEL = "Summarize this document";
// Cap chunks fed to the summarizer to stay within the context window.
const MAX_CHUNKS = 20;

// POST /api/summary — { documentId }
// Streams a whole-document summary and persists it as a conversation turn.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { documentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const documentId = body.documentId?.trim();
  if (!documentId) {
    return NextResponse.json(
      { error: "documentId is required." },
      { status: 400 },
    );
  }

  // Verify the document belongs to this user.
  const owned = await prisma.document.findFirst({
    where: { id: documentId, userId: session.user.id },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  try {
    const rows = await prisma.chunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: "asc" },
      take: MAX_CHUNKS,
      select: { id: true, content: true, chunkIndex: true },
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "This document has no content to summarize." },
        { status: 400 },
      );
    }

    const chunks: RetrievedChunk[] = rows.map((r) => ({
      id: r.id,
      content: r.content,
      chunkIndex: r.chunkIndex,
      similarity: 0,
    }));

    // Persist the summary request as a user turn.
    await prisma.message.create({
      data: { documentId, role: "user", content: SUMMARY_LABEL },
    });

    const tokenStream = await streamSummary(chunks);
    return streamingAnswerResponse({
      citations: [], // a summary spans the whole document, not specific passages
      tokenStream,
      onComplete: async (full) => {
        await prisma.message.create({
          data: { documentId, role: "assistant", content: full },
        });
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to summarize the document.";
    console.error("[summary] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
