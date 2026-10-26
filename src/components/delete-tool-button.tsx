"use client";

import { IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { deleteToolAction } from "@/app/actions";

export function DeleteToolButton({ id, title, disabled }: { id: string; title: string; disabled?: boolean }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deleting, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      await deleteToolAction(id);
      router.push("/");
    });
  }

  return (
    <>
      <button
        onClick={() => dialogRef.current?.showModal()}
        disabled={disabled}
        aria-label="Delete tool"
        title="Delete tool"
        className="flex items-center rounded-md border border-zinc-300 px-2 py-1.5 text-zinc-500 hover:border-red-300 hover:text-red-600 disabled:opacity-40 disabled:hover:border-zinc-300 disabled:hover:text-zinc-500 dark:border-zinc-700 dark:hover:border-red-900 dark:hover:text-red-400"
      >
        <IconTrash size={16} aria-hidden />
      </button>
      <dialog
        ref={dialogRef}
        // Clicking the backdrop closes the dialog.
        onClick={(e) => e.target === e.currentTarget && !deleting && e.currentTarget.close()}
        className="m-auto w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="p-5">
          <h2 className="text-base font-semibold">Delete tool?</h2>
          <p className="mt-2 text-sm text-zinc-500">
            “{title || "Untitled tool"}” and its chat will be deleted permanently. This can’t be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => dialogRef.current?.close()}
              disabled={deleting}
              autoFocus
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-700"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60"
            >
              <IconTrash size={16} aria-hidden />
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
