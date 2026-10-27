import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { buildSystemPrompt, loadTurnReminder } from "@/lib/context";
import { isGenerating, startGeneration, subscribe } from "@/lib/generations";
import { extractHtml, latestHtml, messageText, stripHtml } from "@/lib/html";
import { getTemperature, modelForUser, ProviderError, type ModelChoice } from "@/lib/model";
import { parseModelSelection } from "@/lib/model-selection";
import { userFromHeaders } from "@/lib/session";
import { getTool, isToolId, saveMessages, setToolModel } from "@/lib/tools";

export async function POST(req: Request) {
  const {
    id,
    message,
    messageId,
    trigger,
    model: wanted,
  }: {
    id: string;
    message: UIMessage;
    /** Set when an earlier user message is edited: the chat restarts from it. */
    messageId?: string;
    trigger?: "submit-message" | "regenerate-message";
    /** Model and effort picked in the chat; only sent by users with their own provider. */
    model?: unknown;
  } =
    await req.json();
  const user = await userFromHeaders(req.headers);
  if (!user) return new Response("Sign in to chat.", { status: 401 });
  if (!isToolId(id)) return new Response("Invalid tool id", { status: 400 });

  const tool = await getTool(id);
  // A new id creates a tool for this user; an existing one must be theirs.
  if (tool && tool.ownerId !== user.id) return new Response("Tool not found", { status: 404 });
  if (isGenerating(id)) return new Response("This tool is already generating", { status: 409 });

  let choice: ModelChoice;
  try {
    choice = await modelForUser(user.id, parseModelSelection(wanted) ?? tool?.model);
  } catch (error) {
    if (error instanceof ProviderError) return new Response(error.message, { status: 400 });
    throw error;
  }

  const messages = [...(tool?.messages ?? [])];
  if (trigger === "regenerate-message") {
    // Retry: drop the last reply and answer the last user message again.
    while (messages.at(-1)?.role === "assistant") messages.pop();
    if (messages.length === 0) return new Response("Nothing to retry", { status: 400 });
  } else {
    const edited = messageId ? messages.findIndex((m) => m.id === messageId && m.role === "user") : -1;
    if (edited !== -1) messages.splice(edited);
    messages.push(message);
  }
  // Save the user message now, so it is there if the page is reloaded mid-generation.
  if (!(await saveMessages(id, user.id, messages))) return new Response("Tool not found", { status: 404 });
  if (choice.selection) await setToolModel(id, user.id, choice.selection);

  // Older HTML versions are dropped from history; only the current one is sent.
  const currentHtml = latestHtml(messages);
  // Each reply is labeled, so the model sees that a sentence alone never changed the tool.
  const history = messages.map((m) => {
    if (m.role !== "assistant") return m;
    const text = messageText(m);
    const note = extractHtml(text)
      ? "[Full HTML document included here; omitted from history.]"
      : "[No HTML document included, so the tool was NOT changed by this reply.]";
    return { ...m, parts: [{ type: "text" as const, text: `${stripHtml(text)}\n\n${note}`.trim() }] };
  });
  // History replies have no HTML, and some models copy that and skip the document.
  const reminder = await loadTurnReminder();
  const last = history.at(-1)!;
  history[history.length - 1] = { ...last, parts: [...last.parts, { type: "text", text: reminder }] };

  const system = await buildSystemPrompt(currentHtml);

  const abort = new AbortController();
  const result = streamText({
    model: choice.model,
    abortSignal: abort.signal,
    reasoning: choice.reasoning,
    temperature: getTemperature(),
    streamRetries: 2,
    system,
    messages: await convertToModelMessages(history),
  });

  startGeneration(
    id,
    abort,
    toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
      onEnd: async ({ messages }) => {
        await saveMessages(id, user.id, messages);
      },
      onError: (error) => {
        console.error(error);
        const { statusCode, data } = error as { statusCode?: number; data?: { metadata?: { error_type?: string } } };
        if (statusCode === 429) return "The model provider is rate limiting requests (429). Wait a moment and retry.";
        const message = error instanceof Error ? error.message : String(error);
        return [statusCode, message, data?.metadata?.error_type].filter(Boolean).join(" · ");
      },
    }),
  );

  // Closing this response (tab closed, navigation) only unsubscribes; the generation continues.
  return createUIMessageStreamResponse({ stream: subscribe(id)! });
}
