import Link from "next/link";
import { listTools } from "@/lib/tools";

/** Sidebar listing every chat/tool, most recent first. */
export async function History({ currentId }: { currentId?: string }) {
  const tools = await listTools();
  return (
    <ul className="space-y-0.5">
      {tools.map((tool) => (
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
    </ul>
  );
}
