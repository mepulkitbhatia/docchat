import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ChangePasswordForm from "@/components/change-password-form";
import DeleteAccount from "@/components/delete-account";
import AppHeader from "@/components/app-header";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const [user, documentCount, questionCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.document.count({ where: { userId } }),
    prisma.message.count({
      where: { role: "user", document: { userId } },
    }),
  ]);

  if (!user) redirect("/login");

  const memberSince = user.createdAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-12">
      <main className="w-full max-w-2xl">
        <AppHeader email={user.email} />

        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Profile
        </h1>

        {/* Account info */}
        <section className="mt-8 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Account
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Email</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Member since</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{memberSince}</dd>
            </div>
          </dl>
        </section>

        {/* Usage stats */}
        <section className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
              {documentCount}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Document{documentCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
              {questionCount}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Question{questionCount === 1 ? "" : "s"} asked
            </p>
          </div>
        </section>

        {/* Change password */}
        <section className="mt-6 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Change password
          </h2>
          <ChangePasswordForm />
        </section>

        {/* Danger zone */}
        <section className="mt-6">
          <DeleteAccount />
        </section>
      </main>
    </div>
  );
}
