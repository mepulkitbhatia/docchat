import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { demoForbidden, isDemo } from "@/lib/demo";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// DELETE /api/account — delete the signed-in user and all their data (cascade).
export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (isDemo(session)) return demoForbidden();

  // Deleting the user cascades to their documents, chunks, and messages.
  await prisma.user.delete({ where: { id: session.user.id } });

  return NextResponse.json({ ok: true });
}
