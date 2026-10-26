"use client";

import { REASONING_LABELS, REASONING_LEVELS, resolveSelection, type ModelOption, type ModelSelection } from "@/lib/model-options";

type Props = {
  models: ModelOption[];
  value: ModelSelection;
  onChange: (value: ModelSelection) => void;
  disabled?: boolean;
};

const selectClass =
  "min-w-0 rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-xs text-zinc-600 outline-none focus:border-zinc-500 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300";

export function ModelPicker({ models, value, onChange, disabled }: Props) {
  const option = models.find((m) => m.id === value.id);
  return (
    <>
      <select
        aria-label="Model"
        value={value.id}
        disabled={disabled}
        onChange={(e) => onChange(resolveSelection(models, { id: e.target.value }))}
        className={`${selectClass} flex-1 truncate`}
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      {option?.reasoning && (
        <select
          aria-label="Thinking"
          value={value.reasoning}
          disabled={disabled}
          onChange={(e) => onChange(resolveSelection(models, { id: value.id, reasoning: e.target.value as ModelSelection["reasoning"] }))}
          className={selectClass}
        >
          {REASONING_LEVELS.map((level) => (
            <option key={level} value={level}>
              {REASONING_LABELS[level]}
            </option>
          ))}
        </select>
      )}
    </>
  );
}
