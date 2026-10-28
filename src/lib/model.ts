import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { ModelSelection, Reasoning } from "@/lib/model-selection";
import { checkProviderUrl } from "@/lib/provider-url";
import { getProvider } from "@/lib/settings";

/** `selection` is set when the user has their own provider, so the chat can remember the choice. */
export type ModelChoice = { model: LanguageModel; reasoning?: Reasoning; selection?: ModelSelection };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}. See .env.example.`);
  return value;
}

/** Thrown when a user's own provider can't be used; the message is safe to show them. */
export class ProviderError extends Error {}

/**
 * The user's own provider from Settings if they added one, else the app's default model from .env.
 * `wanted` (the model and effort picked in the chat) only applies to the user's own provider.
 */
export async function modelForUser(userId: string, wanted?: ModelSelection): Promise<ModelChoice> {
  const provider = await getProvider(userId);
  if (provider && !wanted?.useDefault) {
    const problem = await checkProviderUrl(provider.baseURL);
    if (problem) throw new ProviderError(`Your API settings can’t be used: ${problem}`);
    const client = createOpenAICompatible({
      name: "user",
      baseURL: provider.baseURL,
      apiKey: provider.apiKey,
      // The URL was checked, but a redirect could still lead to a private address.
      fetch: (input, init) => fetch(input, { ...init, redirect: "error" }),
    });
    const selection: ModelSelection = wanted ?? { id: provider.model };
    return { model: client.chatModel(selection.id), reasoning: selection.reasoning, selection };
  }
  const client = createOpenAICompatible({
    name: "llm",
    baseURL: requireEnv("LLM_BASE_URL"),
    apiKey: process.env.LLM_API_KEY,
  });
  const reasoning = process.env.LLM_REASONING as Reasoning | undefined;
  return {
    model: client.chatModel(requireEnv("LLM_MODEL")),
    reasoning: reasoning || undefined,
    // Users with their own provider picked the default on purpose; remember it on the tool.
    selection: provider && wanted ? wanted : undefined,
  };
}

/**
 * For users with their own provider: the provider's model ids (for suggestions; empty if they can't
 * be listed) and the selection the chat starts with. Null on the default model, which isn't selectable.
 */
export async function chatModelOptions(
  userId: string,
  saved?: ModelSelection,
): Promise<{ models: string[]; initial: ModelSelection; defaultModel: string } | null> {
  const provider = await getProvider(userId);
  if (!provider) return null;
  let models: string[] = [];
  if (!(await checkProviderUrl(provider.baseURL))) {
    models = await listProviderModels(provider.baseURL, provider.apiKey).catch(() => []);
  }
  return { models, initial: saved ?? { id: provider.model }, defaultModel: defaultModelId() };
}

/** The default model's id, shown in Settings. */
export function defaultModelId(): string {
  return process.env.LLM_MODEL ?? "";
}

/** LLM_TEMPERATURE from .env, or undefined to use the provider default. */
export function getTemperature(): number | undefined {
  const value = process.env.LLM_TEMPERATURE;
  if (!value) return undefined;
  const temperature = Number(value);
  if (Number.isNaN(temperature)) throw new Error(`LLM_TEMPERATURE must be a number, got "${value}".`);
  return temperature;
}

/** Model ids from an OpenAI-compatible /models endpoint; used to test a user's settings. */
export async function listProviderModels(baseURL: string, apiKey: string): Promise<string[]> {
  const response = await fetch(`${baseURL.replace(/\/+$/, "")}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
    redirect: "error",
  });
  if (!response.ok) throw new ProviderError(`The provider answered ${response.status} ${response.statusText}.`);
  const body = (await response.json().catch(() => null)) as { data?: { id?: unknown }[] } | null;
  return (body?.data ?? []).map((model) => model.id).filter((id): id is string => typeof id === "string").sort();
}
