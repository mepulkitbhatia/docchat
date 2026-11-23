import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import IngestPanel, { DocItem } from "@/components/ingest-panel";
import AppHeader from "@/components/app-header";
import { isDemo } from "@/lib/demo";

// Always render fresh data (document list changes on upload).
export const dynamic = "force-dynamic";

async function getDocuments(userId: string): Promise<DocItem[]> {
  try {
    const docs = await prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chunks: true } } },
    });
    return docs.map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      chunks: d._count.chunks,
    }));
  } catch {
    return [];
  }
}

const steps = [
  {
    n: "1",
    title: "Upload",
    body: "Drop in a PDF. We extract the text server-side.",
  },
  {
    n: "2",
    title: "Ingest",
    body: "Text is split into chunks, embedded, and stored as vectors in Postgres.",
  },
  {
    n: "3",
    title: "Chat",
    body: "Ask a question — we retrieve the most relevant chunks and answer with citations.",
  },
];

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const documents = await getDocuments(session.user.id);

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-12 sm:py-16">
      <main className="w-full max-w-3xl">
        <AppHeader email={session.user.email} />

        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
          Chat with your documents
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Upload a PDF and ask questions in plain language. DocChat answers
          using only your document&rsquo;s content — with citations back to the
          source passages, so you can trust every answer.
        </p>

        <IngestPanel initialDocuments={documents} demo={isDemo(session)} />

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900">
                {s.n}
              </div>
              <h3 className="mt-4 font-semibold text-zinc-900 dark:text-zinc-100">
                {s.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
