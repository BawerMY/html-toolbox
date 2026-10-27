"use server";

import { revalidatePath } from "next/cache";
import { listProviderModels, ProviderError } from "@/lib/model";
import { checkProviderUrl } from "@/lib/provider-url";
import { requireUser } from "@/lib/session";
import { clearProvider, getProvider, saveProvider } from "@/lib/settings";

type Result = { error: string } | { ok: true };

function clean(baseURL: string, apiKey: string) {
  return { baseURL: baseURL.trim().replace(/\/+$/, ""), apiKey: apiKey.trim() };
}

/** An empty key field means "keep the saved key". */
async function keyToUse(userId: string, apiKey: string): Promise<string | null> {
  return apiKey || (await getProvider(userId))?.apiKey || null;
}

/** Calls the provider's /models endpoint; returns its model ids. */
export async function testProviderAction(baseURLInput: string, apiKeyInput: string): Promise<{ error: string } | { models: string[] }> {
  const user = await requireUser();
  const { baseURL, apiKey } = clean(baseURLInput, apiKeyInput);
  const problem = await checkProviderUrl(baseURL);
  if (problem) return { error: problem };
  const key = await keyToUse(user.id, apiKey);
  if (!key) return { error: "Enter your API key." };
  try {
    return { models: await listProviderModels(baseURL, key) };
  } catch (error) {
    if (error instanceof ProviderError) return { error: error.message };
    return { error: "Couldn’t reach the provider. Check the URL." };
  }
}

export async function saveProviderAction(baseURLInput: string, apiKeyInput: string, modelInput: string): Promise<Result> {
  const user = await requireUser();
  const { baseURL, apiKey } = clean(baseURLInput, apiKeyInput);
  const model = modelInput.trim();
  const problem = await checkProviderUrl(baseURL);
  if (problem) return { error: problem };
  if (!model || model.length > 200) return { error: "Enter the model id to use." };
  if (apiKey.length > 1000) return { error: "That API key is too long." };
  const key = await keyToUse(user.id, apiKey);
  if (!key) return { error: "Enter your API key." };
  await saveProvider(user.id, { baseURL, apiKey: key, model });
  revalidatePath("/settings");
  return { ok: true };
}

export async function clearProviderAction(): Promise<void> {
  const user = await requireUser();
  await clearProvider(user.id);
  revalidatePath("/settings");
}
