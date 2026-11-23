import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { demoForbidden, isDemo } from "@/lib/demo";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// DELETE /api/documents/[id] — remove the user's document (cascade).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (isDemo(session)) return demoForbidden();

  const { id } = await params;

  // deleteMany scoped by userId — only deletes if the user owns it.
  const result = await prisma.document.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
