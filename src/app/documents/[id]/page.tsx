import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Chat, { type Turn } from "@/components/chat";
import AppHeader from "@/components/app-header";
import { SAMPLE_NAME, SAMPLE_QUESTIONS } from "@/lib/sample";

export const dynamic = "force-dynamic";

const GENERIC_QUESTIONS = [
  "What are the main points?",
  "What topics does this cover?",
];

// Pair stored messages (user, assistant, user, assistant…) into chat turns.
function messagesToTurns(
  messages: { role: string; content: string }[],
): Turn[] {
  const turns: Turn[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      turns.push({ question: m.content, answer: "", citations: [] });
    } else if (turns.length > 0 && turns[turns.length - 1].answer === "") {
      turns[turns.length - 1].answer = m.content;
    } else {
      turns.push({ question: "", answer: m.content, citations: [] });
    }
  }
  return turns;
}

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const doc = await prisma.document.findFirst({
    where: { id, userId: session.user.id },
    include: { _count: { select: { chunks: true } } },
  });

  if (!doc) notFound();

  const messages = await prisma.message.findMany({
    where: { documentId: doc.id },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });
  const initialTurns = messagesToTurns(messages);
  const suggestions =
    doc.name === SAMPLE_NAME ? SAMPLE_QUESTIONS : GENERIC_QUESTIONS;

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-12">
      <main className="w-full max-w-3xl">
        <AppHeader email={session.user.email} />

        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← All documents
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {doc.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {doc._count.chunks} chunk{doc._count.chunks === 1 ? "" : "s"} ·{" "}
          {doc.status}
        </p>

        <Chat
          documentId={doc.id}
          ready={doc.status === "ready"}
          initialTurns={initialTurns}
          suggestions={suggestions}
        />
      </main>
    </div>
  );
}
