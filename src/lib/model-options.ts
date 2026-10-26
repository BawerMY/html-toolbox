/** Shared by server and client: what the model selector offers. */

export const REASONING_LEVELS = ["none", "low", "medium", "high"] as const;
export type ReasoningLevel = (typeof REASONING_LEVELS)[number];

export const REASONING_LABELS: Record<ReasoningLevel, string> = {
  none: "Thinking off",
  low: "Thinking low",
  medium: "Thinking medium",
  high: "Thinking high",
};

/** One entry of config/models.json. */
export type ModelOption = {
  /** Model id at the provider, e.g. "qwen/qwen3-coder-flash". */
  id: string;
  label: string;
  /** Whether the model supports a thinking / reasoning effort setting. */
  reasoning: boolean;
  defaultReasoning?: ReasoningLevel;
};

/** The model chosen for a tool. */
export type ModelSelection = { id: string; reasoning?: ReasoningLevel };

/** Returns a valid selection: `wanted` if it is in the list, otherwise the first model. */
export function resolveSelection(models: ModelOption[], wanted?: Partial<ModelSelection> | null): ModelSelection {
  const option = models.find((m) => m.id === wanted?.id) ?? models[0];
  if (!option.reasoning) return { id: option.id };
  const reasoning = REASONING_LEVELS.find((level) => level === wanted?.reasoning) ?? option.defaultReasoning ?? "low";
  return { id: option.id, reasoning };
}
