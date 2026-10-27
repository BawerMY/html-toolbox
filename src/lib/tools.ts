import { generateId, type UIMessage } from "ai";
import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { extractHtml, htmlTitle, latestHtml, messageText } from "@/lib/html";
import type { ModelSelection } from "@/lib/model-options";

/** A chat and the tool it builds are one document. */
export type Tool = {
  _id: string;
  title: string;
  /** Set once the user renames the tool; generated titles no longer overwrite it. */
  titleEdited?: boolean;
  messages: UIMessage[];
  html: string | null;
  /** Model and settings used for this tool's chat. */
  model?: ModelSelection;
  onDashboard: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ToolSummary = { id: string; title: string };

const TOOL_ID = /^[A-Za-z0-9_-]{8,64}$/;

export function isToolId(id: string): boolean {
  return TOOL_ID.test(id);
}

/** Tools are user data, so every access happens at request time, never during prerender. */
async function tools() {
  await connection();
  return getDb().collection<Tool>("tools");
}

export async function getTool(id: string): Promise<Tool | null> {
  if (!isToolId(id)) return null;
  return (await tools()).findOne({ _id: id });
}

/** All tools, most recently updated first (chat history). */
export async function listTools(): Promise<ToolSummary[]> {
  const docs = await (await tools())
    .find({}, { projection: { title: 1 } })
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map((doc) => ({ id: doc._id, title: doc.title }));
}

/** Model of the most recently updated tool, used as the default for new tools. */
export async function lastUsedModel(): Promise<ModelSelection | undefined> {
  const doc = await (await tools()).findOne({ model: { $exists: true } }, { sort: { updatedAt: -1 }, projection: { model: 1 } });
  return doc?.model;
}

/** Tools saved to the dashboard, in dashboard order. */
export async function listDashboard(): Promise<ToolSummary[]> {
  const docs = await (await tools())
    .find({ onDashboard: true }, { projection: { title: 1 } })
    .sort({ position: 1 })
    .toArray();
  return docs.map((doc) => ({ id: doc._id, title: doc.title }));
}

/** Saves the chat, creating the tool on its first message. */
export async function saveMessages(id: string, messages: UIMessage[]): Promise<void> {
  const html = latestHtml(messages);
  const firstUser = messages.find((m) => m.role === "user");
  const title = (html && htmlTitle(html)) || (firstUser && messageText(firstUser).slice(0, 60)) || "Untitled tool";
  const now = new Date();
  const collection = await tools();
  await collection.updateOne(
    { _id: id },
    {
      $set: { messages, html, updatedAt: now },
      $setOnInsert: { onDashboard: false, position: 0, createdAt: now },
    },
    { upsert: true },
  );
  await collection.updateOne({ _id: id, titleEdited: { $ne: true } }, { $set: { title } });
}

export async function setToolModel(id: string, model: ModelSelection): Promise<void> {
  await (await tools()).updateOne({ _id: id }, { $set: { model } });
}

export async function renameTool(id: string, title: string): Promise<boolean> {
  const result = await (await tools()).updateOne({ _id: id }, { $set: { title, titleEdited: true } });
  return result.matchedCount === 1;
}

export async function setOnDashboard(id: string, onDashboard: boolean): Promise<boolean> {
  const collection = await tools();
  const update: Partial<Tool> = { onDashboard };
  if (onDashboard) {
    const last = await collection.findOne({ onDashboard: true }, { sort: { position: -1 }, projection: { position: 1 } });
    update.position = (last?.position ?? -1) + 1;
  }
  const result = await collection.updateOne({ _id: id }, { $set: update });
  return result.matchedCount === 1;
}

/** Appends an earlier version as the newest one: a "restore" request plus a reply holding its HTML. */
export async function restoreVersion(id: string, messageId: string): Promise<UIMessage[] | null> {
  const tool = await getTool(id);
  if (!tool) return null;
  const index = tool.messages.findIndex((m) => m.id === messageId && m.role === "assistant");
  const html = index === -1 ? null : extractHtml(messageText(tool.messages[index]));
  if (!html) return null;
  const request = tool.messages.findLast((m, i) => i < index && m.role === "user");
  const label = request ? messageText(request).replace(/\s+/g, " ").slice(0, 80) : "an earlier version";
  const messages: UIMessage[] = [
    ...tool.messages,
    { id: generateId(), role: "user", parts: [{ type: "text", text: `Restore the version from: “${label}”` }] },
    { id: generateId(), role: "assistant", parts: [{ type: "text", text: `Restored that version.\n\n\`\`\`html\n${html}\n\`\`\`` }] },
  ];
  await saveMessages(id, messages);
  return messages;
}

export async function deleteTool(id: string): Promise<void> {
  await (await tools()).deleteOne({ _id: id });
}

/** Sets dashboard order from a list of tool ids. */
export async function reorderDashboard(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await (await tools()).bulkWrite(
    ids.map((id, position) => ({
      updateOne: { filter: { _id: id, onDashboard: true }, update: { $set: { position } } },
    })),
  );
}
