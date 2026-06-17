import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// DELETE /api/documents/[id]/messages — clear a document's conversation history.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership before clearing.
  const doc = await prisma.document.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  await prisma.message.deleteMany({ where: { documentId: id } });
  return NextResponse.json({ ok: true });
}
