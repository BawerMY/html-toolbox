"use client";

import { IconPlugConnected } from "@tabler/icons-react";
import { useState, useTransition } from "react";
import { clearProviderAction, saveProviderAction, testProviderAction } from "@/app/settings/actions";
import type { ProviderSummary } from "@/lib/settings";

const INPUT =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700";
const BUTTON = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800";

type Status = { kind: "error" | "success"; text: string } | null;

/** The user's own OpenAI-compatible provider. The saved key is never sent back; only its last characters. */
export function ProviderForm({ saved, defaultModel }: { saved: ProviderSummary | null; defaultModel: string }) {
  const [baseURL, setBaseURL] = useState(saved?.baseURL ?? "");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(saved?.model ?? "");
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>(null);
  const [pending, startTransition] = useTransition();

  function test() {
    startTransition(async () => {
      const result = await testProviderAction(baseURL, apiKey);
      if ("error" in result) {
        setStatus({ kind: "error", text: result.error });
        return;
      }
      setModels(result.models);
      setStatus({
        kind: "success",
        // Some providers list models without checking the key, so this can't promise the key works.
        text: `Reached the provider${result.models.length ? ` (${result.models.length} models)` : ""}. Some providers only check the key when you send a message.`,
      });
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveProviderAction(baseURL, apiKey, model);
      if ("error" in result) {
        setStatus({ kind: "error", text: result.error });
        return;
      }
      setApiKey("");
      setStatus({ kind: "success", text: "Saved. New messages use your model." });
    });
  }

  function useDefault() {
    startTransition(async () => {
      await clearProviderAction();
      setBaseURL("");
      setApiKey("");
      setModel("");
      setModels([]);
      setStatus({ kind: "success", text: `Removed. Tools are built with ${defaultModel} again.` });
    });
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <p className="text-sm text-zinc-500">
        {saved ? (
          <>
            Using your model <span className="font-medium text-zinc-900 dark:text-zinc-100">{saved.model}</span>.
          </>
        ) : (
          <>
            Using the default model <span className="font-medium text-zinc-900 dark:text-zinc-100">{defaultModel}</span>. Add
            any OpenAI-compatible provider (OpenAI, OpenRouter, Groq, …) to use your own key and model.
          </>
        )}
      </p>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Base URL</span>
        <input
          value={baseURL}
          onChange={(e) => setBaseURL(e.target.value)}
          required
          type="url"
          placeholder="https://openrouter.ai/api/v1"
          className={INPUT}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">API key</span>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required={!saved}
          type="password"
          autoComplete="off"
          placeholder={saved ? `Saved (${saved.apiKeyHint}). Leave empty to keep it.` : "sk-…"}
          className={INPUT}
        />
        <span className="mt-1 block text-xs text-zinc-500">Stored encrypted. It is only used to build your tools.</span>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Model</span>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          required
          list="provider-models"
          placeholder="e.g. openai/gpt-5"
          className={INPUT}
        />
        <datalist id="provider-models">
          {models.map((id) => (
            <option key={id} value={id} />
          ))}
        </datalist>
        <span className="mt-1 block text-xs text-zinc-500">Test the connection to pick from the provider’s models.</span>
      </label>
      {status && (
        <p className={`text-sm ${status.kind === "error" ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>{status.text}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={test} disabled={pending || !baseURL} className={`${BUTTON} flex items-center gap-1.5`}>
          <IconPlugConnected size={16} aria-hidden />
          Test connection
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Save
        </button>
        {saved && (
          <button type="button" onClick={useDefault} disabled={pending} className={BUTTON}>
            Remove and use default
          </button>
        )}
      </div>
    </form>
  );
}
