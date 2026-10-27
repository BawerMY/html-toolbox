import { connection } from "next/server";
import { decrypt, encrypt } from "@/lib/crypto";
import { getDb } from "@/lib/db";

/** A user's own OpenAI-compatible provider. The key is stored encrypted and never sent to the browser. */
type StoredProvider = { baseURL: string; apiKeyEncrypted: string; apiKeyHint: string; model: string };
type UserSettings = { _id: string; provider?: StoredProvider };

/** What the settings page may show: everything except the key itself. */
export type ProviderSummary = { baseURL: string; model: string; apiKeyHint: string };
export type Provider = { baseURL: string; apiKey: string; model: string };

async function settings() {
  await connection();
  return getDb().collection<UserSettings>("settings");
}

export async function getProviderSummary(userId: string): Promise<ProviderSummary | null> {
  const provider = (await (await settings()).findOne({ _id: userId }))?.provider;
  return provider ? { baseURL: provider.baseURL, model: provider.model, apiKeyHint: provider.apiKeyHint } : null;
}

/** The user's provider with the key decrypted, for server-side calls only. */
export async function getProvider(userId: string): Promise<Provider | null> {
  const provider = (await (await settings()).findOne({ _id: userId }))?.provider;
  if (!provider) return null;
  return { baseURL: provider.baseURL, model: provider.model, apiKey: decrypt(provider.apiKeyEncrypted) };
}

export async function saveProvider(userId: string, provider: Provider): Promise<void> {
  const stored: StoredProvider = {
    baseURL: provider.baseURL,
    model: provider.model,
    apiKeyEncrypted: encrypt(provider.apiKey),
    apiKeyHint: provider.apiKey.length > 8 ? `…${provider.apiKey.slice(-4)}` : "saved",
  };
  await (await settings()).updateOne({ _id: userId }, { $set: { provider: stored } }, { upsert: true });
}

export async function clearProvider(userId: string): Promise<void> {
  await (await settings()).updateOne({ _id: userId }, { $unset: { provider: "" } });
}
