/** Shared by the browser and the server: which model and thinking effort a chat uses. */

export const REASONING_LEVELS = ["none", "low", "medium", "high"] as const;
export type Reasoning = (typeof REASONING_LEVELS)[number];

export const REASONING_LABELS: Record<Reasoning, string> = {
  none: "Thinking off",
  low: "Thinking low",
  medium: "Thinking medium",
  high: "Thinking high",
};

/**
 * `id` and `reasoning` apply to the user's own provider; no `reasoning` means the provider's default.
 * `useDefault` picks the app's default model instead, keeping the own-model choice for switching back.
 */
export type ModelSelection = { id: string; reasoning?: Reasoning; useDefault?: boolean };

/** Validates a selection sent by the browser; null if it is malformed. */
export function parseModelSelection(value: unknown): ModelSelection | null {
  if (typeof value !== "object" || value === null) return null;
  const { id, reasoning, useDefault } = value as { id?: unknown; reasoning?: unknown; useDefault?: unknown };
  if (typeof id !== "string" || id.length > 200) return null;
  if (reasoning !== undefined && !REASONING_LEVELS.includes(reasoning as Reasoning)) return null;
  if (useDefault !== undefined && typeof useDefault !== "boolean") return null;
  if (!useDefault && !id.trim()) return null;
  // Unset fields are left out, so nothing is stored as null.
  return { id: id.trim(), ...(reasoning ? { reasoning: reasoning as Reasoning } : {}), ...(useDefault ? { useDefault: true } : {}) };
}
