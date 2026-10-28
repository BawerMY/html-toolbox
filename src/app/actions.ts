"use server";

import { revalidatePath } from "next/cache";
import { cancelGeneration, isGenerating } from "@/lib/generations";
import { requireUser } from "@/lib/session";
import {
  deleteTool,
  duplicateTool,
  forkTool,
  getOwnTool,
  importTool,
  isToolId,
  renameTool,
  reorderDashboard,
  revertToVersion,
  setOnDashboard,
  setPublished,
} from "@/lib/tools";

// Every action re-checks the session and passes the user's id down, so a user can only change
// their own tools whatever ids the browser sends.

// Tool data shows up on several pages (history, dashboard, chat, view, discover), so every change
// marks all of them stale; pages kept alive in the background re-fetch when shown again.
function refreshAllPages() {
  revalidatePath("/", "layout");
}

export async function setOnDashboardAction(id: string, onDashboard: boolean) {
  const user = await requireUser();
  await setOnDashboard(id, user.id, onDashboard);
  refreshAllPages();
}

export async function setPublishedAction(id: string, published: boolean) {
  const user = await requireUser();
  await setPublished(id, user.id, published);
  refreshAllPages();
}

export async function renameToolAction(id: string, title: string) {
  const user = await requireUser();
  const trimmed = title.trim().slice(0, 120);
  if (!trimmed) return;
  await renameTool(id, user.id, trimmed);
  refreshAllPages();
}

export async function reorderDashboardAction(ids: string[]) {
  const user = await requireUser();
  await reorderDashboard(user.id, ids);
  refreshAllPages();
}

export async function deleteToolAction(id: string) {
  const user = await requireUser();
  if (!(await getOwnTool(id, user.id))) return;
  // A running reply would save the tool again when it ends, so stop it first.
  await cancelGeneration(id);
  await deleteTool(id, user.id);
  refreshAllPages();
}

/** Rewinds the tool and its chat to an earlier version. Returns the remaining messages, or null if nothing changed. */
export async function revertToVersionAction(id: string, messageId: string) {
  const user = await requireUser();
  if (!isToolId(id) || isGenerating(id)) return null;
  const messages = await revertToVersion(id, user.id, messageId);
  if (messages) refreshAllPages();
  return messages;
}

/** Returns the copy's id, or null if the tool is missing or still generating. */
export async function duplicateToolAction(id: string) {
  const user = await requireUser();
  if (!isToolId(id) || isGenerating(id)) return null;
  const copyId = await duplicateTool(id, user.id);
  if (copyId) refreshAllPages();
  return copyId;
}

/** Starts a new tool from a public tool's current HTML. Returns the new tool's id. */
export async function forkToolAction(id: string) {
  const user = await requireUser();
  const forkId = await forkTool(id, user.id);
  if (forkId) refreshAllPages();
  return forkId;
}

/** Forks a public tool and puts the fork on the user's dashboard. Returns the fork's id. */
export async function addToDashboardAction(id: string) {
  const user = await requireUser();
  const forkId = await forkTool(id, user.id);
  if (!forkId) return null;
  await setOnDashboard(forkId, user.id, true);
  refreshAllPages();
  return forkId;
}

export async function importToolAction(html: string, fileName: string): Promise<{ id: string } | { error: string }> {
  const user = await requireUser();
  const trimmed = html.trim();
  if (!/<(!doctype|html|body)\b/i.test(trimmed)) return { error: "This file doesn’t look like an HTML document." };
  // Tools are stored inside a ```html block in the chat, so the file can't contain one itself.
  if (trimmed.includes("```")) return { error: "This file contains ``` (three backticks), which can’t be imported yet." };
  const name = fileName.replace(/[^\w. -]/g, "").slice(0, 80) || "file.html";
  const id = await importTool(user.id, trimmed, name);
  refreshAllPages();
  return { id };
}

/** Called after a chat reply is saved (new HTML and possibly a new title). */
export async function toolSavedAction() {
  refreshAllPages();
}
