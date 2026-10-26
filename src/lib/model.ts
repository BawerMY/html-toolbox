import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}. See .env.example.`);
  return value;
}

export function getModel(modelId: string) {
  const provider = createOpenAICompatible({
    name: "llm",
    baseURL: requireEnv("LLM_BASE_URL"),
    apiKey: process.env.LLM_API_KEY,
  });
  return provider.chatModel(modelId);
}

/** LLM_TEMPERATURE from .env, or undefined to use the provider default. */
export function getTemperature(): number | undefined {
  const value = process.env.LLM_TEMPERATURE;
  if (!value) return undefined;
  const temperature = Number(value);
  if (Number.isNaN(temperature)) throw new Error(`LLM_TEMPERATURE must be a number, got "${value}".`);
  return temperature;
}
