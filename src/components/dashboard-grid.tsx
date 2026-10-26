"use client";

import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { IconGripVertical } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { reorderDashboardAction } from "@/app/actions";
import type { ToolSummary } from "@/lib/tools";

function ToolCard({ tool, index }: { tool: ToolSummary; index: number }) {
  const { ref, handleRef, isDragging } = useSortable({ id: tool.id, index });
  return (
    <li
      ref={ref}
      className={`flex items-stretch rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${
        isDragging ? "opacity-60 shadow-lg" : ""
      }`}
    >
      <button
        ref={handleRef}
        aria-label={`Move ${tool.title}`}
        className="flex w-8 shrink-0 cursor-grab items-center justify-center border-r border-zinc-200 text-zinc-400 hover:text-zinc-700 active:cursor-grabbing dark:border-zinc-800 dark:hover:text-zinc-200"
      >
        <IconGripVertical size={16} aria-hidden />
      </button>
      <Link href={`/t/${tool.id}/view`} className="flex-1 truncate px-4 py-6 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800">
        {tool.title}
      </Link>
    </li>
  );
}

export function DashboardGrid({ initialTools }: { initialTools: ToolSummary[] }) {
  const [tools, setTools] = useState(initialTools);

  if (tools.length === 0) {
    return <p className="text-sm text-zinc-500">No tools yet. Open a tool and click “Save to dashboard”.</p>;
  }

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        if (event.canceled) return;
        const ids = move(
          tools.map((tool) => tool.id),
          event,
        );
        const byId = new Map(tools.map((tool) => [tool.id, tool]));
        setTools(ids.map((id) => byId.get(id)!));
        reorderDashboardAction(ids);
      }}
    >
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        {tools.map((tool, index) => (
          <ToolCard key={tool.id} tool={tool} index={index} />
        ))}
      </ul>
    </DragDropProvider>
  );
}
