"use client";

import { useChat } from "@ai-sdk/react";
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconPlayerStopFilled,
  IconRefresh,
  IconSend,
  IconWand,
} from "@tabler/icons-react";
import { createIdGenerator, DefaultChatTransport, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  renameToolAction,
  revertToVersionAction,
  toolSavedAction,
} from "@/app/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ImportHtmlButton } from "@/components/import-html-button";
import { ModelPicker } from "@/components/model-picker";
import { ToolActions } from "@/components/tool-actions";
import { UserMessage } from "@/components/user-message";
import type { ModelSelection } from "@/lib/model-selection";
import { extractHtml, hasUnfinishedHtml, latestHtmlMessage, messageText, stripHtml } from "@/lib/html";
import { isToolErrorMessage, previewHtml, RESEND_TOOL_ERRORS } from "@/lib/preview";

const CHIP = "inline-block rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-500 dark:border-zinc-700";

type Props = {
  id: string;
  title: string;
  initialMessages: UIMessage[];
  initialOnDashboard: boolean;
  initialPublished: boolean;
  /** Set when the user has their own provider: the chat shows a model and effort picker. */
  modelOptions: { models: string[]; initial: ModelSelection } | null;
  /** True on the "new tool" page, before the tool exists in the database. */
  isNew: boolean;
};

