import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { demoRateLimit, isDemo } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { retrieveChunks } from "@/lib/retrieval";
import { streamAnswer, type ChatMessage } from "@/lib/groq";
import { streamingAnswerResponse, streamFromText } from "@/lib/stream-response";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/chat — { documentId, question }
// Streams a grounded answer (using prior conversation as context) and persists
// both the question and the answer.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // The demo account is shared: limit questions per IP, and never store its
  // conversations (one visitor's questions must not show up for the next).
  const demo = isDemo(session);
  if (demo) {
    const limited = demoRateLimit(req);
    if (limited) return limited;
  }

  let body: { documentId?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const documentId = body.documentId?.trim();
  const question = body.question?.trim();

  if (!documentId || !question) {
    return NextResponse.json(
      { error: "documentId and question are required." },
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
    // 1. Load prior conversation (before saving the new question).
    const historyRows = await prisma.message.findMany({
      where: { documentId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });
    const history: ChatMessage[] = historyRows.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    // 2. Persist the user's question.
    if (!demo) {
      await prisma.message.create({
        data: { documentId, role: "user", content: question },
      });
    }

    // 3. Retrieve relevant passages for the current question.
    const chunks = await retrieveChunks(documentId, question, 5);
    const citations = chunks.map((c, i) => ({
      marker: i + 1,
      chunkIndex: c.chunkIndex,
      similarity: Number(c.similarity.toFixed(3)),
      content: c.content,
    }));

    if (chunks.length === 0) {
      const msg = "This document has no searchable content yet, so I can't answer.";
      return streamingAnswerResponse({
        citations,
        tokenStream: streamFromText(msg),
        onComplete: async () => {
          if (demo) return;
          await prisma.message.create({
            data: { documentId, role: "assistant", content: msg },
          });
        },
      });
    }

    // 4. Stream the answer; persist it when the stream finishes.
    const tokenStream = await streamAnswer(question, chunks, history);
    return streamingAnswerResponse({
      citations,
      tokenStream,
      onComplete: async (full) => {
        if (demo) return;
        await prisma.message.create({
          data: { documentId, role: "assistant", content: full },
        });
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to answer the question.";
    console.error("[chat] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
