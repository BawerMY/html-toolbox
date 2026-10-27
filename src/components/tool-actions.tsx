"use client";

import {
  IconAppWindow,
  IconBookmarkOff,
  IconBookmarkPlus,
  IconCopy,
  IconDownload,
  IconMessage,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { deleteToolAction, duplicateToolAction, setOnDashboardAction } from "@/app/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { downloadHtml } from "@/lib/download";

// Labels show from this breakpoint up; below it the buttons are icon only, with the label as tooltip.
// Full class names, so Tailwind generates them.
const BREAKPOINTS = {
  lg: { label: "sr-only lg:not-sr-only", padding: "lg:px-3" },
  "2xl": { label: "sr-only 2xl:not-sr-only", padding: "2xl:px-3" },
};

const BUTTON =
  "flex items-center gap-1.5 rounded-md border border-zinc-300 px-2 py-1.5 text-sm hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800";

type Props = {
  id: string;
  title: string;
  html: string | null;
  onDashboard: boolean;
  /** The page these actions are on; the first button switches to the other one. */
  page: "chat" | "tool";
  labelsFrom: keyof typeof BREAKPOINTS;
  /** Not saved yet: only the actions that need no saved tool are enabled. */
  isNew?: boolean;
  /** A reply is generating: actions that copy or change the tool wait for it. */
  busy?: boolean;
};

/** The tool's actions, shared by the chat page and the tool page so both look and behave the same. */
export function ToolActions({ id, title, html, onDashboard: savedOnDashboard, page, labelsFrom, isNew, busy }: Props) {
  const router = useRouter();
  const { label, padding } = BREAKPOINTS[labelsFrom];
  const button = `${BUTTON} ${padding}`;
  const saved = !isNew && html !== null;

  const [onDashboard, setOptimisticOnDashboard] = useOptimistic(savedOnDashboard);
  const [, startDashboard] = useTransition();
  const [duplicating, startDuplicate] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function toggleDashboard() {
    const next = !onDashboard;
    startDashboard(async () => {
      setOptimisticOnDashboard(next);
      await setOnDashboardAction(id, next);
    });
  }

  function duplicate() {
    startDuplicate(async () => {
      const copyId = await duplicateToolAction(id);
      if (copyId) router.push(page === "tool" ? `/t/${copyId}/view` : `/t/${copyId}`);
    });
  }

  function deleteTool() {
    startDelete(async () => {
      await deleteToolAction(id);
      router.push("/");
    });
  }

  const dashboardLabel = onDashboard ? "Remove from dashboard" : "Save to dashboard";

  return (
    <div className="flex shrink-0 gap-2">
      {page === "chat" ? (
        saved ? (
          <Link href={`/t/${id}/view`} title="Open tool" className={button}>
            <IconAppWindow size={16} aria-hidden />
            <span className={label}>Open tool</span>
          </Link>
        ) : (
          <button disabled title="Open tool" className={button}>
            <IconAppWindow size={16} aria-hidden />
            <span className={label}>Open tool</span>
          </button>
        )
      ) : (
        <Link href={`/t/${id}`} title="Edit in chat" className={button}>
          <IconMessage size={16} aria-hidden />
          <span className={label}>Edit in chat</span>
        </Link>
      )}
      <button onClick={() => html && downloadHtml(html)} disabled={!html} title="Download" className={button}>
        <IconDownload size={16} aria-hidden />
        <span className={label}>Download</span>
      </button>
      <button onClick={toggleDashboard} disabled={!saved} title={dashboardLabel} className={button}>
        {onDashboard ? <IconBookmarkOff size={16} aria-hidden /> : <IconBookmarkPlus size={16} aria-hidden />}
        <span className={label}>{dashboardLabel}</span>
      </button>
      <button onClick={duplicate} disabled={!saved || busy || duplicating} title="Duplicate" className={button}>
        <IconCopy size={16} aria-hidden />
        <span className={label}>{duplicating ? "Duplicating…" : "Duplicate"}</span>
      </button>
      <button
        onClick={() => setConfirmDelete(true)}
        disabled={isNew}
        title="Delete"
        className={`${button} hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400`}
      >
        <IconTrash size={16} aria-hidden />
        <span className={label}>Delete</span>
      </button>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete tool?"
        danger
        busy={deleting}
        onConfirm={deleteTool}
        onCancel={() => setConfirmDelete(false)}
        confirmLabel={
          <>
            <IconTrash size={16} aria-hidden />
            {deleting ? "Deleting…" : "Delete"}
          </>
        }
      >
        “{title || "Untitled tool"}” and its chat will be deleted permanently. This can’t be undone.
      </ConfirmDialog>
    </div>
  );
}
