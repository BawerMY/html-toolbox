"use client";

import { useChat } from "@ai-sdk/react";
import { IconAppWindow, IconBookmarkOff, IconBookmarkPlus, IconPlayerStopFilled, IconSend } from "@tabler/icons-react";
import { createIdGenerator, DefaultChatTransport, type UIMessage } from "ai";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { renameToolAction, setOnDashboardAction, toolSavedAction } from "@/app/actions";
import { DeleteToolButton } from "@/components/delete-tool-button";
import { DownloadButton } from "@/components/download-button";
import { ModelPicker } from "@/components/model-picker";
import type { ModelOption, ModelSelection } from "@/lib/model-options";
import { extractHtml, latestHtml, messageText, stripHtml } from "@/lib/html";

type Props = {
  id: string;
  title: string;
  initialMessages: UIMessage[];
  initialOnDashboard: boolean;
  models: ModelOption[];
  initialModel: ModelSelection;
  /** True on the "new tool" page, before the tool exists in the database. */
  isNew: boolean;
};

export function ToolChat({ id, title, initialMessages, initialOnDashboard, models, initialModel, isNew }: Props) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [model, setModel] = useState(initialModel);
  // Server value, shown optimistically while a change is in flight.
  const [onDashboard, setOptimisticOnDashboard] = useOptimistic(initialOnDashboard);
  const [, startTransition] = useTransition();
  const { messages, sendMessage, status, error } = useChat({
    id,
    messages: initialMessages,
    // Generation runs on the server; on load, reconnect to it if it is still going.
    resume: !isNew,
    generateId: createIdGenerator({ prefix: "msgc", size: 16 }),
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // The server loads earlier messages from the database, so only the new one is sent.
      prepareSendMessagesRequest: ({ id, messages, body }) => ({ body: { ...body, id, message: messages.at(-1) } }),
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
  const html = latestHtml(busy ? messages.slice(0, -1) : messages);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    // The server saves the model on the tool, so it is remembered for the next message.
    sendMessage({ text }, { body: { model } });
    setInput("");
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

  function toggleDashboard() {
    const next = !onDashboard;
    startTransition(async () => {
      setOptimisticOnDashboard(next);
      await setOnDashboardAction(id, next);
    });
  }

  return (
    <>
      <section className="flex w-[420px] shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-sm text-zinc-500">Describe the HTML tool you want to build.</p>
          )}
          {messages.map((message) => {
            const text = messageText(message);
            const hasHtml = message.role === "assistant" && extractHtml(text) !== null;
            const shown = message.role === "assistant" ? stripHtml(text) : text;
            return (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-8 rounded-lg bg-zinc-100 p-3 text-sm whitespace-pre-wrap dark:bg-zinc-800"
                    : "mr-8 text-sm whitespace-pre-wrap"
                }
              >
                {shown}
                {hasHtml && (
                  <div className="mt-2 inline-block rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-500 dark:border-zinc-700">
                    {busy && message === messages.at(-1) ? "Writing HTML…" : "HTML updated"}
                  </div>
                )}
              </div>
            );
          })}
          {status === "submitted" || (busy && !messageText(messages.at(-1)!).trim()) ? (
            <p className="text-sm text-zinc-500">Thinking…</p>
          ) : null}
          {error && <p className="text-sm text-red-500">{error.message}</p>}
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
            <ModelPicker models={models} value={model} onChange={setModel} disabled={busy} />
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

      <section className="flex min-w-0 flex-1 flex-col">
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
          <div className="flex gap-2">
            {html && !isNew && (
              <Link href={`/t/${id}/view`} className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
                <IconAppWindow size={16} aria-hidden />
                Open tool
              </Link>
            )}
            <DownloadButton html={html} />
            <button
              onClick={toggleDashboard}
              disabled={!html || isNew}
              className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {onDashboard ? <IconBookmarkOff size={16} aria-hidden /> : <IconBookmarkPlus size={16} aria-hidden />}
              {onDashboard ? "Remove from dashboard" : "Save to dashboard"}
            </button>
            <DeleteToolButton id={id} title={title} disabled={isNew} />
          </div>
        </header>
        {html ? (
          <iframe
            title="Tool preview"
            srcDoc={html}
            sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"
            className="flex-1 bg-white"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
            {busy ? "Generating…" : "The preview will appear here."}
          </div>
        )}
      </section>
    </>
  );
}
