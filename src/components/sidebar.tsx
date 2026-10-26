import { IconLayoutDashboard, IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { Suspense } from "react";
import { History } from "@/components/history";

export function Sidebar({ currentId }: { currentId?: string }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
      <nav className="space-y-1 border-b border-zinc-200 p-2 dark:border-zinc-800">
        <Link href="/" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <IconLayoutDashboard size={16} aria-hidden />
          Dashboard
        </Link>
        <Link href="/new" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <IconPlus size={16} aria-hidden />
          New tool
        </Link>
      </nav>
      <div className="flex-1 overflow-y-auto p-2">
        <p className="px-2 pb-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">History</p>
        <Suspense fallback={<p className="px-2 py-1.5 text-sm text-zinc-400">Loading…</p>}>
          <History currentId={currentId} />
        </Suspense>
      </div>
    </aside>
  );
}
