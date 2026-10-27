import { HistoryList } from "@/components/history-list";
import { listTools } from "@/lib/tools";

/** Sidebar listing every chat/tool, most recent first. */
export async function History({ currentId }: { currentId?: string }) {
  return <HistoryList tools={await listTools()} currentId={currentId} />;
}
