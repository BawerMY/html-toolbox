import Link from "next/link";
import { HistoryList } from "@/components/history-list";
import { getCurrentUser } from "@/lib/session";
import { listTools } from "@/lib/tools";

/** Sidebar listing the signed-in user's chats/tools, most recent first. */
export async function History({ currentId }: { currentId?: string }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <p className="px-2 py-1.5 text-sm text-zinc-500">
        <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-100">
          Sign in
        </Link>{" "}
        to build tools and see them here.
      </p>
    );
  }
  return <HistoryList tools={await listTools(user.id)} currentId={currentId} />;
}
