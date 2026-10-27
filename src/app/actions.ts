"use server";

import { revalidatePath } from "next/cache";
import { cancelGeneration, isGenerating } from "@/lib/generations";
import { deleteTool, isToolId, renameTool, reorderDashboard, restoreVersion, setOnDashboard } from "@/lib/tools";

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

export async function deleteToolAction(id: string) {
  if (!isToolId(id)) return;
  // A running reply would save the tool again when it ends, so stop it first.
  await cancelGeneration(id);
  await deleteTool(id);
  refreshAllPages();
}

/** Makes an earlier version current again. Returns the updated messages, or null if nothing changed. */
export async function restoreVersionAction(id: string, messageId: string) {
  if (!isToolId(id) || isGenerating(id)) return null;
  const messages = await restoreVersion(id, messageId);
  if (messages) refreshAllPages();
  return messages;
}

/** Called after a chat reply is saved (new HTML and possibly a new title). */
export async function toolSavedAction() {
  refreshAllPages();
}
