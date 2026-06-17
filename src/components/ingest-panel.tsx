"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import ConfirmDialog from "@/components/confirm-dialog";

export interface DocItem {
  id: string;
  name: string;
  status: string; // processing | ready | failed
  createdAt: string;
  chunks: number;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { dot: string; label: string; text: string }> = {
    processing: {
      dot: "bg-amber-500",
      label: "Processing",
      text: "text-amber-700 dark:text-amber-400",
    },
    ready: {
      dot: "bg-green-500",
      label: "Ready",
      text: "text-green-700 dark:text-green-400",
    },
    failed: {
      dot: "bg-red-500",
      label: "Failed",
      text: "text-red-700 dark:text-red-400",
    },
  };
  const s = map[status] ?? map.processing;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.text}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export default function IngestPanel({
  initialDocuments,
}: {
  initialDocuments: DocItem[];
}) {
  const [documents, setDocuments] = useState<DocItem[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DocItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const res = await fetch("/api/documents");
    if (res.ok) setDocuments(await res.json());
  }

  async function loadSample() {
    setError(null);
    setUploading(true);
    try {
      const res = await fetch("/api/sample", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not load the sample.");
      }
      await refresh();
    } catch {
      setError("Could not load the sample.");
    } finally {
      setUploading(false);
    }
  }

  async function confirmDelete() {
    const doc = pendingDelete;
    setPendingDelete(null);
    if (!doc) return;
    setError(null);
    // Optimistic removal.
    setDocuments((docs) => docs.filter((d) => d.id !== doc.id));
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Could not delete the document.");
      await refresh();
    }
  }

  async function upload(file: File) {
    setError(null);

    if (file.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large (max 10 MB).");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
      }
      await refresh();
    } catch {
      setError("Something went wrong during upload.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  return (
    <section className="mt-12">
      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragOver
            ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />
        {uploading ? (
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Processing your PDF — extracting text and chunking…
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Drag &amp; drop a PDF here, or click to choose
            </p>
            <p className="mt-1 text-xs text-zinc-500">PDF only · up to 10 MB</p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Empty state */}
      {documents.length === 0 && !uploading && (
        <div className="mt-6 text-center">
          <p className="text-sm text-zinc-500">
            No documents yet — upload a PDF, or
          </p>
          <button
            onClick={loadSample}
            className="mt-2 text-sm font-medium text-zinc-900 underline underline-offset-2 hover:opacity-70 dark:text-zinc-100"
          >
            try a sample document →
          </button>
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Your documents
          </h2>
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {documents.map((d) => {
              const meta = (
                <>
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {d.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {d.chunks} chunk{d.chunks === 1 ? "" : "s"}
                    {d.status === "ready" && " · Chat →"}
                  </p>
                </>
              );

              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  {d.status === "ready" ? (
                    <Link
                      href={`/documents/${d.id}`}
                      className="min-w-0 flex-1 hover:opacity-80"
                    >
                      {meta}
                    </Link>
                  ) : (
                    <div className="min-w-0 flex-1">{meta}</div>
                  )}

                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={d.status} />
                    <button
                      onClick={() => setPendingDelete(d)}
                      aria-label={`Delete ${d.name}`}
                      className="text-xs font-medium text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete document?"
        message={`This permanently deletes "${pendingDelete?.name}" and all its chunks and conversation. This can't be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
