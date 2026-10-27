import { generateId, type UIMessage } from "ai";
import { ObjectId } from "mongodb";
import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { extractHtml, htmlTitle, latestHtml, messageText } from "@/lib/html";
import type { ModelSelection } from "@/lib/model-selection";

/** A chat and the tool it builds are one document, owned by one user. */
export type Tool = {
  _id: string;
  /** Better Auth user id. Missing only on tools made before accounts existed (see claimUnownedTools). */
  ownerId?: string;
  title: string;
  /** Set once the user renames the tool; generated titles no longer overwrite it. */
  titleEdited?: boolean;
  messages: UIMessage[];
  html: string | null;
  /** Model and effort last picked in this chat; only used with the owner's own provider. */
  model?: ModelSelection;
  onDashboard: boolean;
  position: number;
  /** Listed on the Discover page, and viewable and forkable by anyone. */
  published?: boolean;
  publishedAt?: Date;
  /** The public tool this one was forked from. */
  forkedFrom?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ToolSummary = { id: string; title: string };
export type PublicToolSummary = ToolSummary & { author: string };

const TOOL_ID = /^[A-Za-z0-9_-]{8,64}$/;

export function isToolId(id: string): boolean {
  return TOOL_ID.test(id);
}

/** Tools are user data, so every access happens at request time, never during prerender. */
async function tools() {
  await connection();
  return getDb().collection<Tool>("tools");
}

/** Any tool, whoever owns it. Callers check access themselves (see canView). */
export async function getTool(id: string): Promise<Tool | null> {
  if (!isToolId(id)) return null;
  return (await tools()).findOne({ _id: id });
}

/** The tool if `ownerId` owns it, else null. */
export async function getOwnTool(id: string, ownerId: string): Promise<Tool | null> {
  if (!isToolId(id)) return null;
  return (await tools()).findOne({ _id: id, ownerId });
}

/** Owners see their own tools; everyone sees published ones. */
export function canView(tool: Tool, userId: string | undefined): boolean {
  return tool.ownerId === userId || tool.published === true;
}

/** A user's tools, most recently updated first (chat history). */
export async function listTools(ownerId: string): Promise<ToolSummary[]> {
  const docs = await (await tools())
    .find({ ownerId }, { projection: { title: 1 } })
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map((doc) => ({ id: doc._id, title: doc.title }));
}

/** A user's dashboard tools, in dashboard order. */
export async function listDashboard(ownerId: string): Promise<ToolSummary[]> {
  const docs = await (await tools())
    .find({ ownerId, onDashboard: true }, { projection: { title: 1 } })
    .sort({ position: 1 })
    .toArray();
  return docs.map((doc) => ({ id: doc._id, title: doc.title }));
}

/** Published tools from everyone, most recently published first, with the author's name. */
export async function listPublicTools(): Promise<PublicToolSummary[]> {
  const docs = await (await tools())
    .find({ published: true }, { projection: { title: 1, ownerId: 1 } })
    .sort({ publishedAt: -1 })
    .toArray();
  const names = await userNames(docs.map((doc) => doc.ownerId).filter((id) => id !== undefined));
  return docs.map((doc) => ({ id: doc._id, title: doc.title, author: names.get(doc.ownerId ?? "") ?? "Unknown" }));
}

/** Display names from Better Auth's user collection, which keys users by ObjectId. */
export async function userNames(ids: string[]): Promise<Map<string, string>> {
  const objectIds = [...new Set(ids)].filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (objectIds.length === 0) return new Map();
  const users = await getDb()
    .collection<{ _id: ObjectId; name: string }>("user")
    .find({ _id: { $in: objectIds } }, { projection: { name: 1 } })
    .toArray();
  return new Map(users.map((user) => [user._id.toString(), user.name]));
}

/** Gives tools made before accounts existed to `ownerId`. */
export async function claimUnownedTools(ownerId: string): Promise<void> {
  await (await tools()).updateMany({ ownerId: { $exists: false } }, { $set: { ownerId } });
}

/**
 * Saves the chat, creating the tool for `ownerId` on its first message.
 * Returns false (and writes nothing) if the id belongs to another user's tool.
 */
export async function saveMessages(id: string, ownerId: string, messages: UIMessage[]): Promise<boolean> {
  const html = latestHtml(messages);
  const firstUser = messages.find((m) => m.role === "user");
  const title = (html && htmlTitle(html)) || (firstUser && messageText(firstUser).slice(0, 60)) || "Untitled tool";
  const now = new Date();
  const collection = await tools();
  try {
    await collection.updateOne(
      { _id: id, ownerId },
      {
        $set: { messages, html, updatedAt: now },
        $setOnInsert: { onDashboard: false, position: 0, createdAt: now },
      },
      { upsert: true },
    );
  } catch (error) {
    // The filter missed because another user owns this id, so the upsert hit the duplicate _id.
    if ((error as { code?: number }).code === 11000) return false;
    throw error;
  }
  await collection.updateOne({ _id: id, ownerId, titleEdited: { $ne: true } }, { $set: { title } });
  return true;
}

export async function setToolModel(id: string, ownerId: string, model: ModelSelection): Promise<void> {
  await (await tools()).updateOne({ _id: id, ownerId }, { $set: { model } });
}

export async function renameTool(id: string, ownerId: string, title: string): Promise<boolean> {
  const result = await (await tools()).updateOne({ _id: id, ownerId }, { $set: { title, titleEdited: true } });
  return result.matchedCount === 1;
}

export async function setOnDashboard(id: string, ownerId: string, onDashboard: boolean): Promise<boolean> {
  const collection = await tools();
  const update: Partial<Tool> = { onDashboard };
  if (onDashboard) {
    const last = await collection.findOne(
      { ownerId, onDashboard: true },
      { sort: { position: -1 }, projection: { position: 1 } },
    );
    update.position = (last?.position ?? -1) + 1;
  }
  const result = await collection.updateOne({ _id: id, ownerId }, { $set: update });
  return result.matchedCount === 1;
}

/** Publishing needs a finished tool: there is nothing to show without HTML. */
export async function setPublished(id: string, ownerId: string, published: boolean): Promise<boolean> {
  const result = await (await tools()).updateOne(
    { _id: id, ownerId, ...(published ? { html: { $ne: null } } : {}) },
    published ? { $set: { published, publishedAt: new Date() } } : { $set: { published }, $unset: { publishedAt: "" } },
  );
  return result.matchedCount === 1;
}

/** Rewinds the chat to an earlier version: every message after that reply is deleted. */
export async function revertToVersion(id: string, ownerId: string, messageId: string): Promise<UIMessage[] | null> {
  const tool = await getOwnTool(id, ownerId);
  if (!tool) return null;
  const index = tool.messages.findIndex((m) => m.id === messageId && m.role === "assistant");
  if (index === -1 || !extractHtml(messageText(tool.messages[index]))) return null;
  const messages = tool.messages.slice(0, index + 1);
  await saveMessages(id, ownerId, messages);
  return messages;
}

/** Copies one of the user's tools with its whole chat under a new id. Returns the new id. */
export async function duplicateTool(id: string, ownerId: string): Promise<string | null> {
  const tool = await getOwnTool(id, ownerId);
  if (!tool) return null;
  const copyId = generateId();
  const now = new Date();
  const copy: Tool = {
    ...tool,
    _id: copyId,
    title: `${tool.title} (copy)`,
    titleEdited: true,
    onDashboard: false,
    position: 0,
    published: false,
    createdAt: now,
    updatedAt: now,
  };
  // A copy starts private.
  delete copy.publishedAt;
  await (await tools()).insertOne(copy);
  return copyId;
}

/** Starts a new tool from HTML, as if the assistant had written it. Returns the new id. */
async function createFromHtml(ownerId: string, html: string, request: string, reply: string): Promise<string> {
  const id = generateId();
  await saveMessages(id, ownerId, [
    { id: generateId(), role: "user", parts: [{ type: "text", text: request }] },
    { id: generateId(), role: "assistant", parts: [{ type: "text", text: `${reply}\n\n\`\`\`html\n${html}\n\`\`\`` }] },
  ]);
  return id;
}

/** Creates a tool from an existing HTML file. Returns the new id. */
export async function importTool(ownerId: string, html: string, fileName: string): Promise<string> {
  return createFromHtml(ownerId, html, `Import ${fileName}`, `Imported ${fileName}.`);
}

/** Starts a new tool for `ownerId` from a published tool's current HTML (not its chat). Returns the new id. */
export async function forkTool(sourceId: string, ownerId: string): Promise<string | null> {
  const source = await getTool(sourceId);
  if (!source?.html || !canView(source, ownerId)) return null;
  const id = await createFromHtml(ownerId, source.html, `Fork “${source.title}”`, `Forked “${source.title}”.`);
  await (await tools()).updateOne({ _id: id }, { $set: { forkedFrom: sourceId } });
  return id;
}

export async function deleteTool(id: string, ownerId: string): Promise<void> {
  await (await tools()).deleteOne({ _id: id, ownerId });
}

/** Sets the order of a user's dashboard from a list of tool ids. */
export async function reorderDashboard(ownerId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await (await tools()).bulkWrite(
    ids.map((id, position) => ({
      updateOne: { filter: { _id: id, ownerId, onDashboard: true }, update: { $set: { position } } },
    })),
  );
}
