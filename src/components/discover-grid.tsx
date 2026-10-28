"use client";

import { IconSearch } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import type { PublicToolSummary } from "@/lib/tools";

/** Public tools with a search box that filters them by title or author. */
export function DiscoverGrid({ tools }: { tools: PublicToolSummary[] }) {
  const [query, setQuery] = useState("");
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = tools.filter((tool) => {
    const text = `${tool.title} ${tool.author}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });

  return (
    <>
      <label className="mb-4 flex max-w-md items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 focus-within:border-zinc-400 dark:border-zinc-800 dark:focus-within:border-zinc-600">
        <IconSearch size={16} className="shrink-0 text-zinc-400" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQuery("")}
          placeholder="Search by title or author"
          aria-label="Search public tools"
          className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-zinc-400"
        />
      </label>
      {shown.length === 0 ? (
        <p className="text-sm text-zinc-500">No tools match “{query.trim()}”.</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {shown.map((tool) => (
            <li key={tool.id}>
              <Link
                href={`/t/${tool.id}/view`}
                className="block rounded-lg border border-zinc-200 bg-white px-4 py-5 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                <span className="block truncate text-sm font-medium">{tool.title}</span>
                <span className="mt-1 block truncate text-xs text-zinc-500">by {tool.author}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
