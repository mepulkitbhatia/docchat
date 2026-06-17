import Link from "next/link";
import SignOutButton from "@/components/sign-out-button";

// Consistent top navigation used across authenticated pages.
export default function AppHeader({ email }: { email?: string | null }) {
  return (
    <header className="mb-10 flex items-center justify-between gap-4">
      <Link
        href="/"
        className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
      >
        DocChat
      </Link>
      <div className="flex items-center gap-4">
        {email && (
          <Link
            href="/profile"
            className="max-w-[12rem] truncate text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <span className="sm:hidden">Profile</span>
            <span className="hidden sm:inline">{email}</span>
          </Link>
        )}
        <SignOutButton />
      </div>
    </header>
  );
}
