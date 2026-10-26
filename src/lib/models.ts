import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ModelOption } from "@/lib/model-options";

const MODELS_FILE = path.join(process.cwd(), "config", "models.json");

/** Models from config/models.json, with the LLM_MODEL env model first if it is listed. Read on every call. */
export async function loadModels(): Promise<ModelOption[]> {
  const models: ModelOption[] = JSON.parse(await readFile(MODELS_FILE, "utf8"));
  if (models.length === 0) throw new Error("config/models.json must list at least one model.");
  const preferred = process.env.LLM_MODEL;
  return [...models].sort((a, b) => Number(b.id === preferred) - Number(a.id === preferred));
}
