"use server";

import { revalidatePath } from "next/cache";
import { cancelGeneration, isGenerating } from "@/lib/generations";
import {
  deleteTool,
  duplicateTool,
  importTool,
  isToolId,
  renameTool,
  reorderDashboard,
  revertToVersion,
  setOnDashboard,
} from "@/lib/tools";

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

/** Rewinds the tool and its chat to an earlier version. Returns the remaining messages, or null if nothing changed. */
export async function revertToVersionAction(id: string, messageId: string) {
  if (!isToolId(id) || isGenerating(id)) return null;
  const messages = await revertToVersion(id, messageId);
  if (messages) refreshAllPages();
  return messages;
}

/** Returns the copy's id, or null if the tool is missing or still generating. */
export async function duplicateToolAction(id: string) {
  if (!isToolId(id) || isGenerating(id)) return null;
  const copyId = await duplicateTool(id);
  if (copyId) refreshAllPages();
  return copyId;
}

export async function importToolAction(html: string, fileName: string): Promise<{ id: string } | { error: string }> {
  const trimmed = html.trim();
  if (!/<(!doctype|html|body)\b/i.test(trimmed)) return { error: "This file doesn’t look like an HTML document." };
  // Tools are stored inside a ```html block in the chat, so the file can't contain one itself.
  if (trimmed.includes("```")) return { error: "This file contains ``` (three backticks), which can’t be imported yet." };
  const name = fileName.replace(/[^\w. -]/g, "").slice(0, 80) || "file.html";
  const id = await importTool(trimmed, name);
  refreshAllPages();
  return { id };
}

/** Called after a chat reply is saved (new HTML and possibly a new title). */
export async function toolSavedAction() {
  refreshAllPages();
}
