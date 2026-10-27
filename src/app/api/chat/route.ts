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
import { getModel, getTemperature } from "@/lib/model";
import { resolveSelection, type ModelSelection } from "@/lib/model-options";
import { loadModels } from "@/lib/models";
import { extractHtml, latestHtml, messageText, stripHtml } from "@/lib/html";
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
    model?: ModelSelection;
  } =
    await req.json();
  if (!isToolId(id)) return new Response("Invalid tool id", { status: 400 });
  if (isGenerating(id)) return new Response("This tool is already generating", { status: 409 });

  const tool = await getTool(id);
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
  await saveMessages(id, messages);
  const selection = resolveSelection(await loadModels(), wanted ?? tool?.model);
  await setToolModel(id, selection);

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
    model: getModel(selection.id),
    abortSignal: abort.signal,
    reasoning: selection.reasoning,
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
      onEnd: ({ messages }) => saveMessages(id, messages),
      onError: (error) => {
        console.error(error);
        const { statusCode, data } = error as { statusCode?: number; data?: { metadata?: { error_type?: string } } };
        if (statusCode === 429) return "The model provider is rate limiting requests (429). Wait a moment and retry, or switch LLM_MODEL.";
        const message = error instanceof Error ? error.message : String(error);
        return [statusCode, message, data?.metadata?.error_type].filter(Boolean).join(" · ");
      },
    }),
  );

  // Closing this response (tab closed, navigation) only unsubscribes; the generation continues.
  return createUIMessageStreamResponse({ stream: subscribe(id)! });
}
