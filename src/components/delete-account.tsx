"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import ConfirmDialog from "@/components/confirm-dialog";

export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onConfirm() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (res.ok) {
        await signOut({ redirectTo: "/login" });
      }
    } finally {
      setDeleting(false);
      setOpen(false);
    }
  }

  return (
    <div className="rounded-xl border border-red-200 p-5 dark:border-red-900/50">
      <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">
        Danger zone
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Permanently delete your account and every document, chunk, and
        conversation you&rsquo;ve created. This can&rsquo;t be undone.
      </p>
      <button
        onClick={() => setOpen(true)}
        disabled={deleting}
        className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        {deleting ? "Deleting…" : "Delete account"}
      </button>

      <ConfirmDialog
        open={open}
        title="Delete your account?"
        message="This permanently deletes your account and all of your documents and conversations. This action cannot be undone."
        confirmLabel="Delete account"
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
