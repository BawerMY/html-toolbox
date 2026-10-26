"use server";

import { revalidatePath } from "next/cache";
import { renameTool, reorderDashboard, setOnDashboard } from "@/lib/tools";

// Tool data shows up on several pages (history, dashboard, chat, view), so every change
// marks all of them stale; pages kept alive in the background re-fetch when shown again.
function refreshAllPages() {
  revalidatePath("/", "layout");
}

export async function setOnDashboardAction(id: string, onDashboard: boolean) {
  await setOnDashboard(id, onDashboard);
  refreshAllPages();
}

export async function renameToolAction(id: string, title: string) {
  const trimmed = title.trim().slice(0, 120);
  if (!trimmed) return;
  await renameTool(id, trimmed);
  refreshAllPages();
}

export async function reorderDashboardAction(ids: string[]) {
  await reorderDashboard(ids);
  refreshAllPages();
}

/** Called after a chat reply is saved (new HTML and possibly a new title). */
export async function toolSavedAction() {
  refreshAllPages();
}
