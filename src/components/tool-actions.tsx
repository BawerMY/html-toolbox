"use client";

import {
  IconAppWindow,
  IconBookmarkOff,
  IconBookmarkPlus,
  IconCopy,
  IconDownload,
  IconGitFork,
  IconMessage,
  IconTrash,
  IconWorld,
  IconWorldOff,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import {
  deleteToolAction,
  duplicateToolAction,
  forkToolAction,
  setOnDashboardAction,
  setPublishedAction,
} from "@/app/actions";
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
  published: boolean;
  /** The page these actions are on; the first button switches to the other one. */
  page: "chat" | "tool";
  labelsFrom: keyof typeof BREAKPOINTS;
  /** Not saved yet: only the actions that need no saved tool are enabled. */
  isNew?: boolean;
  /** A reply is generating: actions that copy or change the tool wait for it. */
  busy?: boolean;
};

/** The tool's actions, shared by the chat page and the tool page so both look and behave the same. */
export function ToolActions(props: Props) {
  const { id, title, html, onDashboard: savedOnDashboard, published: savedPublished, page, labelsFrom, isNew, busy } = props;
  const router = useRouter();
  const { label, padding } = BREAKPOINTS[labelsFrom];
  const button = `${BUTTON} ${padding}`;
  const saved = !isNew && html !== null;

  const [onDashboard, setOptimisticOnDashboard] = useOptimistic(savedOnDashboard);
  const [, startDashboard] = useTransition();
  const [published, setOptimisticPublished] = useOptimistic(savedPublished);
  const [, startPublish] = useTransition();
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

  function togglePublished() {
    const next = !published;
    startPublish(async () => {
      setOptimisticPublished(next);
      await setPublishedAction(id, next);
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
  const publishLabel = published ? "Unpublish" : "Publish";

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
      <button
        onClick={togglePublished}
        disabled={!saved}
        title={published ? "Unpublish: remove from Discover" : "Publish: list on Discover so anyone can view and fork it"}
        className={button}
      >
        {published ? <IconWorldOff size={16} aria-hidden /> : <IconWorld size={16} aria-hidden />}
        <span className={label}>{publishLabel}</span>
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

/** What someone who doesn't own a public tool can do with it. */
export function VisitorToolActions({ id, html, signedIn }: { id: string; html: string; signedIn: boolean }) {
  const router = useRouter();
  const { label, padding } = BREAKPOINTS.lg;
  const button = `${BUTTON} ${padding}`;
  const [forking, startFork] = useTransition();

  function fork() {
    startFork(async () => {
      const forkId = await forkToolAction(id);
      if (forkId) router.push(`/t/${forkId}`);
    });
  }

  return (
    <div className="flex shrink-0 gap-2">
      <button onClick={() => downloadHtml(html)} title="Download" className={button}>
        <IconDownload size={16} aria-hidden />
        <span className={label}>Download</span>
      </button>
      {signedIn ? (
        <button onClick={fork} disabled={forking} title="Fork: start your own tool from this one" className={button}>
          <IconGitFork size={16} aria-hidden />
          <span className={label}>{forking ? "Forking…" : "Fork"}</span>
        </button>
      ) : (
        <Link href="/login" title="Sign in to fork this tool" className={button}>
          <IconGitFork size={16} aria-hidden />
          <span className={label}>Sign in to fork</span>
        </Link>
      )}
    </div>
  );
}
