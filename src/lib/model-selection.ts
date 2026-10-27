/** Shared by the browser and the server: which model and thinking effort a chat uses. */

export const REASONING_LEVELS = ["none", "low", "medium", "high"] as const;
export type Reasoning = (typeof REASONING_LEVELS)[number];

export const REASONING_LABELS: Record<Reasoning, string> = {
  none: "Thinking off",
  low: "Thinking low",
  medium: "Thinking medium",
  high: "Thinking high",
};

/** No `reasoning` means the provider's default (nothing is sent). */
export type ModelSelection = { id: string; reasoning?: Reasoning };

/** Validates a selection sent by the browser; null if it is malformed. */
export function parseModelSelection(value: unknown): ModelSelection | null {
  if (typeof value !== "object" || value === null) return null;
  const { id, reasoning } = value as { id?: unknown; reasoning?: unknown };
  if (typeof id !== "string" || !id.trim() || id.length > 200) return null;
  if (reasoning !== undefined && !REASONING_LEVELS.includes(reasoning as Reasoning)) return null;
  return { id: id.trim(), reasoning: reasoning as Reasoning | undefined };
}
