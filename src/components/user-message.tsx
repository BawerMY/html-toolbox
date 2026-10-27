"use client";

import { IconPencil } from "@tabler/icons-react";
import { useState } from "react";

/** A user chat bubble that can be edited and sent again. */
export function UserMessage({ text, canEdit, onEdit }: { text: string; canEdit: boolean; onEdit: (text: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);

  function submit() {
    const next = draft?.trim();
    if (!next || next === text) return;
    setDraft(null);
    onEdit(next);
  }

  if (draft !== null) {
    return (
      <div className="ml-8 rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") setDraft(null);
          }}
          autoFocus
          rows={Math.min(8, Math.max(2, draft.split("\n").length))}
          aria-label="Edit message"
          className="w-full resize-none rounded-md border border-zinc-300 bg-white p-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <div className="mt-2 flex justify-end gap-2">
          <button onClick={() => setDraft(null)} className="rounded-md px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!draft.trim() || draft.trim() === text}
            className="rounded-md bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group ml-8 flex items-start gap-1">
      {canEdit && (
        <button
          onClick={() => setDraft(text)}
          aria-label="Edit message"
          title="Edit message"
          className="mt-2 rounded-md p-1 text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-700 focus:opacity-100 pointer-coarse:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <IconPencil size={14} aria-hidden />
        </button>
      )}
      <div className="min-w-0 flex-1 rounded-lg bg-zinc-100 p-3 text-sm whitespace-pre-wrap dark:bg-zinc-800">{text}</div>
    </div>
  );
}