export function ToolChat({ id, title, initialMessages, initialOnDashboard, initialPublished, modelOptions, isNew }: Props) {
  const router = useRouter();
  const [input, setInput] = useState("");
  // Small screens show the chat or the preview, not both.
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat");
  const [model, setModel] = useState(modelOptions?.initial);
  // Sent with every request when the user has their own provider; the server saves it on the tool.
  const options = model ? { body: { model } } : undefined;
  const { messages, setMessages, sendMessage, regenerate, status, error } = useChat({
    id,
    messages: initialMessages,
    // Generation runs on the server; on load, reconnect to it if it is still going.
    resume: !isNew,
    generateId: createIdGenerator({ prefix: "msgc", size: 16 }),
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // The server loads earlier messages from the database, so only the new one is sent.
      // messageId is set when an earlier message was edited.
      prepareSendMessagesRequest: ({ id, messages, body, trigger, messageId }) => ({
        body: { ...body, id, trigger, messageId, message: messages.at(-1) },
      }),
    }),
    onFinish: ({ isAbort, isDisconnect }) => {
      // Leaving the page only disconnects; the server keeps generating.
      if (isAbort || isDisconnect) return;
      // A new tool has already moved to /t/[id] (see below), which handles its own finish.
      if (!isNew) toolSavedAction(); // new HTML and maybe a new title
    },
  });
  const busy = status === "submitted" || status === "streaming";

  // The server saves the user message before the reply starts streaming, so once it streams
  // the tool is in the database: update the history right away.
  const previousStatus = useRef(status);
  useEffect(() => {
    const started = previousStatus.current === "submitted" && status === "streaming";
    previousStatus.current = status;
    if (!started) return;
    // A new tool moves to its own page, which reconnects to the running generation.
    if (isNew) router.replace(`/t/${id}`);
    // Refreshes only this page (history sidebar). A Server Action here would freeze the
    // streaming UI until the reply ends.
    else router.refresh();
  }, [status, isNew, id, router]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // While a response streams, keep showing the previous HTML so the iframe doesn't reload on every token.
  const currentMessage = latestHtmlMessage(busy ? messages.slice(0, -1) : messages);
  const html = currentMessage && extractHtml(messageText(currentMessage));
  const [reverting, startRevert] = useTransition();

  // Uncaught errors from the tool, reported by the preview iframe. Only the first one per version is kept.
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [toolError, setToolError] = useState<{ html: string; message: string } | null>(null);
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!html || e.source !== iframeRef.current?.contentWindow || !isToolErrorMessage(e.data)) return;
      const message = e.data.message.slice(0, 500);
      setToolError((current) => (current?.html === html ? current : { html, message }));
    }
    window.addEventListener("message", onMessage);
    iframeRef.current?.contentWindow?.postMessage(RESEND_TOOL_ERRORS, "*");
    return () => window.removeEventListener("message", onMessage);
  }, [html]);
  const shownToolError = toolError?.html === html ? toolError.message : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text }, options);
    setInput("");
  }

  function retry() {
    // Replaces the last reply (or answers the last message again after an error).
    regenerate(options);
  }

  function fixToolError() {
    if (!shownToolError || busy) return;
    sendMessage({ text: `The tool shows this error:\n${shownToolError}\n\nFix it.` }, options);
  }

  // Reverting deletes every message after the chosen version, so it is confirmed first.
  const [pendingRevert, setPendingRevert] = useState<string | null>(null);

  function revert() {
    if (!pendingRevert) return;
    startRevert(async () => {
      const next = await revertToVersionAction(id, pendingRevert);
      if (next) setMessages(next);
      setPendingRevert(null);
    });
  }

  // Editing an earlier message deletes everything after it, so ask first when that loses more than its reply.
  const [pendingEdit, setPendingEdit] = useState<{ messageId: string; text: string } | null>(null);

  function editMessage(messageId: string, text: string) {
    const index = messages.findIndex((m) => m.id === messageId);
    if (messages.length > index + 2) setPendingEdit({ messageId, text });
    else sendEdit(messageId, text);
  }

  function sendEdit(messageId: string, text: string) {
    setPendingEdit(null);
    sendMessage({ text, messageId }, options);
  }

  function stop() {
    // Stops the server-side generation; the stream then ends and the partial reply is saved.
    fetch(`/api/chat/${id}/stop`, { method: "POST" });
  }

  async function rename(e: React.FocusEvent<HTMLInputElement>) {
    const next = e.target.value.trim();
    if (!next || next === title) {
      e.target.value = title;
      return;
    }
    await renameToolAction(id, next);
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
      <div role="tablist" className="flex shrink-0 border-b border-zinc-200 md:hidden dark:border-zinc-800">
        {(["chat", "preview"] as const).map((view) => (
          <button
            key={view}
            role="tab"
            aria-selected={mobileView === view}
            onClick={() => setMobileView(view)}
            className={`flex-1 border-b-2 py-2 text-sm font-medium capitalize ${
              mobileView === view ? "border-zinc-900 dark:border-zinc-100" : "border-transparent text-zinc-500"
            }`}
          >
            {view}
          </button>
        ))}
      </div>
      <section
        className={`${mobileView === "chat" ? "flex" : "hidden"} min-h-0 flex-1 flex-col md:flex md:w-[360px] md:flex-none md:border-r xl:w-[420px] border-zinc-200 dark:border-zinc-800`}
      >
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="space-y-3 text-sm text-zinc-500">
              <p>Describe the HTML tool you want to build, or start from an existing file.</p>
              {isNew && <ImportHtmlButton />}
            </div>
          )}
          {messages.map((message) => {
            const text = messageText(message);
            const isAssistant = message.role === "assistant";
            const complete = isAssistant && extractHtml(text) !== null;
            const unfinished = isAssistant && hasUnfinishedHtml(text);
            const streaming = busy && message === messages.at(-1);
            const shown = isAssistant ? stripHtml(text) : text;
            if (!isAssistant) {
              return (
                <UserMessage
                  key={message.id}
                  text={text}
                  canEdit={!busy && !isNew}
                  onEdit={(next) => editMessage(message.id, next)}
                />
              );
            }
            return (
              <div
                key={message.id}
                className="mr-8 text-sm whitespace-pre-wrap"
              >
                {shown}
                {streaming && (complete || unfinished) && <div className={`${CHIP} mt-2`}>Writing HTML…</div>}
                {complete && !streaming && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className={CHIP}>{message.id === currentMessage?.id ? "Current version" : "HTML updated"}</div>
                    {message.id !== currentMessage?.id && (
                      <button
                        onClick={() => setPendingRevert(message.id)}
                        disabled={busy || reverting}
                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 disabled:opacity-40 dark:hover:text-zinc-100"
                      >
                        <IconArrowBackUp size={14} aria-hidden />
                        Revert to this
                      </button>
                    )}
                  </div>
                )}
                {unfinished && !streaming && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <IconAlertTriangle size={14} className="mt-px shrink-0" aria-hidden />
                    The reply was cut off before the HTML was finished, so the tool was not changed.
                  </p>
                )}
              </div>
            );
          })}
          {status === "submitted" || (busy && !messageText(messages.at(-1)!).trim()) ? (
            <p className="text-sm text-zinc-500">Thinking…</p>
          ) : null}
          {error && <p className="text-sm text-red-500">{error.message}</p>}
          {!busy && messages.length > 0 && (
            <button
              onClick={retry}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <IconRefresh size={14} aria-hidden />
              Retry
            </button>
          )}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={submit} className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) submit(e);
            }}
            rows={3}
            placeholder={html ? "Describe a change…" : "e.g. A pomodoro timer with a task list"}
            className="w-full resize-none rounded-md border border-zinc-300 bg-transparent p-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            {modelOptions && model && (
              <ModelPicker models={modelOptions.models} value={model} onChange={setModel} disabled={busy} />
            )}
            {busy ? (
              <button type="button" onClick={stop} className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
                <IconPlayerStopFilled size={16} aria-hidden />
                Stop
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()} className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900">
                <IconSend size={16} aria-hidden />
                Send
              </button>
            )}
          </div>
        </form>
      </section>

      <section className={`${mobileView === "preview" ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col md:flex`}>
        <header className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
          <input
            // Remounts with the latest title after a reply or rename.
            key={title}
            defaultValue={title}
            disabled={isNew}
            placeholder="New tool"
            aria-label="Tool name"
            onBlur={rename}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                e.currentTarget.value = title;
                e.currentTarget.blur();
              }
            }}
            className="min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium outline-none hover:border-zinc-300 focus:border-zinc-500 disabled:hover:border-transparent dark:hover:border-zinc-700"
          />
          <ToolActions
            id={id}
            title={title}
            html={html}
            onDashboard={initialOnDashboard}
            published={initialPublished}
            page="chat"
            labelsFrom="2xl"
            isNew={isNew}
            busy={busy}
          />
        </header>
        {shownToolError && (
          <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <IconAlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <p className="min-w-0 flex-1 break-words">
              <span className="font-medium">The tool hit an error:</span> {shownToolError}
            </p>
            <button
              onClick={fixToolError}
              disabled={busy}
              className="flex shrink-0 items-center gap-1 rounded-md border border-red-300 px-2 py-1 text-xs hover:bg-red-100 disabled:opacity-40 dark:border-red-800 dark:hover:bg-red-900"
            >
              <IconWand size={14} aria-hidden />
              Fix
            </button>
          </div>
        )}
        {html ? (
          <iframe
            ref={iframeRef}
            title="Tool preview"
            srcDoc={previewHtml(html)}
            sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"
            className="flex-1 bg-white"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
            {busy ? "Generating…" : "The preview will appear here."}
          </div>
        )}
      </section>
      <ConfirmDialog
        open={pendingRevert !== null}
        title="Revert to this version?"
        danger
        busy={reverting}
        onConfirm={revert}
        onCancel={() => setPendingRevert(null)}
        confirmLabel={reverting ? "Reverting…" : "Revert"}
      >
        The tool goes back to this version and every message after it is deleted. This can’t be undone.
      </ConfirmDialog>
      <ConfirmDialog
        open={pendingEdit !== null}
        title="Edit and resend?"
        danger
        onConfirm={() => pendingEdit && sendEdit(pendingEdit.messageId, pendingEdit.text)}
        onCancel={() => setPendingEdit(null)}
        confirmLabel="Delete later messages and send"
      >
        Every message after this one will be deleted, including later versions of the tool. This can’t be undone.
      </ConfirmDialog>
    </div>
  );
}
