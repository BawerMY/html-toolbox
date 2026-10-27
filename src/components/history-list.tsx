"use client";

import { IconSearch } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import type { ToolSummary } from "@/lib/tools";

/** History links with a search box that filters them by title. */
export function HistoryList({ tools, currentId }: { tools: ToolSummary[]; currentId?: string }) {
  const [query, setQuery] = useState("");
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = tools.filter((tool) => words.every((word) => tool.title.toLowerCase().includes(word)));

  return (
    <>
      {tools.length > 0 && (
        <label className="mb-2 flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 px-2 py-1.5 focus-within:border-zinc-400 dark:border-zinc-800 dark:focus-within:border-zinc-600">
          <IconSearch size={14} className="shrink-0 text-zinc-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="Search tools"
            aria-label="Search tools"
            className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-zinc-400"
          />
        </label>
      )}
      <ul className="-mx-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {shown.map((tool) => (
          <li key={tool.id}>
            <Link
              href={`/t/${tool.id}`}
              className={`block truncate rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                tool.id === currentId ? "bg-zinc-100 font-medium dark:bg-zinc-800" : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {tool.title}
            </Link>
          </li>
        ))}
        {tools.length === 0 && <li className="px-2 py-1.5 text-sm text-zinc-400">No tools yet</li>}
        {tools.length > 0 && shown.length === 0 && <li className="px-2 py-1.5 text-sm text-zinc-400">No matches</li>}
      </ul>
    </>
  );
}
