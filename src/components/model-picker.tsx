"use client";

import { REASONING_LABELS, REASONING_LEVELS, type ModelSelection, type Reasoning } from "@/lib/model-selection";

type Props = {
  /** Suggestions from the user's provider; any other model id can be typed. */
  models: string[];
  value: ModelSelection;
  onChange: (value: ModelSelection) => void;
  disabled?: boolean;
};

const fieldClass =
  "min-w-0 rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-xs text-zinc-600 outline-none focus:border-zinc-500 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300";

/** For users with their own provider: the app's default model, or their own model and thinking effort. */
export function ModelPicker({ models, value, onChange, disabled }: Props) {
  return (
    <>
      <select
        aria-label="Model source"
        value={value.useDefault ? "default" : "own"}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, useDefault: e.target.value === "default" || undefined })}
        className={fieldClass}
      >
        <option value="default">Default</option>
        <option value="own">Your key</option>
      </select>
      {!value.useDefault && <OwnModel models={models} value={value} onChange={onChange} disabled={disabled} />}
    </>
  );
}

function OwnModel({ models, value, onChange, disabled }: Props) {
  return (
    <>
      <input
        aria-label="Model"
        title={value.id}
        value={value.id}
        disabled={disabled}
        list="chat-models"
        onChange={(e) => onChange({ ...value, id: e.target.value })}
        className={`${fieldClass} flex-1 truncate`}
      />
      <datalist id="chat-models">
        {models.map((id) => (
          <option key={id} value={id} />
        ))}
      </datalist>
      <select
        aria-label="Thinking"
        value={value.reasoning ?? ""}
        disabled={disabled}
        onChange={(e) => onChange({ ...value, reasoning: (e.target.value || undefined) as Reasoning | undefined })}
        className={fieldClass}
      >
        <option value="">Thinking default</option>
        {REASONING_LEVELS.map((level) => (
          <option key={level} value={level}>
            {REASONING_LABELS[level]}
          </option>
        ))}
      </select>
    </>
  );
}
